"use client";

/**
 * Panel des modèles placés (anchors)
 * Voir sur la map, éditer position
 */

import SlidePanel from "./SlidePanel";
import { MapPin, Navigation, Trash2, Box } from "lucide-react";
import anchorService from "@/lib/services/anchorService";
import { useUserArtworks } from "../hooks/useUserArtworks";

export default function PlacedPanel({ isOpen, onClose, onNavigateToArtwork }) {
  const { artworks, loading, reload, isAuthenticated } = useUserArtworks(isOpen, true);

  const handleViewOnMap = (artwork) => {
    if (onNavigateToArtwork && artwork.anchor) {
      onNavigateToArtwork(artwork);
      onClose();
    }
  };

  const handleRemoveAnchor = async (artwork) => {
    if (!confirm(`Retirer "${artwork.title}" de la carte ?`)) return;

    try {
      await anchorService.delete(artwork.id);
      await reload();
    } catch (err) {
      console.error("Erreur suppression anchor:", err);
    }
  };

  if (!isAuthenticated) {
    return (
      <SlidePanel isOpen={isOpen} onClose={onClose} title="Mes créations">
        <p className="placed-panel__auth-message">
          Connectez-vous pour voir vos modèles placés sur la carte.
        </p>
      </SlidePanel>
    );
  }

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} title="Mes créations">
      <p className="placed-panel__description">
        Modèles que vous avez placés sur la carte.
      </p>

      {loading ? (
        <p className="placed-panel__empty">Chargement...</p>
      ) : artworks.length === 0 ? (
        <div className="placed-panel__empty-state">
          <MapPin size={32} />
          <p>Aucun modèle placé</p>
          <span>Importez un modèle dans votre bibliothèque puis placez-le sur la carte.</span>
        </div>
      ) : (
        <ul className="placed-panel__items">
          {artworks.map((artwork) => (
            <li key={artwork.id} className="placed-panel__item">
              <div className="placed-panel__item-icon">
                <Box size={20} />
              </div>
              <div className="placed-panel__item-info">
                <span className="placed-panel__item-title">{artwork.title}</span>
                <span className="placed-panel__item-coords">
                  {artwork.anchor.latitude.toFixed(5)}, {artwork.anchor.longitude.toFixed(5)}
                </span>
              </div>
              <div className="placed-panel__item-actions">
                <button
                  className="placed-panel__item-btn"
                  onClick={() => handleViewOnMap(artwork)}
                  aria-label="Voir sur la carte"
                  title="Voir sur la carte"
                >
                  <Navigation size={16} />
                </button>
                <button
                  className="placed-panel__item-btn placed-panel__item-btn--danger"
                  onClick={() => handleRemoveAnchor(artwork)}
                  aria-label="Retirer de la carte"
                  title="Retirer de la carte"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SlidePanel>
  );
}
