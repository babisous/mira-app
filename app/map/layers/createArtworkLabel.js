/**
 * Factory pour créer les labels des artworks avec hover
 */

import { MAP_CONFIG, getLabelOpacity } from "../utils/mapConfig";

/**
 * Crée la zone de hover invisible
 */
function createHoverZone() {
  const hoverZone = document.createElement("div");
  hoverZone.className = "artwork-hover-zone";
  return hoverZone;
}

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
 * Crée les markers et labels pour un artwork
 */
export function createArtworkLabel({ mapboxgl, map, anchor }) {
  const coordinates = [anchor.longitude, anchor.latitude];

  // Zone de hover
  const hoverZone = createHoverZone();
  const hoverMarker = new mapboxgl.Marker({
    element: hoverZone,
    anchor: "center",
  })
    .setLngLat(coordinates)
    .addTo(map);

  // Label
  const labelEl = createLabelElement(anchor);
  const labelMarker = new mapboxgl.Marker({
    element: labelEl,
    anchor: "bottom",
    offset: [0, -60],
  })
    .setLngLat(coordinates)
    .addTo(map);

  // Gestion de la visibilité selon le zoom
  let isZoomVisible = false;

  const updateVisibility = () => {
    const zoom = map.getZoom();
    const shouldBeVisible = zoom >= MAP_CONFIG.labelVisibilityZoom;

    if (shouldBeVisible !== isZoomVisible) {
      isZoomVisible = shouldBeVisible;
      hoverZone.style.display = shouldBeVisible ? "block" : "none";

      // Reset le label quand on redevient visible
      if (!shouldBeVisible) {
        labelEl.classList.remove("visible");
      }
    }

    if (shouldBeVisible) {
      const opacity = getLabelOpacity(zoom);
      labelEl.style.setProperty("--label-opacity", opacity);
    }
  };

  // Events hover
  hoverZone.addEventListener("mouseenter", () => {
    labelEl.classList.add("visible");
  });

  hoverZone.addEventListener("mouseleave", () => {
    labelEl.classList.remove("visible");
  });

  // Écoute du zoom
  map.on("zoom", updateVisibility);
  updateVisibility();

  // Cleanup function
  return () => {
    map.off("zoom", updateVisibility);
    hoverMarker.remove();
    labelMarker.remove();
  };
}
