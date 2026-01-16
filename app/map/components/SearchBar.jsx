"use client";

/**
 * Barre de recherche pour les artworks sur la carte
 */

import { useRef, useEffect } from "react";

export default function SearchBar({
  query,
  results,
  loading,
  onQueryChange,
  onSelectResult,
  onClear,
}) {
  const containerRef = useRef(null);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        if (results.length > 0) {
          onClear();
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [results.length, onClear]);

  const showDropdown = query.trim() && (results.length > 0 || loading);

  return (
    <div className="search-bar-container" ref={containerRef}>
      <div className="search-bar">
        <svg
          className="search-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>

        <input
          type="text"
          className="search-input"
          placeholder="Rechercher un artwork ou artiste..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />

        {loading && <div className="search-spinner" />}

        {query && !loading && (
          <button
            className="search-clear"
            onClick={onClear}
            aria-label="Effacer la recherche"
          >
            <svg
              width="16"
              height="16"
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
        )}
      </div>

      {showDropdown && (
        <div className="search-dropdown">
          {loading ? (
            <div className="search-loading">Recherche en cours...</div>
          ) : results.length > 0 ? (
            <ul className="search-results">
              {results.map((artwork) => (
                <li
                  key={artwork.id}
                  className="search-result-item"
                  onClick={() => onSelectResult(artwork)}
                >
                  <div className="search-result-title">{artwork.title}</div>
                  <div className="search-result-artist">
                    {artwork.user?.name || "Artiste inconnu"}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="search-no-results">Aucun resultat</div>
          )}
        </div>
      )}
    </div>
  );
}
