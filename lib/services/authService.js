/**
 * Service d'Authentification
 * Gère toutes les opérations d'authentification
 */

import apiClient from "../api/client";

class AuthService {
  /**
   * Inscription d'un nouvel utilisateur
   */
  async register(email, password, name) {
    const response = await apiClient.post("/auth/register", {
      email,
      password,
      name,
    });

    if (response.success && response.data.token) {
      apiClient.setAuthToken(response.data.token);
    }

    return response.data;
  }

  /**
   * Connexion d'un utilisateur
   */
  async login(email, password) {
    const response = await apiClient.post("/auth/login", {
      email,
      password,
    });

    if (response.success && response.data.token) {
      apiClient.setAuthToken(response.data.token);
    }

    return response.data;
  }

  /**
   * Déconnexion d'un utilisateur
   */
  logout() {
    apiClient.clearAuthToken();
  }

  /**
   * Récupère l'utilisateur connecté
   */
  async getCurrentUser() {
    try {
      const response = await apiClient.get("/auth/me", true);
      return response.data;
    } catch (error) {
      // Si le token est invalide, on déconnecte l'utilisateur
      if (error.status === 401) {
        this.logout();
      }
      throw error;
    }
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  isAuthenticated() {
    return !!apiClient.getAuthToken();
  }

  /**
   * Récupère le token d'authentification
   */
  getToken() {
    return apiClient.getAuthToken();
  }
}

// Export d'une instance unique (Singleton)
const authService = new AuthService();

export default authService;
