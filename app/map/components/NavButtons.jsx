"use client";

/**
 * Boutons de navigation
 * Colonne de boutons en haut à gauche : Search, User
 */

import { Search, User } from "lucide-react";

export default function NavButtons({ activePanel, onPanelChange }) {
  const buttons = [
    { id: "search", icon: Search, label: "Rechercher" },
    { id: "user", icon: User, label: "Compte" },
  ];

  return (
    <nav className="nav-buttons">
      {buttons.map(({ id, icon: Icon, label }) => {
        const isActive = activePanel === id;

        return (
          <button
            key={id}
            className={`nav-buttons__btn ${isActive ? "nav-buttons__btn--active" : ""}`}
            onClick={() => onPanelChange(isActive ? null : id)}
            aria-label={label}
            aria-pressed={isActive}
          >
            <Icon size={22} />
          </button>
        );
      })}
    </nav>
  );
}
