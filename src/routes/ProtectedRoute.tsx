import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../app/context/AuthContext";

export function ProtectedRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ color: "var(--foreground)", padding: 20 }}>
        Carregando...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
