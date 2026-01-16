"use client";

/**
 * Composant de la carte Mapbox avec les artworks 3D
 */

import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { useMapbox } from "../hooks/useMapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const MapView = forwardRef(function MapView({ anchors, loading, onMapReady, onArtworkSelect }, ref) {
  const containerRef = useRef(null);

  // Initialisation de la carte
  const { flyToArtwork, showRoute } = useMapbox({
    containerRef,
    anchors,
    isReady: !loading,
    onMapReady,
    onArtworkSelect,
  });

  // Exposer flyToArtwork et showRoute au parent via ref
  useImperativeHandle(ref, () => ({
    flyToArtwork,
    showRoute,
  }), [flyToArtwork, showRoute]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%" }}
      aria-label="Carte des artworks 3D"
    />
  );
});

export default MapView;
