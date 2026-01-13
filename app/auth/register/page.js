"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import FormInput from "@/components/FormInput";
import Button from "@/components/Button";
import Alert from "@/components/Alert";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
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

    if (!formData.name) {
      newErrors.name = "Le nom est requis";
    }

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

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "La confirmation est requise";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
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
      await register(formData.email, formData.password, formData.name);
      router.push("/dashboard");
    } catch (error) {
      setAlertMessage(error.message || "Erreur lors de l'inscription");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Inscription</h1>
        <p className="subtitle">Créez votre compte</p>

        {alertMessage && (
          <Alert
            type="error"
            message={alertMessage}
            onClose={() => setAlertMessage(null)}
          />
        )}

        <form onSubmit={handleSubmit}>
          <FormInput
            label="Nom"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Votre nom"
            required
            error={errors.name}
          />

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

          <FormInput
            label="Confirmer le mot de passe"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            required
            error={errors.confirmPassword}
          />

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? <LoadingSpinner size="small" /> : "S'inscrire"}
          </Button>
        </form>

        <div className="auth-footer">
          <p>
            Déjà un compte ? <Link href="/auth/login">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
