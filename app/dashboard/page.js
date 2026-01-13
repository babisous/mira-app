"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import Button from "@/components/Button";
import ArtworkForm from "@/components/ArtworkForm";
import ArtworkList from "@/components/ArtworkList";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const handleArtworkCreated = () => {
    // Rafraîchir la liste des artworks
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <ProtectedRoute>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>Dashboard</h1>
          <Button onClick={handleLogout} variant="secondary">
            Déconnexion
          </Button>
        </header>

        <div className="dashboard-content">
          <div className="welcome-card">
            <h2>Bienvenue, {user?.name || user?.email} !</h2>
            <p>Gérez vos œuvres d'art 3D.</p>
          </div>

          <div className="artwork-section">
            <ArtworkForm onSuccess={handleArtworkCreated} />
          </div>

          <div className="artwork-section">
            <ArtworkList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
