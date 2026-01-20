"use client";

/**
 * Fiche détail d'un artwork
 * Utilise SlidePanel comme container
 */

import { useState } from "react";
import SlidePanel from "./SlidePanel";
import ModelViewer from "./ModelViewer";
import { getUserDisplayName } from "@/lib/utils/userUtils";

export default function ArtworkDetail({ artwork, anchor, isOpen, onClose, onRequestRoute }) {
  const [routeLoading, setRouteLoading] = useState(false);

  if (!artwork) return null;

  const userName = getUserDisplayName(artwork.user, "Artiste inconnu");

  const handleRouteClick = async () => {
    if (!onRequestRoute || !anchor) return;

    setRouteLoading(true);
    await onRequestRoute(anchor, artwork.title);
    setRouteLoading(false);
  };

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} title={artwork.title}>
      <p className="artwork-detail__artist">@{userName}</p>

      {artwork.url && (
        <div className="artwork-detail__model">
          <ModelViewer modelUrl={artwork.url} />
        </div>
      )}

      {artwork.description && (
        <div className="artwork-detail__section">
          <h3>Description</h3>
          <p>{artwork.description}</p>
        </div>
      )}

      <div className="artwork-detail__section">
        <h3>Informations</h3>
        <div className="artwork-detail__info">
          <div className="artwork-detail__info-row">
            <span className="artwork-detail__info-label">Date</span>
            <span className="artwork-detail__info-value">
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
        className="artwork-detail__route-btn"
        onClick={handleRouteClick}
        disabled={routeLoading}
      >
        {routeLoading ? "Chargement..." : "Itinéraire"}
      </button>
    </SlidePanel>
  );
}
