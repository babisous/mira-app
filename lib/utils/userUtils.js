/**
 * Utilitaires pour les utilisateurs
 */

/**
 * Retourne le nom d'affichage d'un utilisateur
 * @param {Object} user - Objet utilisateur avec name et/ou email
 * @param {string} fallback - Valeur par défaut si aucun nom trouvé
 * @returns {string}
 */
export function getUserDisplayName(user, fallback = "Inconnu") {
  if (!user) return fallback;
  return user.name || user.email?.split("@")[0] || fallback;
}
