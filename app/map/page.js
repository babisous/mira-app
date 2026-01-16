"use client";

/**
 * Page de la carte des artworks 3D
 */

import { useRef, useCallback, useState } from "react";
import { useAnchors } from "./hooks/useAnchors";
import { useSearch } from "./hooks/useSearch";
import MapView from "./components/MapView";
import SearchBar from "./components/SearchBar";
import ArtworkDetail from "./components/ArtworkDetail";
import "./map.css";

export default function MapPage() {
  const { anchors, loading, error, reload } = useAnchors();
  const { query, results, loading: searchLoading, updateQuery, clearSearch } = useSearch();
  const mapRef = useRef(null);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [selectedAnchor, setSelectedAnchor] = useState(null);

  // Handler de selection d'un resultat de recherche
  const handleSelectResult = useCallback((artwork) => {
    if (artwork.anchor && mapRef.current) {
      mapRef.current.flyToArtwork(artwork.anchor);
      setSelectedArtwork(artwork);
      setSelectedAnchor(artwork.anchor);
    }
    clearSearch();
  }, [clearSearch]);

  // Handler de selection d'un artwork sur la map
  const handleArtworkSelect = useCallback((artwork) => {
    // Trouver l'anchor correspondant
    const anchor = anchors.find((a) => a.artworkId === artwork.id);
    setSelectedArtwork(artwork);
    setSelectedAnchor(anchor);
  }, [anchors]);

  // Fermer la fiche détail
  const handleCloseDetail = useCallback(() => {
    setSelectedArtwork(null);
    setSelectedAnchor(null);
  }, []);

  // Demander un itinéraire
  const handleRequestRoute = useCallback(async (anchor) => {
    if (!mapRef.current) return null;
    return mapRef.current.showRoute(anchor);
  }, []);

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
      <MapView
        ref={mapRef}
        anchors={anchors}
        loading={loading}
        onArtworkSelect={handleArtworkSelect}
      />
      {selectedArtwork && (
        <ArtworkDetail
          artwork={selectedArtwork}
          anchor={selectedAnchor}
          onClose={handleCloseDetail}
          onRequestRoute={handleRequestRoute}
        />
      )}
    </div>
  );
}
