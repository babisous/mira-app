/**
 * Factory pour créer les custom layers Three.js des artworks
 */

import { MAP_CONFIG, getScaleMultiplier } from "../utils/mapConfig";
import {
  createArtworkMaterial,
  setupSceneLighting,
  applyMaterialToModel,
  computeModelMatrix,
} from "../utils/threeUtils";

// Couleur rouge du matériau
export const MODEL_COLOR = 0xff0004;

/**
 * Calcule la transformation Mercator pour un anchor
 */
function computeModelTransform(mapboxgl, THREE, anchor) {
  const modelOrigin = [anchor.longitude, anchor.latitude];
  const modelAltitude = anchor.altitude || 0;
  const modelRotate = [
    Math.PI / 2,
    0,
    THREE.MathUtils.degToRad(anchor.heading || 0),
  ];

  const mercatorCoord = mapboxgl.MercatorCoordinate.fromLngLat(
    modelOrigin,
    modelAltitude
  );

  return {
    translateX: mercatorCoord.x,
    translateY: mercatorCoord.y,
    translateZ: mercatorCoord.z,
    rotateX: modelRotate[0],
    rotateY: modelRotate[1],
    rotateZ: modelRotate[2],
    baseScale: mercatorCoord.meterInMercatorCoordinateUnits(),
  };
}

/**
 * Construit l'URL proxy pour le modèle
 */
function getModelProxyUrl(artworkUrl) {
  const filename = artworkUrl.split("/").pop();
  return `${process.env.NEXT_PUBLIC_API_URL}/proxy/models/${filename}`;
}

/**
 * Crée un custom layer Mapbox avec Three.js pour un artwork
 */
export function createArtworkLayer({
  mapboxgl,
  THREE,
  GLTFLoader,
  anchor,
  index,
  onVisibilityChange,
}) {
  const modelTransform = computeModelTransform(mapboxgl, THREE, anchor);
  const modelUrl = getModelProxyUrl(anchor.artwork.url);
  const layerId = `3d-model-${anchor.id || index}`;

  // État du layer
  let modelLoaded = false;
  let isVisible = true;
  let skyLine = null;
  let skyLineVisible = false;

  const customLayer = {
    id: layerId,
    type: "custom",
    renderingMode: "3d",
    anchor, // Exposer l'anchor pour référence externe

    onAdd(map, gl) {
      this.camera = new THREE.Camera();
      this.scene = new THREE.Scene();
      this.map = map;
      this.THREE = THREE;

      // Configuration de l'éclairage
      setupSceneLighting(THREE, this.scene);

      // Matériau des artworks
      const material = createArtworkMaterial(THREE);

      // Chargement du modèle
      const loader = new GLTFLoader();
      loader.load(
        modelUrl,
        (gltf) => {
          applyMaterialToModel(gltf.scene, material);
          this.model = gltf.scene;
          this.scene.add(gltf.scene);

          // Calculer la bounding box pour la ligne
          const box = new THREE.Box3().setFromObject(gltf.scene);
          this.modelTop = box.max.y;
          this.modelCenter = box.getCenter(new THREE.Vector3());

          modelLoaded = true;
        },
        undefined,
        undefined
      );

      // Configuration du renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
      });
      this.renderer.autoClear = false;
    },

    // Méthode pour activer/désactiver la ligne vers le ciel
    showSkyLine(show) {
      if (!modelLoaded || !this.THREE) return;

      if (show && !skyLine) {
        // Créer la ligne
        const lineHeight = 500;
        const geometry = new this.THREE.BufferGeometry().setFromPoints([
          new this.THREE.Vector3(this.modelCenter.x, this.modelTop, this.modelCenter.z),
          new this.THREE.Vector3(this.modelCenter.x, this.modelTop + lineHeight, this.modelCenter.z),
        ]);
        const material = new this.THREE.LineBasicMaterial({
          color: MODEL_COLOR,
          linewidth: 2,
        });
        skyLine = new this.THREE.Line(geometry, material);
        this.scene.add(skyLine);
        skyLineVisible = true;
      } else if (!show && skyLine) {
        this.scene.remove(skyLine);
        skyLine.geometry.dispose();
        skyLine.material.dispose();
        skyLine = null;
        skyLineVisible = false;
      }
    },

    render(gl, matrix) {
      if (!modelLoaded) return;

      const zoom = this.map.getZoom();

      // Gestion de la visibilité selon le zoom
      const shouldBeVisible = zoom >= MAP_CONFIG.modelVisibilityZoom;
      if (shouldBeVisible !== isVisible) {
        isVisible = shouldBeVisible;
        if (this.model) {
          this.model.visible = isVisible;
          onVisibilityChange?.(isVisible, zoom);
        }
      }

      if (!isVisible) return;

      // Calcul du scale et de la matrice
      const currentScale = modelTransform.baseScale * getScaleMultiplier(zoom);
      this.camera.projectionMatrix = computeModelMatrix(
        this.THREE,
        modelTransform,
        currentScale,
        matrix
      );

      // Rendu
      this.renderer.resetState();
      this.renderer.render(this.scene, this.camera);
      this.map.triggerRepaint();
    },
  };

  return customLayer;
}
