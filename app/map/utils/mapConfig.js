/**
 * Configuration de la carte Mapbox
 */

export const MAP_CONFIG = {
  // Position par défaut (Paris)
  defaultCenter: [2.3522, 48.8566],

  // Zoom
  initialZoom: 18,
  minZoom: 6,
  maxZoom: 22,

  // Pitch (inclinaison caméra)
  initialPitch: 60,
  maxPitch: 45,
  minPitch: 0,
  pitchZoomThreshold: {
    high: 18,  // Au-dessus: pitch max
    low: 10,   // En-dessous: pitch min
  },

  // Visibilité des modèles
  modelVisibilityZoom: 8,

  // Scale des modèles selon le zoom
  modelScale: {
    zoomMax: 18,      // Zoom où scale = 1
    zoomMin: 12,      // Zoom où scale = max
    scaleMin: 1,
    scaleMax: 10,
  },

  // Labels
  labelVisibilityZoom: 14,
  labelFullOpacityZoom: 18,
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
