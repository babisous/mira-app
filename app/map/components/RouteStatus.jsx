"use client";

/**
 * Barre de statut de l'itinéraire actif
 */

import { X } from "lucide-react";

export default function RouteStatus({ duration, artworkTitle, onCancel }) {
  return (
    <div className="route-status">
      <div className="route-status-info">
        <span className="route-status-duration">{duration} min</span>
        <span className="route-status-destination">vers {artworkTitle}</span>
      </div>
      <button className="route-status-cancel" onClick={onCancel} aria-label="Annuler l'itinéraire">
        <X size={20} />
      </button>
    </div>
  );
}
