"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import FormInput from "@/components/FormInput";
import Button from "@/components/Button";
import Alert from "@/components/Alert";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [alertMessage, setAlertMessage] = useState(null);

  /**
   * Gère le changement des inputs
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Efface l'erreur du champ modifié
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  /**
   * Valide le formulaire
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = "L'email est requis";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "L'email n'est pas valide";
    }

    if (!formData.password) {
      newErrors.password = "Le mot de passe est requis";
    } else if (formData.password.length < 6) {
      newErrors.password = "Le mot de passe doit contenir au moins 6 caractères";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Gère la soumission du formulaire
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlertMessage(null);

    if (!validateForm()) {
      return;
    }

    try {
      await login(formData.email, formData.password);
      router.push("/dashboard");
    } catch (error) {
      setAlertMessage(error.message || "Erreur lors de la connexion");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Connexion</h1>
        <p className="subtitle">Connectez-vous à votre compte</p>

        {alertMessage && (
          <Alert
            type="error"
            message={alertMessage}
            onClose={() => setAlertMessage(null)}
          />
        )}

        <form onSubmit={handleSubmit}>
          <FormInput
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="votre@email.com"
            required
            error={errors.email}
          />

          <FormInput
            label="Mot de passe"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
            error={errors.password}
          />

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? <LoadingSpinner size="small" /> : "Se connecter"}
          </Button>
        </form>

        <div className="auth-footer">
          <p>
            Pas encore de compte ?{" "}
            <Link href="/auth/register">S'inscrire</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
