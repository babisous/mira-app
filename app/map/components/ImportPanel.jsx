"use client";

/**
 * Panel d'import de modèles
 * - Bouton importer un modèle
 * - Liste des modèles importés (non placés)
 */

import { useState, useRef } from "react";
import SlidePanel from "./SlidePanel";
import { Box, Upload, X, Trash2, MapPinPlus } from "lucide-react";
import artworkService from "@/lib/services/artworkService";
import anchorService from "@/lib/services/anchorService";
import { useUserArtworks } from "../hooks/useUserArtworks";

export default function ImportPanel({ isOpen, onClose, onBack, onAnchorCreated }) {
  const { artworks, loading, reload, isAuthenticated } = useUserArtworks(isOpen, false);
  const fileInputRef = useRef(null);

  // Upload state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadData, setUploadData] = useState({ title: "", description: "", file: null });
  const [uploadError, setUploadError] = useState("");

  // Placement state
  const [artworkToPlace, setArtworkToPlace] = useState(null);
  const [placeData, setPlaceData] = useState({ latitude: "", longitude: "" });
  const [placeError, setPlaceError] = useState("");
  const [isPlacing, setIsPlacing] = useState(false);

  // Seulement les modèles non placés
  const unplacedArtworks = artworks.filter((a) => !a.anchor);

  const handleStartPlace = (artwork) => {
    setArtworkToPlace(artwork);
    setPlaceData({ latitude: "", longitude: "" });
    setPlaceError("");
  };

  const handleCancelPlace = () => {
    setArtworkToPlace(null);
    setPlaceData({ latitude: "", longitude: "" });
    setPlaceError("");
  };

  const handleSubmitPlace = async (e) => {
    e.preventDefault();
    setPlaceError("");

    const lat = parseFloat(placeData.latitude);
    const lng = parseFloat(placeData.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setPlaceError("Latitude invalide (-90 à 90)");
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setPlaceError("Longitude invalide (-180 à 180)");
      return;
    }

    try {
      setIsPlacing(true);
      await anchorService.createOrUpdate(artworkToPlace.id, lat, lng);
      setArtworkToPlace(null);
      setPlaceData({ latitude: "", longitude: "" });
      await reload();
      onAnchorCreated?.();
    } catch (err) {
      setPlaceError(err.message || "Erreur lors du placement");
    } finally {
      setIsPlacing(false);
    }
  };

  const handleDeleteArtwork = async (artwork) => {
    if (!confirm(`Supprimer définitivement "${artwork.title}" ?`)) return;

    try {
      await artworkService.delete(artwork.id);
      await reload();
    } catch (err) {
      console.error("Erreur suppression artwork:", err);
    }
  };

  // Upload handlers
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".glb")) {
        setUploadError("Seuls les fichiers .glb sont acceptés");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setUploadError("Le fichier ne doit pas dépasser 50 Mo");
        return;
      }
      setUploadData((prev) => ({ ...prev, file }));
      setUploadError("");
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploadError("");

    if (!uploadData.file) {
      setUploadError("Veuillez sélectionner un fichier");
      return;
    }
    if (!uploadData.title.trim()) {
      setUploadError("Veuillez entrer un titre");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(20);

      const uploadResult = await artworkService.uploadFile(uploadData.file);
      setUploadProgress(60);

      await artworkService.create(
        uploadData.title.trim(),
        uploadData.description.trim(),
        uploadResult.url
      );
      setUploadProgress(100);

      setUploadData({ title: "", description: "", file: null });
      setShowUploadForm(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await reload();
    } catch (err) {
      setUploadError(err.message || "Erreur lors de l'import");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const cancelUpload = () => {
    setShowUploadForm(false);
    setUploadData({ title: "", description: "", file: null });
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!isAuthenticated) {
    return (
      <SlidePanel isOpen={isOpen} onClose={onClose} onBack={onBack} title="Placer une création">
        <p className="import-panel__auth-message">
          Connectez-vous pour gérer vos modèles.
        </p>
      </SlidePanel>
    );
  }

  // Vue formulaire de placement
  if (artworkToPlace) {
    return (
      <SlidePanel isOpen={isOpen} onClose={onClose} onBack={handleCancelPlace} title="Placer sur la carte">
        <div className="import-panel__place-form">
          <div className="import-panel__place-artwork">
            <Box size={24} />
            <span>{artworkToPlace.title}</span>
          </div>

          <form onSubmit={handleSubmitPlace}>
            <div className="import-panel__field">
              <label>Latitude</label>
              <input
                type="number"
                step="any"
                value={placeData.latitude}
                onChange={(e) => setPlaceData((prev) => ({ ...prev, latitude: e.target.value }))}
                placeholder="48.8566"
              />
            </div>

            <div className="import-panel__field">
              <label>Longitude</label>
              <input
                type="number"
                step="any"
                value={placeData.longitude}
                onChange={(e) => setPlaceData((prev) => ({ ...prev, longitude: e.target.value }))}
                placeholder="2.3522"
              />
            </div>

            {placeError && (
              <div className="import-panel__error">{placeError}</div>
            )}

            <button
              type="submit"
              className="import-panel__submit"
              disabled={isPlacing}
            >
              {isPlacing ? "Placement..." : "Placer"}
            </button>
          </form>
        </div>
      </SlidePanel>
    );
  }

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} onBack={onBack} title="Placer une création">
      {/* Bouton importer */}
      {!showUploadForm && (
        <button
          className="import-panel__add-btn"
          onClick={() => setShowUploadForm(true)}
        >
          <Upload size={20} />
          <span>Importer un modèle</span>
        </button>
      )}

      {/* Formulaire upload */}
      {showUploadForm && (
        <div className="import-panel__upload-form">
          <div className="import-panel__upload-header">
            <h3>Nouveau modèle</h3>
            <button className="import-panel__upload-close" onClick={cancelUpload}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleUpload}>
            <div className="import-panel__field">
              <label>Fichier GLB</label>
              <div
                className="import-panel__file-input"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={20} />
                <span>{uploadData.file?.name || "Choisir un fichier..."}</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".glb"
                onChange={handleFileSelect}
                hidden
              />
            </div>

            <div className="import-panel__field">
              <label>Titre</label>
              <input
                type="text"
                value={uploadData.title}
                onChange={(e) => setUploadData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Nom du modèle"
              />
            </div>

            <div className="import-panel__field">
              <label>Description (optionnel)</label>
              <textarea
                value={uploadData.description}
                onChange={(e) => setUploadData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description..."
                rows={3}
              />
            </div>

            {uploadError && (
              <div className="import-panel__error">{uploadError}</div>
            )}

            {isUploading && (
              <div className="import-panel__progress">
                <div
                  className="import-panel__progress-bar"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            <button
              type="submit"
              className="import-panel__submit"
              disabled={isUploading}
            >
              {isUploading ? "Import en cours..." : "Importer"}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <p className="import-panel__loading">Chargement...</p>
      ) : (
        <>
          {/* Liste des modèles importés */}
          <h3 className="import-panel__section-title">
            Mes modèles <span>({unplacedArtworks.length})</span>
          </h3>

          {unplacedArtworks.length === 0 ? (
            <div className="import-panel__empty-state">
              <Box size={32} />
              <p>Aucun modèle</p>
              <span>Importez un modèle pour le placer sur la carte.</span>
            </div>
          ) : (
            <ul className="import-panel__items">
              {unplacedArtworks.map((artwork) => (
                <li key={artwork.id} className="import-panel__item">
                  <div className="import-panel__item-icon">
                    <Box size={20} />
                  </div>
                  <div className="import-panel__item-info">
                    <span className="import-panel__item-title">{artwork.title}</span>
                  </div>
                  <div className="import-panel__item-actions">
                    <button
                      className="import-panel__item-btn import-panel__item-btn--place"
                      onClick={() => handleStartPlace(artwork)}
                      aria-label="Placer sur la carte"
                      title="Placer sur la carte"
                    >
                      <MapPinPlus size={16} />
                    </button>
                    <button
                      className="import-panel__item-btn import-panel__item-btn--danger"
                      onClick={() => handleDeleteArtwork(artwork)}
                      aria-label="Supprimer"
                      title="Supprimer"
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
