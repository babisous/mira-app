"use client";

/**
 * Composant de la carte Mapbox avec les artworks 3D
 */

import { useRef } from "react";
import { useMapbox } from "../hooks/useMapbox";
import "mapbox-gl/dist/mapbox-gl.css";

export default function MapView({ anchors, loading }) {
  const containerRef = useRef(null);

  // Initialisation de la carte
  useMapbox({
    containerRef,
    anchors,
    isReady: !loading,
  });

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%" }}
      aria-label="Carte des artworks 3D"
    />
  );
}
