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
import RouteStatus from "./components/RouteStatus";
import "./map.css";

export default function MapPage() {
  const { anchors, loading, error, reload } = useAnchors();
  const { query, results, loading: searchLoading, updateQuery, clearSearch } = useSearch();
  const mapRef = useRef(null);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [selectedAnchor, setSelectedAnchor] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null); // { duration, artworkTitle }

  // Handler de selection d'un resultat de recherche
  const handleSelectResult = useCallback((artwork) => {
    if (artwork.anchor && mapRef.current) {
      mapRef.current.selectArtwork(artwork.anchor);
    }
    clearSearch();
  }, [clearSearch]);

  // Handler de selection d'un artwork sur la map
  const handleArtworkSelect = useCallback((artwork) => {
    // Trouver l'anchor correspondant
    const anchor = anchors.find((a) => a.artworkId === artwork.id);
    setSelectedArtwork(artwork);
    setSelectedAnchor(anchor);
    // Fermer l'itinéraire actif quand on sélectionne un nouvel artwork
    setActiveRoute(null);
  }, [anchors]);

  // Fermer la fiche détail
  const handleCloseDetail = useCallback(() => {
    setSelectedArtwork(null);
    setSelectedAnchor(null);
  }, []);

  // Demander un itinéraire
  const handleRequestRoute = useCallback(async (anchor, artworkTitle) => {
    if (!mapRef.current) return null;
    const duration = await mapRef.current.showRoute(anchor);
    if (duration) {
      setActiveRoute({ duration, artworkTitle });
      setSelectedArtwork(null); // Fermer la fiche
      setSelectedAnchor(null);
    }
    return duration;
  }, []);

  // Annuler l'itinéraire
  const handleCancelRoute = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.clearRoute();
    }
    setActiveRoute(null);
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
      {selectedArtwork && !activeRoute && (
        <ArtworkDetail
          artwork={selectedArtwork}
          anchor={selectedAnchor}
          onClose={handleCloseDetail}
          onRequestRoute={handleRequestRoute}
        />
      )}
      {activeRoute && (
        <RouteStatus
          duration={activeRoute.duration}
          artworkTitle={activeRoute.artworkTitle}
          onCancel={handleCancelRoute}
        />
      )}
    </div>
  );
}
