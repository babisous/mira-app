/**
 * Service Anchor
 * Gère toutes les opérations liées aux anchors
 */

import apiClient from "../api/client";

class AnchorService {
  /**
   * Crée ou met à jour l'anchor d'une œuvre
   */
  async createOrUpdate(artworkId, latitude, longitude, altitude = null, heading = null) {
    const response = await apiClient.post(
      `/anchors/${artworkId}`,
      { latitude, longitude, altitude, heading },
      true
    );

    return response.data;
  }

  /**
   * Récupère l'anchor d'une œuvre
   */
  async getByArtworkId(artworkId) {
    const response = await apiClient.get(`/anchors/${artworkId}`, false);
    return response.data;
  }

  /**
   * Supprime l'anchor d'une œuvre
   */
  async delete(artworkId) {
    const response = await apiClient.delete(`/anchors/${artworkId}`, true);
    return response.data;
  }

  /**
   * Récupère tous les anchors
   */
  async getAll() {
    const response = await apiClient.get("/anchors", false);
    return response.data;
  }

  /**
   * Récupère les anchors dans une bounding box
   * @param {Object} bounds - Les limites de la bounding box
   * @param {number} bounds.minLat - Latitude minimum
   * @param {number} bounds.maxLat - Latitude maximum
   * @param {number} bounds.minLng - Longitude minimum
   * @param {number} bounds.maxLng - Longitude maximum
   */
  async getByBounds({ minLat, maxLat, minLng, maxLng }) {
    const params = new URLSearchParams({
      minLat: minLat.toString(),
      maxLat: maxLat.toString(),
      minLng: minLng.toString(),
      maxLng: maxLng.toString(),
    });
    const response = await apiClient.get(`/anchors/bounds?${params}`, false);
    return response.data;
  }
}

const anchorService = new AnchorService();

export default anchorService;
