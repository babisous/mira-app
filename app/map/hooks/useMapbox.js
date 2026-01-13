/**
 * Hook pour initialiser et gérer la carte Mapbox
 */

import { useEffect, useRef, useCallback } from "react";
import { MAP_CONFIG } from "../utils/mapConfig";
import { createArtworkLayer } from "../layers/createArtworkLayer";
import { createArtworkLabels } from "../layers/createArtworkLabel";

/**
 * Hook d'initialisation de la carte Mapbox avec Three.js
 */
export function useMapbox({ containerRef, anchors, isReady }) {
  const mapRef = useRef(null);
  const cleanupRef = useRef([]);
  const layersRef = useRef([]);

  // Initialisation de la carte
  const initializeMap = useCallback(async () => {
    if (!containerRef.current || mapRef.current) return;

    // Imports dynamiques pour éviter les problèmes SSR
    const mapboxgl = (await import("mapbox-gl")).default;
    const THREE = await import("three");
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader");
    const TWEEN = (await import("@tweenjs/tween.js")).default;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    // Déterminer le centre de la carte
    const center =
      anchors.length > 0
        ? [anchors[0].longitude, anchors[0].latitude]
        : MAP_CONFIG.defaultCenter;

    // Création de la carte
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: process.env.NEXT_PUBLIC_MAPBOX_STYLE,
      zoom: MAP_CONFIG.initialZoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      center,
      pitch: MAP_CONFIG.initialPitch,
      antialias: true,
    });

    mapRef.current = map;

    // Animation loop pour Tween
    function animate(time) {
      requestAnimationFrame(animate);
      TWEEN.update(time);
    }
    requestAnimationFrame(animate);

    // Ajout des layers et labels au chargement du style
    map.on("style.load", () => {
      map.addControl(new mapboxgl.NavigationControl());

      if (anchors.length === 0) return;

      // Créer les layers 3D pour chaque anchor
      const layers = [];
      anchors.forEach((anchor, index) => {
        if (!anchor.artwork?.url) return;

        const layer = createArtworkLayer({
          mapboxgl,
          THREE,
          GLTFLoader,
          anchor,
          index,
        });
        map.addLayer(layer);
        layers.push(layer);
      });
      layersRef.current = layers;

      // Créer les labels avec callback pour l'animation
      const cleanupLabels = createArtworkLabels({
        mapboxgl,
        map,
        anchors: anchors.filter((a) => a.artwork?.url),
        layers,
        TWEEN,
      });
      cleanupRef.current.push(cleanupLabels);
    });

    return map;
  }, [anchors, containerRef]);

  // Effet d'initialisation
  useEffect(() => {
    if (!isReady) return;

    initializeMap();

    // Cleanup
    return () => {
      cleanupRef.current.forEach((cleanup) => cleanup?.());
      cleanupRef.current = [];
      layersRef.current = [];

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isReady, initializeMap]);

  return { map: mapRef.current };
}
