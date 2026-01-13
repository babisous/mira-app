/**
 * Factory pour créer les labels des artworks - affichage par proximité avec stabilité
 */

import { MAP_CONFIG, getLabelOpacity } from "../utils/mapConfig";

/**
 * Crée l'élément label HTML
 */
function createLabelElement(anchor) {
  const labelEl = document.createElement("div");
  labelEl.className = "artwork-label";

  const userName =
    anchor.artwork.user?.name ||
    anchor.artwork.user?.email?.split("@")[0] ||
    "anonymous";

  labelEl.innerHTML = `
    <div class="artwork-label-content">
      <div class="artwork-label-title">${anchor.artwork.title}</div>
      <div class="artwork-label-user">@${userName}</div>
    </div>
  `;

  return labelEl;
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
export function createArtworkLabels({ mapboxgl, map, anchors, layers, TWEEN }) {
  if (anchors.length === 0) return () => {};

  // État de sélection
  let selectedLabel = null;
  let clickedOnInteractive = false;

  // Fonction pour sélectionner un artwork
  const selectArtwork = (label) => {
    if (selectedLabel === label) return;

    // Désélectionner l'ancien
    if (selectedLabel?.layer?.showSkyLine) {
      selectedLabel.layer.showSkyLine(false);
    }

    selectedLabel = label;
    const { anchor, layer } = label;

    // Activer la ligne 3D depuis le modèle
    if (layer?.showSkyLine) {
      layer.showSkyLine(true);
    }

    // Animation de la caméra via Mapbox
    console.log("flyTo start:", {
      center: [anchor.longitude, anchor.latitude],
      zoom: 24,
      pitch: 70,
      currentZoom: map.getZoom(),
      currentCenter: map.getCenter(),
    });

    map.once("moveend", () => {
      console.log("flyTo end:", {
        zoom: map.getZoom(),
        center: map.getCenter(),
        pitch: map.getPitch(),
      });
    });

    map.flyTo({
      center: [anchor.longitude, anchor.latitude],
      zoom: 24,
      pitch: 70,
      duration: 2000,
      essential: true,
    });
  };

  // Fonction pour désélectionner
  const deselectArtwork = () => {
    console.log("deselectArtwork - selectedLabel:", !!selectedLabel);
    if (!selectedLabel) return;

    // Cacher la ligne 3D
    if (selectedLabel.layer?.showSkyLine) {
      selectedLabel.layer.showSkyLine(false);
    }

    selectedLabel = null;
    console.log("Deselected");
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

    // Click sur le label
    const content = labelEl.querySelector(".artwork-label-content");
    content.addEventListener("click", () => {
      console.log("Click sur label");
      clickedOnInteractive = true;
      selectArtwork(labelData);
    });

    // Click sur la zone du modèle
    clickZone.addEventListener("click", () => {
      console.log("Click sur zone modèle");
      clickedOnInteractive = true;
      selectArtwork(labelData);
    });

    return labelData;
  });

  // Click pour désélectionner
  const handleDeselect = () => {
    console.log("handleDeselect - clickedOnInteractive:", clickedOnInteractive, "selectedLabel:", !!selectedLabel);
    if (clickedOnInteractive) {
      clickedOnInteractive = false;
      console.log("Reset flag, skip deselect");
      return;
    }
    console.log("Deselecting...");
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

  // Cleanup
  return () => {
    map.off("move", updateLabels);
    map.off("zoom", updateLabels);
    document.removeEventListener("click", handleDeselect);
    labels.forEach((label) => {
      label.marker.remove();
      label.clickMarker.remove();
    });
  };
}
