/**
 * Service Artwork
 * Gère toutes les opérations liées aux artworks
 */

import apiClient from "../api/client";

class ArtworkService {
  /**
   * Upload un fichier GLB vers le serveur
   */
  async uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const token = apiClient.getAuthToken();

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erreur lors de l'upload");
    }

    return data.data;
  }

  /**
   * Crée une nouvelle œuvre d'art
   */
  async create(title, description, url) {
    const response = await apiClient.post(
      "/artworks",
      { title, description, url },
      true
    );

    return response.data;
  }

  /**
   * Récupère toutes les œuvres
   */
  async getAll(page = 1, limit = 10) {
    const response = await apiClient.get(
      `/artworks?page=${page}&limit=${limit}`,
      false
    );

    return response.data;
  }

  /**
   * Récupère les œuvres de l'utilisateur connecté
   */
  async getMyArtworks() {
    const response = await apiClient.get("/artworks", true);
    return response.data;
  }

  /**
   * Récupère une œuvre par son ID
   */
  async getById(id) {
    const response = await apiClient.get(`/artworks/${id}`, false);
    return response.data;
  }

  /**
   * Met à jour une œuvre
   */
  async update(id, data) {
    const response = await apiClient.put(`/artworks/${id}`, data, true);
    return response.data;
  }

  /**
   * Supprime une œuvre
   */
  async delete(id) {
    const response = await apiClient.delete(`/artworks/${id}`, true);
    return response.data;
  }
}

const artworkService = new ArtworkService();

export default artworkService;
