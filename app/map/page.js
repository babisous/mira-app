"use client";

/**
 * Page de la carte des artworks 3D
 */

import { useRef, useCallback, useState } from "react";
import { useAnchors } from "./hooks/useAnchors";
import { useSearch } from "./hooks/useSearch";
import MapView from "./components/MapView";
import NavButtons from "./components/NavButtons";
import SearchPanel from "./components/SearchPanel";
import PlacedPanel from "./components/PlacedPanel";
import ImportPanel from "./components/ImportPanel";
import UserPanel from "./components/UserPanel";
import ArtworkDetail from "./components/ArtworkDetail";
import RouteStatus from "./components/RouteStatus";
import ScanButton from "./components/ScanButton";
import "./map.css";

export default function MapPage() {
  const { anchors, loading, error, loadByBounds, reload } = useAnchors();
  const { query, results, loading: searchLoading, updateQuery, clearSearch } = useSearch();
  const mapRef = useRef(null);
  const [activePanel, setActivePanel] = useState(null); // null | "search" | "placed" | "import" | "user"
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [selectedAnchor, setSelectedAnchor] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);

  // Changer de panel
  const handlePanelChange = useCallback((panel) => {
    setActivePanel(panel);
    if (panel) {
      setSelectedArtwork(null);
      setSelectedAnchor(null);
    }
  }, []);

  // Handler de selection d'un resultat de recherche
  const handleSelectResult = useCallback((artwork) => {
    if (artwork.anchor && mapRef.current) {
      mapRef.current.selectArtwork(artwork.anchor);
    }
    clearSearch();
    setActivePanel(null);
  }, [clearSearch]);

  // Naviguer vers un artwork (depuis PlacedPanel)
  const handleNavigateToArtwork = useCallback((artwork) => {
    if (artwork.anchor && mapRef.current) {
      mapRef.current.selectArtwork(artwork.anchor);
    }
  }, []);

  // Handler de selection d'un artwork sur la map
  const handleArtworkSelect = useCallback((artwork) => {
    const anchor = anchors.find((a) => a.artworkId === artwork.id);
    setSelectedArtwork(artwork);
    setSelectedAnchor(anchor);
    setActiveRoute(null);
    setActivePanel(null);
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
      setSelectedArtwork(null);
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

  // Callback après création d'un anchor
  const handleAnchorCreated = useCallback(() => {
    // Recharger les anchors de la zone visible
    if (mapRef.current?.getBounds) {
      const bounds = mapRef.current.getBounds();
      if (bounds) loadByBounds(bounds);
    }
  }, [loadByBounds]);

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
      <MapView
        ref={mapRef}
        anchors={anchors}
        loading={loading}
        onArtworkSelect={handleArtworkSelect}
        onRequestRoute={handleRequestRoute}
        onBoundsChange={loadByBounds}
      />

      <NavButtons activePanel={activePanel} onPanelChange={handlePanelChange} />

      <SearchPanel
        isOpen={activePanel === "search"}
        onClose={() => setActivePanel(null)}
        query={query}
        results={results}
        loading={searchLoading}
        onQueryChange={updateQuery}
        onSelectResult={handleSelectResult}
        onClear={clearSearch}
      />

      <PlacedPanel
        isOpen={activePanel === "placed"}
        onClose={() => setActivePanel(null)}
        onBack={() => setActivePanel("user")}
        onNavigateToArtwork={handleNavigateToArtwork}
        onOpenImport={() => setActivePanel("import")}
      />

      <ImportPanel
        isOpen={activePanel === "import"}
        onClose={() => setActivePanel(null)}
        onBack={() => setActivePanel("placed")}
        onAnchorCreated={handleAnchorCreated}
      />

      <UserPanel
        isOpen={activePanel === "user"}
        onClose={() => setActivePanel(null)}
        onNavigate={(panel) => setActivePanel(panel)}
      />

      <ArtworkDetail
        artwork={selectedArtwork}
        anchor={selectedAnchor}
        isOpen={!!selectedArtwork && !activeRoute && !activePanel}
        onClose={handleCloseDetail}
        onRequestRoute={handleRequestRoute}
      />

      {activeRoute && (
        <RouteStatus
          duration={activeRoute.duration}
          artworkTitle={activeRoute.artworkTitle}
          onCancel={handleCancelRoute}
        />
      )}

      <ScanButton
        anchors={anchors}
        onScan={(anchor) => {
          if (mapRef.current) {
            mapRef.current.selectArtwork(anchor);
          }
        }}
      />
    </div>
  );
}
