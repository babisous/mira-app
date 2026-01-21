/**
 * Hook pour initialiser et gérer la carte Mapbox
 * Supporte deux modes: Desktop (navigator.geolocation) et Unity (window.updateGPS)
 */

import { useEffect, useRef, useCallback } from "react";
import { MAP_CONFIG } from "../utils/mapConfig";
import { createArtworkLayer } from "../layers/createArtworkLayer";
import { createArtworkLabels, showWalkingRoute, clearRoute } from "../layers/createArtworkLabel";

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
export function getUserState() {
  return {
    get position() {
      return gpsState.userPosition;
    },
    get isUnityContext() {
      return gpsState.isUnityContext;
    },
  };
}

/**
 * Crée les clusters d'artworks visibles au dézoom
 */
function createArtworkClusters(map, anchors, selectByAnchorIdRef) {
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
      "circle-opacity-transition": { duration: 0 },
      "circle-radius-transition": { duration: 0 },
      "circle-color-transition": { duration: 0 },
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
      "text-opacity-transition": { duration: 0 },
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
      "circle-opacity-transition": { duration: 0 },
      "circle-radius-transition": { duration: 0 },
      "circle-color-transition": { duration: 0 },
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

  // Click sur pin individuel pour sélectionner l'artwork
  map.on("click", "unclustered-point", (e) => {
    const feature = e.features[0];
    const anchorId = feature.properties.id;

    // Utiliser la fonction de sélection des labels (déclenche skyLine + zoom + fiche)
    if (selectByAnchorIdRef?.current) {
      selectByAnchorIdRef.current(anchorId);
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
export function useMapbox({ containerRef, anchors, isReady, onMapReady, onArtworkSelect, onRequestRoute, onBoundsChange }) {
  const mapRef = useRef(null);
  const cleanupRef = useRef([]);
  const layersRef = useRef([]);
  const selectByAnchorIdRef = useRef(null);
  const mapInitializedRef = useRef(false);
  const isAnimatingRef = useRef(false);
  const mapboxglRef = useRef(null);
  const tweenRef = useRef(null);
  const threeRef = useRef(null);
  const gltfLoaderRef = useRef(null);
  const labelsCleanupRef = useRef(null);
  const addedAnchorIdsRef = useRef(new Set());
  const styleLoadedRef = useRef(false);

  // Stocker les callbacks dans des refs pour éviter les re-créations de initializeMap
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onMapReadyRef = useRef(onMapReady);
  const onArtworkSelectRef = useRef(onArtworkSelect);
  const onRequestRouteRef = useRef(onRequestRoute);

  // Mettre à jour les refs quand les props changent
  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
    onMapReadyRef.current = onMapReady;
    onArtworkSelectRef.current = onArtworkSelect;
    onRequestRouteRef.current = onRequestRoute;
  }, [onBoundsChange, onMapReady, onArtworkSelect, onRequestRoute]);

  // Fonction pour sélectionner un artwork (utilisée par la recherche)
  const selectArtwork = useCallback((anchor) => {
    if (!anchor) return;

    // Utiliser la fonction de sélection des labels si disponible
    if (selectByAnchorIdRef.current) {
      selectByAnchorIdRef.current(anchor.id);
    }
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

  // Fonction pour supprimer l'itinéraire
  const clearMapRoute = useCallback(() => {
    if (!mapRef.current) return;
    clearRoute(mapRef.current);
  }, []);

  // Fonction pour obtenir les bounds de la carte
  const getMapBounds = useCallback((map) => {
    const bounds = map.getBounds();
    return {
      minLat: bounds.getSouth(),
      maxLat: bounds.getNorth(),
      minLng: bounds.getWest(),
      maxLng: bounds.getEast(),
    };
  }, []);

  // Initialisation de la carte
  const initializeMap = useCallback(async () => {
    if (!containerRef.current || mapRef.current) return;

    // Imports dynamiques pour éviter les problèmes SSR
    const mapboxgl = (await import("mapbox-gl")).default;
    const THREE = await import("three");
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader");
    const TWEEN = (await import("@tweenjs/tween.js")).default;

    // Stocker les refs pour utilisation dans les effets
    mapboxglRef.current = mapboxgl;
    tweenRef.current = TWEEN;
    threeRef.current = THREE;
    gltfLoaderRef.current = GLTFLoader;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    // Création de la carte (centre par défaut, le GPS centrera sur l'utilisateur)
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: process.env.NEXT_PUBLIC_MAPBOX_STYLE,
      zoom: MAP_CONFIG.initialZoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      center: MAP_CONFIG.defaultCenter,
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

    // Fonction pour initialiser les clusters
    const initClusters = () => {
      if (!map.getSource("artworks-clusters")) {
        styleLoadedRef.current = true;
        createArtworkClusters(map, [], selectByAnchorIdRef);
      }
    };

    // Ajout des layers et labels au chargement du style
    map.on("style.load", initClusters);

    // Notifier que la map est prête et déclencher le chargement initial
    map.on("load", () => {
      mapInitializedRef.current = true;

      // S'assurer que les clusters sont créés (si style.load a déjà été déclenché)
      initClusters();

      onMapReadyRef.current?.();

      // Charger les anchors de la zone visible initiale
      if (onBoundsChangeRef.current) {
        const bounds = getMapBounds(map);
        onBoundsChangeRef.current(bounds);
      }
    });

    // Tracker les animations pour éviter les appels multiples à onBoundsChange
    map.on("movestart", (e) => {
      // Si le mouvement est programmatique (flyTo, easeTo, etc.)
      if (e.originalEvent === undefined) {
        isAnimatingRef.current = true;
      }
    });

    // Écouter les déplacements de la carte pour charger les nouveaux anchors
    map.on("moveend", () => {
      // Ignorer si la map n'est pas initialisée ou si c'est une animation programmatique en cours
      if (!mapInitializedRef.current) return;

      // Si c'était une animation programmatique, la marquer comme terminée
      // mais ne pas déclencher de chargement (sera fait au prochain mouvement utilisateur)
      if (isAnimatingRef.current) {
        isAnimatingRef.current = false;
        return;
      }

      if (onBoundsChangeRef.current) {
        const bounds = getMapBounds(map);
        onBoundsChangeRef.current(bounds);
      }
    });

    return map;
  }, [containerRef, getMapBounds]);

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

  // Effet pour mettre à jour la source GeoJSON des clusters quand les anchors changent
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapInitializedRef.current) return;

    const source = map.getSource("artworks-clusters");
    if (!source) return;

    // Créer le nouveau GeoJSON
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

    source.setData(geojson);
  }, [anchors]);

  // Effet pour créer les layers 3D quand les anchors changent
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxglRef.current;
    const THREE = threeRef.current;
    const GLTFLoader = gltfLoaderRef.current;

    if (!map || !mapboxgl || !THREE || !GLTFLoader) return;
    if (!mapInitializedRef.current || !styleLoadedRef.current) return;

    // Ajouter les layers 3D pour les nouveaux anchors uniquement
    anchors.forEach((anchor) => {
      if (!anchor.artwork?.url) return;
      if (addedAnchorIdsRef.current.has(anchor.id)) return;

      try {
        const layer = createArtworkLayer({
          mapboxgl,
          THREE,
          GLTFLoader,
          anchor,
          index: addedAnchorIdsRef.current.size,
        });

        map.addLayer(layer);
        layersRef.current.push(layer);
        addedAnchorIdsRef.current.add(anchor.id);
      } catch (error) {
        console.error("Erreur création layer 3D:", error);
      }
    });
  }, [anchors]);

  // Effet pour créer/mettre à jour les labels quand les anchors changent
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxglRef.current;
    const TWEEN = tweenRef.current;

    if (!map || !mapboxgl || !TWEEN || !mapInitializedRef.current) return;
    if (anchors.length === 0) return;

    // Cleanup des labels précédents
    if (labelsCleanupRef.current) {
      labelsCleanupRef.current();
      labelsCleanupRef.current = null;
    }

    // Créer les labels pour les anchors avec artwork
    const anchorsWithArtwork = anchors.filter((a) => a.artwork?.url);
    if (anchorsWithArtwork.length === 0) return;

    const userState = getUserState();

    const { cleanup, selectByAnchorId } = createArtworkLabels({
      mapboxgl,
      map,
      anchors: anchorsWithArtwork,
      layers: layersRef.current,
      TWEEN,
      userState,
      accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
      onArtworkSelect: onArtworkSelectRef.current,
      onRequestRoute: onRequestRouteRef.current,
    });

    labelsCleanupRef.current = cleanup;
    selectByAnchorIdRef.current = selectByAnchorId;

    return () => {
      if (labelsCleanupRef.current) {
        labelsCleanupRef.current();
        labelsCleanupRef.current = null;
      }
    };
  }, [anchors]);

  return { map: mapRef.current, selectArtwork, showRoute, clearRoute: clearMapRoute };
}
