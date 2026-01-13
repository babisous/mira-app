/**
 * Composant Button
 * Bouton réutilisable
 */

export default function Button({
  children,
  type = "button",
  onClick,
  disabled = false,
  variant = "primary",
  fullWidth = false,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} ${fullWidth ? "btn-full" : ""}`}
    >
      {children}
    </button>
  );
}
