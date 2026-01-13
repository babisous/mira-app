/**
 * Composant FormInput
 * Input réutilisable pour les formulaires
 */

export default function FormInput({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder,
  required = false,
  error,
}) {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={name}>
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={error ? "error" : ""}
      />
      {error && <span className="error-message">{error}</span>}
    </div>
  );
}
