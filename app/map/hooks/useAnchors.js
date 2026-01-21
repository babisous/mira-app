/**
 * Hook pour charger les anchors depuis l'API par bounding box
 */

import { useState, useCallback, useRef } from "react";
import anchorService from "@/lib/services/anchorService";

export function useAnchors() {
  const [anchors, setAnchors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadedIdsRef = useRef(new Set());
  const debounceTimerRef = useRef(null);

  /**
   * Charge les anchors dans une bounding box avec debounce
   * Merge les nouveaux anchors avec les existants pour éviter les duplications
   */
  const loadByBounds = useCallback((bounds) => {
    // Annuler le timer précédent si présent
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce de 300ms
    debounceTimerRef.current = setTimeout(async () => {
      try {
        setError(null);

        const newAnchors = await anchorService.getByBounds(bounds);

        // Merger avec les anchors existants (éviter les duplications)
        setAnchors((prevAnchors) => {
          const mergedAnchors = [...prevAnchors];

          newAnchors.forEach((anchor) => {
            if (!loadedIdsRef.current.has(anchor.id)) {
              loadedIdsRef.current.add(anchor.id);
              mergedAnchors.push(anchor);
            }
          });

          return mergedAnchors;
        });
      } catch (err) {
        console.error("Erreur chargement anchors:", err);
        setError("Impossible de charger les anchors");
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  /**
   * Recharge tous les anchors (reset complet)
   */
  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      loadedIdsRef.current.clear();

      const data = await anchorService.getAll();
      setAnchors(data);

      // Marquer tous les IDs comme chargés
      data.forEach((anchor) => loadedIdsRef.current.add(anchor.id));
    } catch (err) {
      setError("Impossible de charger les anchors");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    anchors,
    loading,
    error,
    loadByBounds,
    reload,
  };
}
