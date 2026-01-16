"use client";

/**
 * Fiche détail d'un artwork
 * Desktop: sidebar à droite
 * Mobile: bottom sheet
 */

import { useState } from "react";
import ModelViewer from "./ModelViewer";

export default function ArtworkDetail({ artwork, anchor, onClose, onRequestRoute }) {
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeDuration, setRouteDuration] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  if (!artwork) return null;

  const userName =
    artwork.user?.name ||
    artwork.user?.email?.split("@")[0] ||
    "Artiste inconnu";

  const handleRouteClick = async () => {
    if (!onRequestRoute || !anchor) return;

    setRouteLoading(true);
    const duration = await onRequestRoute(anchor);
    setRouteDuration(duration);
    setRouteLoading(false);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div className={`artwork-detail ${isClosing ? "closing" : ""}`}>
      <div className="artwork-detail-header">
        <h2 className="artwork-detail-title">{artwork.title}</h2>
        <button className="artwork-detail-close" onClick={handleClose} aria-label="Fermer">
          <svg
            width="24"
            height="24"
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

      <div className="artwork-detail-content">
        <p className="artwork-detail-artist">@{userName}</p>

        {artwork.url && (
          <div className="artwork-detail-model">
            <ModelViewer modelUrl={artwork.url} />
          </div>
        )}

        {artwork.description && (
          <div className="artwork-detail-section">
            <h3>Description</h3>
            <p>{artwork.description}</p>
          </div>
        )}

        <div className="artwork-detail-section">
          <h3>Informations</h3>
          <div className="artwork-detail-info">
            <div className="artwork-detail-info-row">
              <span className="artwork-detail-info-label">Date</span>
              <span className="artwork-detail-info-value">
                {new Date(artwork.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        <button
          className="artwork-detail-route-btn"
          onClick={handleRouteClick}
          disabled={routeLoading}
        >
          {routeLoading
            ? "Chargement..."
            : routeDuration
            ? `${routeDuration} min à pied`
            : "Itinéraire"}
        </button>
      </div>
    </div>
  );
}
