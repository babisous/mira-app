/**
 * API Client
 * Gère toutes les requêtes HTTP vers le backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  /**
   * Récupère le token d'authentification du localStorage
   */
  getAuthToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_token");
  }

  /**
   * Sauvegarde le token d'authentification dans le localStorage
   */
  setAuthToken(token) {
    if (typeof window === "undefined") return;
    localStorage.setItem("auth_token", token);
  }

  /**
   * Supprime le token d'authentification du localStorage
   */
  clearAuthToken() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("auth_token");
  }

  /**
   * Construit les headers pour les requêtes
   */
  getHeaders(authenticated = false) {
    const headers = {
      "Content-Type": "application/json",
    };

    if (authenticated) {
      const token = this.getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Gère les erreurs des réponses HTTP
   */
  async handleResponse(response) {
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error || "Une erreur est survenue");
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * Requête GET
   */
  async get(endpoint, authenticated = false) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "GET",
      headers: this.getHeaders(authenticated),
    });

    return this.handleResponse(response);
  }

  /**
   * Requête POST
   */
  async post(endpoint, body, authenticated = false) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "POST",
      headers: this.getHeaders(authenticated),
      body: JSON.stringify(body),
    });

    return this.handleResponse(response);
  }

  /**
   * Requête PUT
   */
  async put(endpoint, body, authenticated = false) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "PUT",
      headers: this.getHeaders(authenticated),
      body: JSON.stringify(body),
    });

    return this.handleResponse(response);
  }

  /**
   * Requête DELETE
   */
  async delete(endpoint, authenticated = false) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "DELETE",
      headers: this.getHeaders(authenticated),
    });

    return this.handleResponse(response);
  }
}

// Export d'une instance unique (Singleton)
const apiClient = new ApiClient(API_URL);

export default apiClient;
