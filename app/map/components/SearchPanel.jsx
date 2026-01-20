"use client";

/**
 * Panel de recherche d'artworks
 * Utilise SlidePanel comme container
 */

import { useRef, useEffect } from "react";
import SlidePanel from "./SlidePanel";
import { Search, X } from "lucide-react";
import { getUserDisplayName } from "@/lib/utils/userUtils";

export default function SearchPanel({
  isOpen,
  onClose,
  query,
  results,
  loading,
  onQueryChange,
  onSelectResult,
  onClear,
}) {
  const inputRef = useRef(null);

  // Focus sur l'input quand le panel s'ouvre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSelectResult = (artwork) => {
    onSelectResult(artwork);
    onClose();
  };

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} title="Rechercher">
      <div className="search-panel__input-wrapper">
        <Search size={18} className="search-panel__icon" />
        <input
          ref={inputRef}
          type="text"
          className="search-panel__input"
          placeholder="Artwork ou artiste..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        {query && !loading && (
          <button
            className="search-panel__clear"
            onClick={onClear}
            aria-label="Effacer"
          >
            <X size={18} />
          </button>
        )}
        {loading && <div className="search-panel__spinner" />}
      </div>

      <div className="search-panel__results">
        {loading ? (
          <p className="search-panel__status">Recherche en cours...</p>
        ) : query && results.length === 0 ? (
          <p className="search-panel__status">Aucun résultat</p>
        ) : results.length > 0 ? (
          <ul className="search-panel__list">
            {results.map((artwork) => (
              <li
                key={artwork.id}
                className="search-panel__item"
                onClick={() => handleSelectResult(artwork)}
              >
                <span className="search-panel__item-title">{artwork.title}</span>
                <span className="search-panel__item-artist">
                  @{getUserDisplayName(artwork.user, "inconnu")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="search-panel__hint">
            Recherchez un artwork par son titre ou le nom de l'artiste
          </p>
        )}
      </div>
    </SlidePanel>
  );
}
