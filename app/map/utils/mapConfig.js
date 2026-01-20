/**
 * Configuration de la carte Mapbox
 */

// Couleurs de l'application
export const COLORS = {
  // Couleurs Three.js (hex numbers)
  model: 0xff0004,        // Rouge pour les modèles 3D
  background: 0x415eae,   // Bleu fond scène 3D

  // Couleurs CSS (hex strings)
  primary: "#415eae",     // Bleu primaire
  route: "#fff3b0",       // Jaune pour les itinéraires
  accent: "#FFFCE8",      // Crème pour le user marker
  error: "#ff6b6b",       // Rouge erreur
};

export const MAP_CONFIG = {
  // Position par défaut (Paris)
  defaultCenter: [2.3522, 48.8566],

  // Zoom
  initialZoom: 18,
  minZoom: 6,
  maxZoom: 24,

  // Pitch (inclinaison caméra)
  initialPitch: 0,
  maxPitch: 45,
  minPitch: 0,
  pitchZoomThreshold: {
    high: 18,  // Au-dessus: pitch max
    low: 10,   // En-dessous: pitch min
  },

  // Visibilité des modèles (zoom minimum pour voir les modèles 3D)
  modelVisibilityZoom: 16,

  // Scale des modèles selon le zoom
  modelScale: {
    zoomMax: 18,      // Zoom où scale = 1
    zoomMin: 12,      // Zoom où scale = max
    scaleMin: 1,
    scaleMax: 10,
  },

  // Labels (même zoom que les modèles)
  labelVisibilityZoom: 16,
  labelFullOpacityZoom: 16,
  hoverZoneSize: 80,
};

/**
 * Calcule le pitch cible en fonction du zoom
 */
export function getTargetPitch(zoom) {
  const { pitchZoomThreshold, maxPitch, minPitch } = MAP_CONFIG;

  if (zoom >= pitchZoomThreshold.high) return maxPitch;
  if (zoom <= pitchZoomThreshold.low) return minPitch;

  const range = pitchZoomThreshold.high - pitchZoomThreshold.low;
  return ((zoom - pitchZoomThreshold.low) / range) * maxPitch;
}

/**
 * Calcule le multiplicateur de scale en fonction du zoom
 */
export function getScaleMultiplier(zoom) {
  const { modelScale } = MAP_CONFIG;

  if (zoom >= modelScale.zoomMax) return modelScale.scaleMin;
  if (zoom <= modelScale.zoomMin) return modelScale.scaleMax;

  const zoomRange = modelScale.zoomMax - modelScale.zoomMin;
  const scaleRange = modelScale.scaleMax - modelScale.scaleMin;

  return modelScale.scaleMin + ((modelScale.zoomMax - zoom) / zoomRange) * scaleRange;
}

/**
 * Calcule l'opacité du label en fonction du zoom
 */
export function getLabelOpacity(zoom) {
  const { labelVisibilityZoom, labelFullOpacityZoom } = MAP_CONFIG;

  if (zoom < labelVisibilityZoom) return 0;
  if (zoom >= labelFullOpacityZoom) return 1;

  return (zoom - labelVisibilityZoom) / (labelFullOpacityZoom - labelVisibilityZoom);
}

/**
 * Calcule la distance en mètres entre deux coordonnées (Haversine)
 */
export function getDistanceMeters(coord1, coord2) {
  const R = 6371000; // Rayon de la Terre en mètres
  const lat1 = (coord1[1] * Math.PI) / 180;
  const lat2 = (coord2[1] * Math.PI) / 180;
  const deltaLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const deltaLng = ((coord2[0] - coord1[0]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
