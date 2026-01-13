"use client";

/**
 * Page de la carte des artworks 3D
 */

import { useAnchors } from "./hooks/useAnchors";
import MapView from "./components/MapView";
import "./map.css";

export default function MapPage() {
  const { anchors, loading, error, reload } = useAnchors();

  if (loading) {
    return (
      <div className="map-container">
        <div className="map-loading">
          <p>Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-container">
        <div className="map-error">
          <p>{error}</p>
          <button onClick={reload} className="retry-button">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="map-container">
      <MapView anchors={anchors} loading={loading} />
    </div>
  );
}
