/**
 * Hook pour initialiser et gérer la carte Mapbox
 */

import { useEffect, useRef, useCallback } from "react";
import { MAP_CONFIG, getTargetPitch } from "../utils/mapConfig";
import { createArtworkLayer } from "../layers/createArtworkLayer";
import { createArtworkLabel } from "../layers/createArtworkLabel";

/**
 * Hook d'initialisation de la carte Mapbox avec Three.js
 */
export function useMapbox({ containerRef, anchors, isReady }) {
  const mapRef = useRef(null);
  const cleanupRef = useRef([]);

  // Initialisation de la carte
  const initializeMap = useCallback(async () => {
    if (!containerRef.current || mapRef.current) return;

    // Imports dynamiques pour éviter les problèmes SSR
    const mapboxgl = (await import("mapbox-gl")).default;
    const THREE = await import("three");
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader");

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

    // Gestion du pitch dynamique
    setupDynamicPitch(map);

    // Ajout des layers et labels au chargement du style
    map.on("style.load", () => {
      map.addControl(new mapboxgl.NavigationControl());

      if (anchors.length === 0) return;

      anchors.forEach((anchor, index) => {
        if (!anchor.artwork?.url) return;

        // Créer le layer 3D
        const layer = createArtworkLayer({
          mapboxgl,
          THREE,
          GLTFLoader,
          anchor,
          index,
        });
        map.addLayer(layer);

        // Créer le label avec hover
        const cleanupLabel = createArtworkLabel({
          mapboxgl,
          map,
          anchor,
        });
        cleanupRef.current.push(cleanupLabel);
      });
    });

    return map;
  }, [anchors, containerRef]);

  // Setup du pitch dynamique selon le zoom
  const setupDynamicPitch = (map) => {
    let userDragging = false;

    map.on("dragstart", () => {
      userDragging = true;
    });

    map.on("dragend", () => {
      userDragging = false;
    });

    map.on("zoom", () => {
      if (userDragging) return;

      const zoom = map.getZoom();
      const targetPitch = getTargetPitch(zoom);
      const currentPitch = map.getPitch();

      // Interpolation douce vers le pitch cible
      const diff = targetPitch - currentPitch;
      if (Math.abs(diff) > 0.5) {
        const newPitch = currentPitch + diff * 0.2;
        map.setPitch(newPitch);
      }
    });
  };

  // Effet d'initialisation
  useEffect(() => {
    if (!isReady) return;

    initializeMap();

    // Cleanup
    return () => {
      cleanupRef.current.forEach((cleanup) => cleanup?.());
      cleanupRef.current = [];

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isReady, initializeMap]);

  return { map: mapRef.current };
}
