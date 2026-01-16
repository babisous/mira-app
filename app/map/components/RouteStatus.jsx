"use client";

/**
 * Barre de statut de l'itinéraire actif
 */

export default function RouteStatus({ duration, artworkTitle, onCancel }) {
  return (
    <div className="route-status">
      <div className="route-status-info">
        <span className="route-status-duration">{duration} min</span>
        <span className="route-status-destination">vers {artworkTitle}</span>
      </div>
      <button className="route-status-cancel" onClick={onCancel} aria-label="Annuler l'itinéraire">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );
}
