/**
 * Hook pour la recherche d'artworks avec debounce
 */

import { useState, useEffect, useRef, useCallback } from "react";
import artworkService from "@/lib/services/artworkService";

const DEBOUNCE_DELAY = 300;

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const debounceRef = useRef(null);

  // Fonction de recherche avec debounce
  const updateQuery = useCallback((newQuery) => {
    setQuery(newQuery);

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Reset si query vide
    if (!newQuery.trim()) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

    // Debounce la recherche
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await artworkService.search(newQuery);
        setResults(data);
        setError(null);
      } catch (err) {
        console.error("Search error:", err);
        setError("Erreur lors de la recherche");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_DELAY);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setLoading(false);
    setError(null);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    query,
    results,
    loading,
    error,
    updateQuery,
    clearSearch,
  };
}
