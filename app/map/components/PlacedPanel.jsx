"use client";

/**
 * Panel des créations placées
 * - Liste des modèles placés sur la carte
 * - Bouton pour ouvrir le panel d'import/placement
 */

import SlidePanel from "./SlidePanel";
import { MapPin, Locate, Trash2, Box, MapPinPlus } from "lucide-react";
import anchorService from "@/lib/services/anchorService";
import { useUserArtworks } from "../hooks/useUserArtworks";

export default function PlacedPanel({ isOpen, onClose, onBack, onNavigateToArtwork, onOpenImport }) {
  const { artworks, loading, reload, isAuthenticated } = useUserArtworks(isOpen, false);

  // Seulement les artworks placés
  const placedArtworks = artworks.filter((a) => a.anchor);

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
      <SlidePanel isOpen={isOpen} onClose={onClose} onBack={onBack} title="Mes créations">
        <p className="placed-panel__auth-message">
          Connectez-vous pour gérer vos créations.
        </p>
      </SlidePanel>
    );
  }

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} onBack={onBack} title="Mes créations">
      {/* Bouton placer une création */}
      <button
        className="placed-panel__add-btn"
        onClick={() => {
          onClose();
          onOpenImport();
        }}
      >
        <MapPinPlus size={20} />
        <span>Placer une création</span>
      </button>

      {loading ? (
        <p className="placed-panel__loading">Chargement...</p>
      ) : (
        <>
          {/* Section: Placés */}
          <h3 className="placed-panel__section-title">
            Sur la carte <span>({placedArtworks.length})</span>
          </h3>

          {placedArtworks.length === 0 ? (
            <div className="placed-panel__empty-state">
              <MapPin size={32} />
              <p>Aucun modèle placé</p>
              <span>Importez un modèle puis placez-le sur la carte.</span>
            </div>
          ) : (
            <ul className="placed-panel__items">
              {placedArtworks.map((artwork) => (
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
                      <Locate size={16} />
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
        </>
      )}
    </SlidePanel>
  );
}
