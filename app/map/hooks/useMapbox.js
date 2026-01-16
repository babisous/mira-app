/**
 * Hook pour initialiser et gérer la carte Mapbox
 * Supporte deux modes: Desktop (navigator.geolocation) et Unity (window.updateGPS)
 */

import { useEffect, useRef, useCallback } from "react";
import { MAP_CONFIG } from "../utils/mapConfig";
import { createArtworkLayer } from "../layers/createArtworkLayer";
import { createArtworkLabels, showWalkingRoute } from "../layers/createArtworkLabel";

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
 * Crée l'élément HTML du marqueur utilisateur
 */
function createUserMarkerElement() {
  const el = document.createElement("div");
  el.className = "user-marker";
  el.innerHTML = `
    <div class="user-marker-dot"></div>
    <div class="user-marker-pulse"></div>
  `;
  return el;
}

/**
 * Fonction globale appelée par Unity (et par le fallback Desktop)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
function updateGPS(lat, lng) {
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

  // Centrer la carte sur la position au premier appel
  if (gpsState.isFirstPosition) {
    map.flyTo({
      center: coords,
      duration: 1000,
    });
    gpsState.isFirstPosition = false;
  }

  console.log("GPS updated:", { lat, lng });
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
        updateGPS(position.coords.latitude, position.coords.longitude);
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
function createArtworkClusters(map, anchors, onArtworkSelect) {
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

  // Click sur pin individuel pour zoomer et ouvrir la fiche
  map.on("click", "unclustered-point", (e) => {
    const feature = e.features[0];
    const coordinates = feature.geometry.coordinates.slice();
    const anchorId = feature.properties.id;

    // Trouver l'anchor correspondant
    const anchor = anchors.find((a) => a.id === anchorId);

    map.flyTo({
      center: coordinates,
      zoom: PIN_MAX_ZOOM,
      duration: 1000,
    });

    // Ouvrir la fiche détail
    if (anchor?.artwork && onArtworkSelect) {
      onArtworkSelect(anchor.artwork);
    }
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
export function useMapbox({ containerRef, anchors, isReady, onMapReady, onArtworkSelect }) {
  const mapRef = useRef(null);
  const cleanupRef = useRef([]);
  const layersRef = useRef([]);

  // Fonction pour voler vers un artwork
  const flyToArtwork = useCallback((anchor) => {
    if (!mapRef.current || !anchor) return;

    mapRef.current.flyTo({
      center: [anchor.longitude, anchor.latitude],
      zoom: MAP_CONFIG.modelVisibilityZoom,
      duration: 1500,
    });
  }, []);

  // Fonction pour afficher un itinéraire
  const showRoute = useCallback(async (toAnchor) => {
    if (!mapRef.current || !gpsState.userPosition) return null;

    return showWalkingRoute(
      mapRef.current,
      gpsState.userPosition,
      [toAnchor.longitude, toAnchor.latitude],
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    );
  }, []);

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
      createArtworkClusters(map, anchors, onArtworkSelect);

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
        onArtworkSelect,
      });
      cleanupRef.current.push(cleanupLabels);
    });

    // Notifier que la map est prête
    map.on("load", () => {
      onMapReady?.();
    });

    return map;
  }, [anchors, containerRef, onMapReady, onArtworkSelect]);

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

  return { map: mapRef.current, flyToArtwork, showRoute };
}
