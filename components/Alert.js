/**
 * Composant Alert
 * Affiche des messages d'alerte (erreur, succès, info)
 */

export default function Alert({ type = "error", message, onClose }) {
  if (!message) return null;

  return (
    <div className={`alert alert-${type}`}>
      <p>{message}</p>
      {onClose && (
        <button className="alert-close" onClick={onClose}>
          ×
        </button>
      )}
    </div>
  );
}
