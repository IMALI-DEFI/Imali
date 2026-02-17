// src/components/routing/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ requireActivation = false }) {
  const location = useLocation();
  const { user, activation, loading, initialized, activationComplete } = useAuth();

  // Show loading spinner while checking
  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // If activation is required and not complete
  if (requireActivation && !activationComplete) {
    // Check if billing is complete first
    if (!activation?.billing_complete) {
      return <Navigate to="/billing" replace />;
    }
    // Otherwise go to activation
    return <Navigate to="/activation" replace />;
  }

  // Allow access
  return <Outlet />;
}
