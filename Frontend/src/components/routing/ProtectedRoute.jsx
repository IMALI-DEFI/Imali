// src/components/routing/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ requireActivation = false }) {
  const location = useLocation();
  const { user, loading } = useAuth();

  // Wait for auth to finish checking
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // Optional: enforce activation complete
  if (requireActivation && !user.activation_complete) {
    return (
      <Navigate
        to="/activation"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
}
