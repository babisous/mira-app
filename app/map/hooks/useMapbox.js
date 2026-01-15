/**
 * Hook pour initialiser et gérer la carte Mapbox
 * Supporte deux modes: Desktop (navigator.geolocation) et Unity (window.updateGPS)
 */

import { useEffect, useRef, useCallback } from "react";
import { MAP_CONFIG } from "../utils/mapConfig";
import { createArtworkLayer } from "../layers/createArtworkLayer";
import { createArtworkLabels } from "../layers/createArtworkLabel";

// État global pour la géolocalisation
const gpsState = {
  isUnityContext: false,
  userMarker: null,
  userPosition: null,
  map: null,
  mapboxgl: null,
  isFirstPosition: true,
};

/**
 * Crée l'élément HTML du marqueur utilisateur avec support de rotation
 */
function createUserMarkerElement() {
  const el = document.createElement("div");
  el.className = "user-marker";
  el.innerHTML = `
    <div class="user-marker-heading"></div>
    <div class="user-marker-dot"></div>
    <div class="user-marker-pulse"></div>
  `;
  return el;
}

/**
 * Fonction globale appelée par Unity (et par le fallback Desktop)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} heading - Cap/orientation en degrés (0 = Nord)
 */
function updateGPS(lat, lng, heading = 0) {
  const { map, mapboxgl } = gpsState;
  if (!map || !mapboxgl) {
    console.warn("updateGPS: Map not ready");
    return;
  }

  gpsState.isUnityContext = true;
  const coords = [lng, lat];
  gpsState.userPosition = coords;

  // Créer le marqueur s'il n'existe pas
  if (!gpsState.userMarker) {
    const el = createUserMarkerElement();
    gpsState.userMarker = new mapboxgl.Marker({ element: el })
      .setLngLat(coords)
      .addTo(map);
  } else {
    gpsState.userMarker.setLngLat(coords);
  }

  // Appliquer la rotation au marqueur (heading)
  const markerEl = gpsState.userMarker.getElement();
  const headingEl = markerEl.querySelector(".user-marker-heading");
  if (headingEl) {
    headingEl.style.transform = `translate(-50%, -50%) rotate(${heading}deg)`;
  }

  // Déplacer la caméra
  if (gpsState.isFirstPosition) {
    // Premier positionnement: centrer immédiatement
    map.flyTo({
      center: coords,
      zoom: 17,
      pitch: 60,
      bearing: heading,
      duration: 1500,
    });
    gpsState.isFirstPosition = false;
  } else {
    // Mises à jour suivantes: mouvement fluide
    map.easeTo({
      center: coords,
      bearing: heading,
      duration: 500,
    });
  }

  console.log("GPS updated:", { lat, lng, heading });
}

// Exposer la fonction globalement pour Unity
if (typeof window !== "undefined") {
  window.updateGPS = updateGPS;
}

/**
 * Démarre le GPS Desktop (fallback si Unity n'est pas actif)
 */
function startDesktopGPS(cleanupRef) {
  if (!navigator.geolocation) {
    console.warn("Geolocation not supported");
    return;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      // N'utiliser le GPS navigateur QUE si Unity n'est pas actif
      if (!gpsState.isUnityContext) {
        updateGPS(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.heading || 0
        );
      }
    },
    (error) => console.warn("Desktop GPS error:", error.message),
    { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
  );

  cleanupRef.current.push(() => {
    navigator.geolocation.clearWatch(watchId);
    if (gpsState.userMarker) {
      gpsState.userMarker.remove();
      gpsState.userMarker = null;
    }
  });
}

/**
 * Retourne l'état de position utilisateur (pour les autres composants)
 */
function getUserState() {
  return {
    get position() {
      return gpsState.userPosition;
    },
  };
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

    // Stocker les références pour la fonction updateGPS globale
    gpsState.map = map;
    gpsState.mapboxgl = mapboxgl;
    gpsState.isFirstPosition = true;
    gpsState.isUnityContext = false;

    // Lancer le GPS Desktop (fallback si Unity n'est pas actif)
    startDesktopGPS(cleanupRef);

    // Référence à l'état utilisateur pour les autres composants
    const userState = getUserState();

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

      // Reset GPS state
      gpsState.map = null;
      gpsState.mapboxgl = null;
      gpsState.userMarker = null;
      gpsState.userPosition = null;
      gpsState.isFirstPosition = true;
      gpsState.isUnityContext = false;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isReady, initializeMap]);

  return { map: mapRef.current };
}
