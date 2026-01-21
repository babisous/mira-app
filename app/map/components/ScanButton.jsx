"use client";

/**
 * Bouton de scan AR - visible sur mobile/Unity
 * Activé si l'utilisateur est à moins de 100m d'une œuvre
 */

import { useState, useEffect } from "react";
import { ScanEye } from "lucide-react";
import { getUserState } from "../hooks";
import { getDistanceMeters } from "../utils";

const SCAN_DISTANCE_THRESHOLD = 100; // mètres

export default function ScanButton({ anchors, onScan }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [nearestAnchor, setNearestAnchor] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Détecter mobile/Unity
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768 || getUserState().isUnityContext;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Vérifier la proximité périodiquement
  useEffect(() => {
    if (!isMobile || !anchors || anchors.length === 0) return;

    const checkProximity = () => {
      const userState = getUserState();
      const userPos = userState.position;

      if (!userPos) {
        setIsEnabled(false);
        setNearestAnchor(null);
        return;
      }

      // Trouver l'anchor le plus proche
      let minDistance = Infinity;
      let closest = null;

      anchors.forEach((anchor) => {
        const anchorPos = [anchor.longitude, anchor.latitude];
        const distance = getDistanceMeters(userPos, anchorPos);
        if (distance < minDistance) {
          minDistance = distance;
          closest = anchor;
        }
      });

      const withinRange = minDistance <= SCAN_DISTANCE_THRESHOLD;
      setIsEnabled(withinRange);
      setNearestAnchor(withinRange ? closest : null);
    };

    // Vérifier immédiatement et toutes les secondes
    checkProximity();
    const interval = setInterval(checkProximity, 1000);

    return () => clearInterval(interval);
  }, [isMobile, anchors]);

  // Ne pas afficher si pas mobile
  if (!isMobile) return null;

  const handleClick = () => {
    if (!isEnabled) return;

    // Si on est dans Unity, signaler le lancement AR via URL scheme
    if (getUserState().isUnityContext) {
      const message = JSON.stringify({ action: "launchAR" });
      console.log("[ScanButton] Sending to Unity:", message);
      window.location.href = "unity:" + message;
    }

    // Callback optionnel (pour usage hors Unity)
    onScan?.(nearestAnchor);
  };

  return (
    <button
      className={`scan-button ${isEnabled ? "scan-button--enabled" : "scan-button--disabled"}`}
      onClick={handleClick}
      disabled={!isEnabled}
      aria-label={isEnabled ? "Scanner l'œuvre à proximité" : "Aucune œuvre à proximité"}
    >
      <ScanEye size={28} />
    </button>
  );
}
