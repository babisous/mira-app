"use client";

import { useState } from "react";
import FormInput from "./FormInput";
import Button from "./Button";
import Alert from "./Alert";
import LoadingSpinner from "./LoadingSpinner";
import anchorService from "@/lib/services/anchorService";

export default function AnchorForm({ artwork, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    latitude: artwork.anchor?.latitude || "",
    longitude: artwork.anchor?.longitude || "",
    altitude: artwork.anchor?.altitude || "",
    heading: artwork.anchor?.heading || "",
  });

  const [errors, setErrors] = useState({});
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertType, setAlertType] = useState("error");
  const [loading, setLoading] = useState(false);

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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.latitude.trim()) {
      newErrors.latitude = "La latitude est requise";
    } else {
      const lat = parseFloat(formData.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        newErrors.latitude = "La latitude doit être entre -90 et 90";
      }
    }

    if (!formData.longitude.trim()) {
      newErrors.longitude = "La longitude est requise";
    } else {
      const lon = parseFloat(formData.longitude);
      if (isNaN(lon) || lon < -180 || lon > 180) {
        newErrors.longitude = "La longitude doit être entre -180 et 180";
      }
    }

    if (formData.altitude && formData.altitude.trim()) {
      const alt = parseFloat(formData.altitude);
      if (isNaN(alt)) {
        newErrors.altitude = "L'altitude doit être un nombre valide";
      }
    }

    if (formData.heading && formData.heading.trim()) {
      const head = parseFloat(formData.heading);
      if (isNaN(head) || head < 0 || head > 360) {
        newErrors.heading = "L'orientation doit être entre 0 et 360 degrés";
      }
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

    try {
      const latitude = parseFloat(formData.latitude);
      const longitude = parseFloat(formData.longitude);
      const altitude = formData.altitude.trim()
        ? parseFloat(formData.altitude)
        : null;
      const heading = formData.heading.trim()
        ? parseFloat(formData.heading)
        : null;

      const anchor = await anchorService.createOrUpdate(
        artwork.id,
        latitude,
        longitude,
        altitude,
        heading
      );

      setAlertType("success");
      setAlertMessage(
        artwork.anchor
          ? "Anchor mis à jour avec succès !"
          : "Anchor créé avec succès !"
      );

      if (onSuccess) {
        onSuccess(anchor);
      }
    } catch (error) {
      setAlertType("error");
      setAlertMessage(error.message || "Erreur lors de la création de l'anchor");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!artwork.anchor) return;

    if (!confirm("Êtes-vous sûr de vouloir supprimer l'anchor ?")) {
      return;
    }

    setLoading(true);
    setAlertMessage(null);

    try {
      await anchorService.delete(artwork.id);

      setAlertType("success");
      setAlertMessage("Anchor supprimé avec succès !");

      if (onSuccess) {
        onSuccess(null);
      }
    } catch (error) {
      setAlertType("error");
      setAlertMessage(
        error.message || "Erreur lors de la suppression de l'anchor"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="anchor-form-container">
      <div className="anchor-form-header">
        <h3>{artwork.anchor ? "Modifier l'anchor" : "Définir la localisation"}</h3>
        {onCancel && (
          <button className="close-btn" onClick={onCancel}>
            ×
          </button>
        )}
      </div>

      {alertMessage && (
        <Alert
          type={alertType}
          message={alertMessage}
          onClose={() => setAlertMessage(null)}
        />
      )}

      <form onSubmit={handleSubmit}>
        <FormInput
          label="Latitude"
          type="number"
          name="latitude"
          value={formData.latitude}
          onChange={handleChange}
          placeholder="Ex: 48.8566"
          step="any"
          required
          error={errors.latitude}
        />

        <FormInput
          label="Longitude"
          type="number"
          name="longitude"
          value={formData.longitude}
          onChange={handleChange}
          placeholder="Ex: 2.3522"
          step="any"
          required
          error={errors.longitude}
        />

        <FormInput
          label="Altitude (optionnel)"
          type="number"
          name="altitude"
          value={formData.altitude}
          onChange={handleChange}
          placeholder="Ex: 35.5"
          step="any"
          error={errors.altitude}
        />

        <FormInput
          label="Orientation (optionnel, 0-360°)"
          type="number"
          name="heading"
          value={formData.heading}
          onChange={handleChange}
          placeholder="Ex: 90"
          step="any"
          min="0"
          max="360"
          error={errors.heading}
        />

        <div className="anchor-form-actions">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <LoadingSpinner size="small" /> Enregistrement...
              </>
            ) : artwork.anchor ? (
              "Mettre à jour"
            ) : (
              "Créer l'anchor"
            )}
          </Button>

          {artwork.anchor && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleDelete}
              disabled={loading}
            >
              Supprimer l'anchor
            </Button>
          )}

          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Annuler
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
