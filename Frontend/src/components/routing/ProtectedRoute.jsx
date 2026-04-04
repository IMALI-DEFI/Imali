// src/components/routing/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Pages that don't require activation
const ACTIVATION_EXEMPT = ["/activation", "/billing", "/billing-dashboard", "/settings"];

// Admin emails
const ADMIN_EMAILS = ["wayne@imali-defi.com"];

export default function ProtectedRoute({ requireActivation = false }) {
  const location = useLocation();
  const { user, loading, activationComplete, hasCardOnFile, isAdmin, isAuthenticated } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in - redirect to login
  if (!user && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // ADMIN RULE: Admins can access everything, skip activation checks
  if (isAdmin) {
    // If admin tries to go to activation/billing, send to dashboard
    if (location.pathname === "/activation" || location.pathname === "/billing") {
      return <Navigate to="/dashboard" replace />;
    }
    return <Outlet />;
  }

  // REGULAR USER RULES
  
  // Check if current page is exempt from activation
  const isExempt = ACTIVATION_EXEMPT.some(path => location.pathname.startsWith(path));

  // If activation is required but not complete, redirect
  if (requireActivation && !activationComplete && !isExempt) {
    // Decide where to redirect based on billing status
    if (!hasCardOnFile) {
      return <Navigate to="/billing" replace />;
    }
    return <Navigate to="/activation" replace />;
  }

  // If activation is complete, prevent going back to activation/billing
  if (activationComplete && (location.pathname === "/activation" || location.pathname === "/billing")) {
    return <Navigate to="/dashboard" replace />;
  }

  // All good - render the route
  return <Outlet />;
}

// Simplified version for routes that just need auth (no activation check)
export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

// For routes that should redirect if already activated
export function RedirectIfActivated({ children }) {
  const { user, activationComplete, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (activationComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
