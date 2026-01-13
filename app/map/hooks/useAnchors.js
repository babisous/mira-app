/**
 * Hook pour charger les anchors depuis l'API
 */

import { useState, useEffect, useCallback } from "react";
import anchorService from "@/lib/services/anchorService";

export function useAnchors() {
  const [anchors, setAnchors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAnchors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await anchorService.getAll();
      setAnchors(data);
    } catch (err) {
      setError("Impossible de charger les anchors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnchors();
  }, [loadAnchors]);

  return {
    anchors,
    loading,
    error,
    reload: loadAnchors,
  };
}
