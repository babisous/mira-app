"use client";

/**
 * Page de la carte des artworks 3D
 */

import { useRef, useCallback } from "react";
import { useAnchors } from "./hooks/useAnchors";
import { useSearch } from "./hooks/useSearch";
import MapView from "./components/MapView";
import SearchBar from "./components/SearchBar";
import "./map.css";

export default function MapPage() {
  const { anchors, loading, error, reload } = useAnchors();
  const { query, results, loading: searchLoading, updateQuery, clearSearch } = useSearch();
  const mapRef = useRef(null);

  // Handler de selection d'un resultat de recherche
  const handleSelectResult = useCallback((artwork) => {
    if (artwork.anchor && mapRef.current) {
      mapRef.current.flyToArtwork(artwork.anchor);
    }
    clearSearch();
  }, [clearSearch]);

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
      <SearchBar
        query={query}
        results={results}
        loading={searchLoading}
        onQueryChange={updateQuery}
        onSelectResult={handleSelectResult}
        onClear={clearSearch}
      />
      <MapView ref={mapRef} anchors={anchors} loading={loading} />
    </div>
  );
}
