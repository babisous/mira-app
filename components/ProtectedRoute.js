"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

/**
 * Composant ProtectedRoute
 * Protège les routes qui nécessitent une authentification
 */
export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="loading-container">
        <LoadingSpinner size="large" />
        <p>Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
