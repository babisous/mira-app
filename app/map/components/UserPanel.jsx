"use client";

/**
 * Panel utilisateur
 * - Non connecté: formulaire de connexion/inscription
 * - Connecté: profil + accès bibliothèque/créations
 */

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import SlidePanel from "./SlidePanel";
import { Eye, EyeOff, LogOut, MapPin, ChevronRight } from "lucide-react";
import { getUserDisplayName } from "@/lib/utils/userUtils";

export default function UserPanel({ isOpen, onClose, onNavigate }) {
  const { user, isAuthenticated, login, register, logout, loading, error } = useAuth();
  const [authMode, setAuthMode] = useState("login");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isLogin = authMode === "login";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.email || !formData.password) {
      setFormError("Veuillez remplir tous les champs");
      return;
    }

    if (!isLogin) {
      if (!formData.name) {
        setFormError("Veuillez entrer votre nom");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setFormError("Les mots de passe ne correspondent pas");
        return;
      }
      if (formData.password.length < 6) {
        setFormError("Le mot de passe doit contenir au moins 6 caractères");
        return;
      }
    }

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register(formData.email, formData.password, formData.name);
      }
      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
    } catch (err) {
      setFormError(err.message || "Une erreur est survenue");
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const switchMode = (mode) => {
    setAuthMode(mode);
    setFormError("");
    setFormData({ name: "", email: "", password: "", confirmPassword: "" });
  };

  // Connecté: profil + navigation
  if (isAuthenticated) {
    const userName = getUserDisplayName(user, "Utilisateur");

    return (
      <SlidePanel isOpen={isOpen} onClose={onClose} title="Mon compte">
        <div className="user-panel__profile">
          <div className="user-panel__avatar">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="user-panel__info">
            <span className="user-panel__name">{userName}</span>
            <span className="user-panel__email">{user?.email}</span>
          </div>
        </div>

        <nav className="user-panel__nav">
          <button
            className="user-panel__nav-item"
            onClick={() => onNavigate("placed")}
          >
            <MapPin size={20} />
            <span>Mes créations</span>
            <ChevronRight size={18} className="user-panel__nav-arrow" />
          </button>
        </nav>

        <button className="user-panel__logout" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </SlidePanel>
    );
  }

  // Non connecté: formulaire d'auth
  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={isLogin ? "Connexion" : "Inscription"}
    >
      <form onSubmit={handleSubmit} className="user-panel__form">
        {!isLogin && (
          <div className="user-panel__field">
            <label htmlFor="name">Nom</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Votre nom"
              autoComplete="name"
            />
          </div>
        )}

        <div className="user-panel__field">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="votre@email.com"
            autoComplete="email"
          />
        </div>

        <div className="user-panel__field">
          <label htmlFor="password">Mot de passe</label>
          <div className="user-panel__password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
            <button
              type="button"
              className="user-panel__password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Masquer" : "Afficher"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {!isLogin && (
          <div className="user-panel__field">
            <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
            <input
              type={showPassword ? "text" : "password"}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
        )}

        {(formError || error) && (
          <div className="user-panel__error">{formError || error}</div>
        )}

        <button
          type="submit"
          className="user-panel__submit"
          disabled={loading}
        >
          {loading ? "Chargement..." : isLogin ? "Se connecter" : "S'inscrire"}
        </button>
      </form>

      <div className="user-panel__switch">
        <span>{isLogin ? "Pas encore inscrit ?" : "Déjà un compte ?"}</span>
        <button
          type="button"
          className="user-panel__switch-btn"
          onClick={() => switchMode(isLogin ? "register" : "login")}
        >
          {isLogin ? "Inscription" : "Connexion"}
        </button>
      </div>
    </SlidePanel>
  );
}
