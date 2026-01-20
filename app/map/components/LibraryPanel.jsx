"use client";

/**
 * Panel bibliothèque de modèles GLB
 * Gestion des artworks : upload, liste, supprimer
 */

import { useState, useRef } from "react";
import SlidePanel from "./SlidePanel";
import { Plus, Trash2, Box, Upload, X } from "lucide-react";
import artworkService from "@/lib/services/artworkService";
import { useUserArtworks } from "../hooks/useUserArtworks";

export default function LibraryPanel({ isOpen, onClose }) {
  const { artworks, loading, reload, isAuthenticated } = useUserArtworks(isOpen);
  const fileInputRef = useRef(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadData, setUploadData] = useState({ title: "", description: "", file: null });
  const [uploadError, setUploadError] = useState("");

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

      // Upload du fichier
      const uploadResult = await artworkService.uploadFile(uploadData.file);
      setUploadProgress(60);

      // Création de l'artwork
      await artworkService.create(
        uploadData.title.trim(),
        uploadData.description.trim(),
        uploadResult.url
      );
      setUploadProgress(100);

      // Reset et refresh
      setUploadData({ title: "", description: "", file: null });
      setShowUploadForm(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await reload();
    } catch (err) {
      setUploadError(err.message || "Erreur lors de l'upload");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (artwork) => {
    if (!confirm(`Supprimer "${artwork.title}" ?`)) return;

    try {
      await artworkService.delete(artwork.id);
      await reload();
    } catch (err) {
      console.error("Erreur suppression:", err);
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
      <SlidePanel isOpen={isOpen} onClose={onClose} title="Bibliothèque">
        <p className="library-panel__auth-message">
          Connectez-vous pour accéder à votre bibliothèque de modèles.
        </p>
      </SlidePanel>
    );
  }

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} title="Bibliothèque">
      {/* Bouton ajouter */}
      {!showUploadForm && (
        <button
          className="library-panel__add-btn"
          onClick={() => setShowUploadForm(true)}
        >
          <Plus size={20} />
          <span>Importer un modèle</span>
        </button>
      )}

      {/* Formulaire upload */}
      {showUploadForm && (
        <div className="library-panel__upload-form">
          <div className="library-panel__upload-header">
            <h3>Nouveau modèle</h3>
            <button className="library-panel__upload-close" onClick={cancelUpload}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleUpload}>
            <div className="library-panel__field">
              <label>Fichier GLB</label>
              <div
                className="library-panel__file-input"
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

            <div className="library-panel__field">
              <label>Titre</label>
              <input
                type="text"
                value={uploadData.title}
                onChange={(e) => setUploadData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Nom du modèle"
              />
            </div>

            <div className="library-panel__field">
              <label>Description (optionnel)</label>
              <textarea
                value={uploadData.description}
                onChange={(e) => setUploadData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description..."
                rows={3}
              />
            </div>

            {uploadError && (
              <div className="library-panel__error">{uploadError}</div>
            )}

            {isUploading && (
              <div className="library-panel__progress">
                <div
                  className="library-panel__progress-bar"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            <button
              type="submit"
              className="library-panel__submit"
              disabled={isUploading}
            >
              {isUploading ? "Import en cours..." : "Importer"}
            </button>
          </form>
        </div>
      )}

      {/* Liste des artworks */}
      <div className="library-panel__list">
        <h3 className="library-panel__list-title">
          Mes modèles <span>({artworks.length})</span>
        </h3>

        {loading ? (
          <p className="library-panel__empty">Chargement...</p>
        ) : artworks.length === 0 ? (
          <p className="library-panel__empty">Aucun modèle importé</p>
        ) : (
          <ul className="library-panel__items">
            {artworks.map((artwork) => (
              <li key={artwork.id} className="library-panel__item">
                <Box size={20} />
                <div className="library-panel__item-info">
                  <span className="library-panel__item-title">{artwork.title}</span>
                  {artwork.anchor && (
                    <span className="library-panel__item-badge">Placé</span>
                  )}
                </div>
                <button
                  className="library-panel__item-delete"
                  onClick={() => handleDelete(artwork)}
                  aria-label="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SlidePanel>
  );
}
