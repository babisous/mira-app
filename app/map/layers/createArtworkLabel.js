/**
 * Factory pour créer les labels des artworks - affichage par proximité avec stabilité
 */

import { MAP_CONFIG, getLabelOpacity } from "../utils/mapConfig";
import { getUserDisplayName } from "@/lib/utils/userUtils";

/**
 * Crée l'élément label HTML avec boutons d'action
 */
function createLabelElement(anchor) {
  const labelEl = document.createElement("div");
  labelEl.className = "artwork-label";

  const userName = getUserDisplayName(anchor.artwork.user, "anonymous");

  labelEl.innerHTML = `
    <div class="artwork-label-content">
      <div class="artwork-label-info">
        <div class="artwork-label-title">${anchor.artwork.title}</div>
        <div class="artwork-label-user">@${userName}</div>
      </div>
      <div class="artwork-label-actions">
        <button class="artwork-label-btn artwork-label-btn--info" aria-label="Détails">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
        </button>
        <button class="artwork-label-btn artwork-label-btn--route" aria-label="Itinéraire">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  return labelEl;
}

/**
 * Récupère et affiche l'itinéraire à pied
 */
export async function showWalkingRoute(map, from, to, accessToken) {
  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${from[0]},${from[1]};${to[0]},${to[1]}?geometries=geojson&overview=full&steps=true&access_token=${accessToken}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      console.log("No route found");
      return null;
    }

    const route = data.routes[0].geometry;

    // Supprimer l'ancien itinéraire s'il existe
    if (map.getSource("route")) {
      map.removeLayer("route-line");
      map.removeSource("route");
    }

    // Ajouter le nouvel itinéraire
    map.addSource("route", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: route,
      },
    });

    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#fff3b0",
        "line-width": 5,
        "line-opacity": 1,
      },
    }, "clusters");

    // Ajuster la vue pour voir tout l'itinéraire
    const coordinates = route.coordinates;
    const bounds = coordinates.reduce(
      (bounds, coord) => bounds.extend(coord),
      new window._mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
    );

    map.fitBounds(bounds, { padding: 80, pitch: 0, duration: 1000 });

    // Retourner la durée en minutes
    return Math.round(data.routes[0].duration / 60);
  } catch (error) {
    console.error("Error fetching route:", error);
    return null;
  }
}

/**
 * Supprime l'itinéraire de la carte
 */
export function clearRoute(map) {
  if (map.getSource("route")) {
    map.removeLayer("route-line");
    map.removeSource("route");
  }
}

/**
 * Crée une zone de click invisible pour le modèle
 */
function createClickZone() {
  const zone = document.createElement("div");
  zone.className = "artwork-click-zone";
  return zone;
}

/**
 * Calcule la distance en pixels entre le centre de l'écran et un point
 */
function getScreenDistance(map, lng, lat) {
  const center = map.getCenter();
  const centerPoint = map.project([center.lng, center.lat]);
  const anchorPoint = map.project([lng, lat]);

  const dx = anchorPoint.x - centerPoint.x;
  const dy = anchorPoint.y - centerPoint.y;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Crée les labels pour tous les artworks avec affichage stable du plus proche
 */
export function createArtworkLabels({ mapboxgl, map, anchors, layers, TWEEN, userState, accessToken, onArtworkSelect, onRequestRoute }) {
  if (anchors.length === 0) return { cleanup: () => {}, selectByAnchorId: () => {} };

  // Rendre mapboxgl accessible dans showWalkingRoute
  window._mapboxgl = mapboxgl;

  // État de sélection
  let selectedLabel = null;
  let clickedOnInteractive = false;
  let selectionTimeout = null;

  // Fonction pour sélectionner un artwork (afficher le label avec actions)
  const selectArtwork = (label, openDetail = false) => {
    const isSameLabel = selectedLabel === label;

    // Annuler le timeout précédent
    if (selectionTimeout) {
      clearTimeout(selectionTimeout);
      selectionTimeout = null;
    }

    // Désélectionner l'ancien si différent
    if (selectedLabel && !isSameLabel) {
      if (selectedLabel.layer?.showSkyLine) {
        selectedLabel.layer.showSkyLine(false);
      }
      selectedLabel.element.classList.remove("selected");
    }

    selectedLabel = label;
    const { anchor, layer, element } = label;

    // Activer la ligne 3D depuis le modèle
    if (layer?.showSkyLine) {
      layer.showSkyLine(true);
    }

    // Forcer le label visible immédiatement
    element.classList.add("visible");
    element.style.setProperty("--label-opacity", 1);

    // Si demandé, ouvrir la fiche détail
    if (openDetail) {
      onArtworkSelect?.(anchor.artwork);
    }

    // Toujours fly vers l'artwork (même si déjà sélectionné)
    map.flyTo({
      center: [anchor.longitude, anchor.latitude],
      zoom: 20,
      pitch: 0,
      duration: 1000,
      essential: true,
    });

    // Déployer les boutons après un délai (label apparaît d'abord)
    selectionTimeout = setTimeout(() => {
      element.classList.add("selected");
    }, 400);
  };

  // Fonction pour désélectionner
  const deselectArtwork = () => {
    // Annuler le timeout de déploiement
    if (selectionTimeout) {
      clearTimeout(selectionTimeout);
      selectionTimeout = null;
    }

    if (!selectedLabel) return;

    // Cacher la ligne 3D
    if (selectedLabel.layer?.showSkyLine) {
      selectedLabel.layer.showSkyLine(false);
    }

    // Retirer la classe selected
    selectedLabel.element.classList.remove("selected");

    // Supprimer l'itinéraire
    clearRoute(map);

    selectedLabel = null;
  };

  // Créer tous les labels et zones de click
  const labels = anchors.map((anchor, index) => {
    const coordinates = [anchor.longitude, anchor.latitude];
    const labelEl = createLabelElement(anchor);

    const marker = new mapboxgl.Marker({
      element: labelEl,
      anchor: "bottom",
      offset: [0, -60],
    })
      .setLngLat(coordinates)
      .addTo(map);

    // Zone de click sur le modèle
    const clickZone = createClickZone();
    const clickMarker = new mapboxgl.Marker({
      element: clickZone,
      anchor: "center",
    })
      .setLngLat(coordinates)
      .addTo(map);

    // Trouver le layer correspondant
    const layer = layers?.find((l) => l.anchor?.id === anchor.id);

    const labelData = {
      anchor,
      element: labelEl,
      marker,
      clickZone,
      clickMarker,
      layer,
    };

    // Click sur la partie info du label (titre/user)
    const infoSection = labelEl.querySelector(".artwork-label-info");
    infoSection.addEventListener("click", (e) => {
      e.stopPropagation();
      clickedOnInteractive = true;
      selectArtwork(labelData);
    });

    // Click sur le bouton info (ouvre la fiche détail)
    const infoBtn = labelEl.querySelector(".artwork-label-btn--info");
    infoBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      clickedOnInteractive = true;
      onArtworkSelect?.(anchor.artwork);
    });

    // Click sur le bouton itinéraire
    const routeBtn = labelEl.querySelector(".artwork-label-btn--route");
    routeBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      clickedOnInteractive = true;
      onRequestRoute?.(anchor, anchor.artwork.title);
    });

    // Click sur la zone du modèle
    clickZone.addEventListener("click", () => {
      clickedOnInteractive = true;
      selectArtwork(labelData);
    });

    return labelData;
  });

  // Click pour désélectionner
  const handleDeselect = () => {
    if (clickedOnInteractive) {
      clickedOnInteractive = false;
      return;
    }
    deselectArtwork();
  };
  document.addEventListener("click", handleDeselect);

  // État pour la stabilité du label
  let lockedLabel = null;
  const LOCK_THRESHOLD = 150;
  const UNLOCK_THRESHOLD = 300;

  // Mise à jour de l'affichage
  const updateLabels = () => {
    const zoom = map.getZoom();

    // Gérer la visibilité des zones de click
    const zoneVisible = zoom >= MAP_CONFIG.modelVisibilityZoom;
    labels.forEach((label) => {
      label.clickZone.style.display = zoneVisible ? "block" : "none";
    });

    // Cacher tous les labels si zoom trop faible
    if (zoom < MAP_CONFIG.labelVisibilityZoom) {
      labels.forEach((label) => label.element.classList.remove("visible"));
      lockedLabel = null;
      return;
    }

    // Calculer les distances en pixels pour chaque label
    const labelsWithDistance = labels.map((label) => ({
      label,
      distance: getScreenDistance(map, label.anchor.longitude, label.anchor.latitude),
    }));

    // Trouver le plus proche
    const closest = labelsWithDistance.reduce((prev, curr) =>
      curr.distance < prev.distance ? curr : prev
    );

    // Logique de verrouillage pour stabilité
    if (lockedLabel) {
      const lockedDistance = labelsWithDistance.find(
        (l) => l.label === lockedLabel
      )?.distance;

      if (lockedDistance && lockedDistance < UNLOCK_THRESHOLD) {
        // Garder le label actuel
      } else if (closest.distance < LOCK_THRESHOLD) {
        lockedLabel = closest.label;
      } else {
        lockedLabel = null;
      }
    } else if (closest.distance < LOCK_THRESHOLD) {
      lockedLabel = closest.label;
    }

    // Mettre à jour la visibilité
    labels.forEach((label) => {
      const shouldBeVisible = label === lockedLabel;

      if (shouldBeVisible) {
        const opacity = getLabelOpacity(zoom);
        label.element.style.setProperty("--label-opacity", opacity);
        label.element.classList.add("visible");
      } else {
        label.element.classList.remove("visible");
      }
    });
  };

  // Écouter les changements
  map.on("move", updateLabels);
  map.on("zoom", updateLabels);
  updateLabels();

  // Fonction pour sélectionner par ID d'anchor (appelée depuis pin ou search)
  const selectByAnchorId = (anchorId) => {
    const label = labels.find((l) => l.anchor.id === anchorId);
    if (label) {
      clickedOnInteractive = true;
      selectArtwork(label);
    }
  };

  // Cleanup
  const cleanup = () => {
    if (selectionTimeout) {
      clearTimeout(selectionTimeout);
    }
    map.off("move", updateLabels);
    map.off("zoom", updateLabels);
    document.removeEventListener("click", handleDeselect);
    labels.forEach((label) => {
      label.marker.remove();
      label.clickMarker.remove();
    });
  };

  return { cleanup, selectByAnchorId };
}
