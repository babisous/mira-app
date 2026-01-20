/**
 * Hook pour charger les artworks de l'utilisateur
 * @param {boolean} isOpen - Si le panel est ouvert
 * @param {boolean} placedOnly - Ne retourner que les artworks avec anchor
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import artworkService from "@/lib/services/artworkService";

export function useUserArtworks(isOpen, placedOnly = false) {
  const { isAuthenticated } = useAuth();
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadArtworks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await artworkService.getMyArtworks();
      let result = data.artworks || [];
      if (placedOnly) {
        result = result.filter((a) => a.anchor);
      }
      setArtworks(result);
    } catch (err) {
      console.error("Erreur chargement artworks:", err);
    } finally {
      setLoading(false);
    }
  }, [placedOnly]);

  useEffect(() => {
    if (isAuthenticated && isOpen) {
      loadArtworks();
    }
  }, [isAuthenticated, isOpen, loadArtworks]);

  return { artworks, loading, reload: loadArtworks, isAuthenticated };
}
