"use client";

import { useState } from "react";
import FormInput from "./FormInput";
import Button from "./Button";
import Alert from "./Alert";
import LoadingSpinner from "./LoadingSpinner";
import artworkService from "@/lib/services/artworkService";

export default function ArtworkForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertType, setAlertType] = useState("error");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    if (selectedFile) {
      // Vérifier l'extension
      if (!selectedFile.name.toLowerCase().endsWith(".glb")) {
        setErrors((prev) => ({
          ...prev,
          file: "Seuls les fichiers .glb sont acceptés",
        }));
        setFile(null);
        return;
      }

      // Vérifier la taille (50 MB max)
      if (selectedFile.size > 50 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          file: "Le fichier ne doit pas dépasser 50 MB",
        }));
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setErrors((prev) => ({
        ...prev,
        file: null,
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Le titre est requis";
    }

    if (!file) {
      newErrors.file = "Vous devez sélectionner un fichier .glb";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlertMessage(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      // 1. Upload du fichier
      setUploadProgress(30);
      const uploadResult = await artworkService.uploadFile(file);

      // 2. Création de l'artwork
      setUploadProgress(70);
      const artwork = await artworkService.create(
        formData.title,
        formData.description,
        uploadResult.url
      );

      setUploadProgress(100);

      // Reset du formulaire
      setFormData({ title: "", description: "" });
      setFile(null);
      document.getElementById("file-input").value = "";

      setAlertType("success");
      setAlertMessage("Artwork créé avec succès !");

      // Callback de succès
      if (onSuccess) {
        onSuccess(artwork);
      }
    } catch (error) {
      setAlertType("error");
      setAlertMessage(error.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="artwork-form-container">
      <h2>Ajouter une œuvre</h2>

      {alertMessage && (
        <Alert
          type={alertType}
          message={alertMessage}
          onClose={() => setAlertMessage(null)}
        />
      )}

      <form onSubmit={handleSubmit}>
        <FormInput
          label="Titre"
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Le titre de votre œuvre"
          required
          error={errors.title}
        />

        <FormInput
          label="Description"
          type="text"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Description (optionnelle)"
          error={errors.description}
        />

        <div className="form-group">
          <label htmlFor="file-input">
            Fichier 3D (.glb) <span className="required">*</span>
          </label>
          <input
            type="file"
            id="file-input"
            accept=".glb"
            onChange={handleFileChange}
            className={errors.file ? "error" : ""}
          />
          {file && (
            <p className="file-info">
              Fichier sélectionné : {file.name} (
              {(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
          {errors.file && <span className="error-message">{errors.file}</span>}
        </div>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}

        <Button type="submit" fullWidth disabled={loading}>
          {loading ? (
            <>
              <LoadingSpinner size="small" /> Upload en cours...
            </>
          ) : (
            "Créer l'artwork"
          )}
        </Button>
      </form>
    </div>
  );
}
