/**
 * Hook pour initialiser et gérer la carte Mapbox
 */

import { useEffect, useRef, useCallback } from "react";
import { MAP_CONFIG } from "../utils/mapConfig";
import { createArtworkLayer } from "../layers/createArtworkLayer";
import { createArtworkLabels } from "../layers/createArtworkLabel";

/**
 * Crée le marqueur de l'utilisateur
 */
function createUserMarker(mapboxgl, map, position) {
  const el = document.createElement("div");
  el.className = "user-marker";
  el.innerHTML = `<div class="user-marker-dot"></div><div class="user-marker-pulse"></div>`;

  return new mapboxgl.Marker({ element: el })
    .setLngLat(position)
    .addTo(map);
}

/**
 * Lance la géolocalisation et ajoute le marqueur + centre la carte quand disponible
 * Retourne un objet avec la position actuelle
 */
function watchUserPosition(mapboxgl, map, cleanupRef) {
  const userState = { position: null };

  if (!navigator.geolocation) return userState;

  let userMarker = null;

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const coords = [position.coords.longitude, position.coords.latitude];
      console.log("User position:", coords);
      userState.position = coords;

      if (!userMarker) {
        userMarker = createUserMarker(mapboxgl, map, coords);
        map.flyTo({ center: coords, duration: 1000 });
      } else {
        userMarker.setLngLat(coords);
      }
    },
    (error) => console.log("Geolocation error:", error.message),
    { enableHighAccuracy: false, timeout: 30000, maximumAge: 30000 }
  );

  cleanupRef.current.push(() => {
    navigator.geolocation.clearWatch(watchId);
    userMarker?.remove();
  });

  return userState;
}

/**
 * Crée les clusters d'artworks visibles au dézoom
 */
function createArtworkClusters(map, anchors) {
  const PIN_MAX_ZOOM = MAP_CONFIG.modelVisibilityZoom;

  // Créer le GeoJSON des artworks
  const geojson = {
    type: "FeatureCollection",
    features: anchors.map((anchor) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [anchor.longitude, anchor.latitude],
      },
      properties: {
        id: anchor.id,
        title: anchor.artwork?.title || "",
      },
    })),
  };

  // Source avec clustering
  map.addSource("artworks-clusters", {
    type: "geojson",
    data: geojson,
    cluster: true,
    clusterMaxZoom: PIN_MAX_ZOOM - 1,
    clusterRadius: 50,
  });

  // Layer clusters (cercle rouge avec nombre)
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "artworks-clusters",
    filter: ["has", "point_count"],
    maxzoom: PIN_MAX_ZOOM,
    paint: {
      "circle-color": "#e74c3c",
      "circle-radius": 12,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#fff",
    },
  });

  // Layer nombre dans cluster
  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "artworks-clusters",
    filter: ["has", "point_count"],
    maxzoom: PIN_MAX_ZOOM,
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      "text-size": 12,
    },
    paint: {
      "text-color": "#fff",
    },
  });

  // Layer points individuels (pin rouge - même taille que player)
  map.addLayer({
    id: "unclustered-point",
    type: "circle",
    source: "artworks-clusters",
    filter: ["!", ["has", "point_count"]],
    maxzoom: PIN_MAX_ZOOM,
    paint: {
      "circle-color": "#e74c3c",
      "circle-radius": 7,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#fff",
    },
  });

  // Click sur cluster pour zoomer
  map.on("click", "clusters", (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
    const clusterId = features[0].properties.cluster_id;
    map.getSource("artworks-clusters").getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err) return;
      map.easeTo({
        center: features[0].geometry.coordinates,
        zoom: zoom,
      });
    });
  });

  // Click sur pin individuel pour zoomer au niveau du modèle
  map.on("click", "unclustered-point", (e) => {
    const coordinates = e.features[0].geometry.coordinates.slice();
    map.flyTo({
      center: coordinates,
      zoom: PIN_MAX_ZOOM,
      duration: 1000,
    });
  });

  // Curseur pointer sur clusters et pins
  map.on("mouseenter", "clusters", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "clusters", () => {
    map.getCanvas().style.cursor = "";
  });
  map.on("mouseenter", "unclustered-point", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "unclustered-point", () => {
    map.getCanvas().style.cursor = "";
  });
}

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

    // Déterminer le centre initial (premier anchor ou défaut)
    const center = anchors.length > 0
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

    // Lancer la géolocalisation (non bloquant)
    const userState = watchUserPosition(mapboxgl, map, cleanupRef);

    // Animation loop pour Tween
    function animate(time) {
      requestAnimationFrame(animate);
      TWEEN.update(time);
    }
    requestAnimationFrame(animate);

    // Ajout des layers et labels au chargement du style
    map.on("style.load", () => {
      if (anchors.length === 0) return;

      // Créer les clusters (visibles au dézoom)
      createArtworkClusters(map, anchors);

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
        userState,
        accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
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
