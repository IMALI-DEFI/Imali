// src/components/routing/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ACTIVATION_EXEMPT = ["/activation", "/billing", "/settings"];
const ADMIN_EMAILS = ["wayne@imali-defi.com", "admin@imali-defi.com"];

export default function ProtectedRoute({ requireActivation = false }) {
  const location = useLocation();
  const { user, activation, loading, activationComplete, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // 🔥 CRITICAL: Check admin FIRST - BEFORE activation check
  const isAdmin = user?.is_admin === true || ADMIN_EMAILS.includes(user?.email);
  
  // Admin bypass - allow access to everything
  if (isAdmin) {
    console.log("[ProtectedRoute] ✅ Admin bypass - allowing access to:", location.pathname);
    // If admin is on billing/activation, redirect to dashboard
    if (location.pathname === "/billing" || location.pathname === "/activation") {
      console.log("[ProtectedRoute] Admin on billing/activation, redirecting to dashboard");
      return <Navigate to="/dashboard" replace />;
    }
    return <Outlet />;
  }

  // For regular users, check activation
  const isExempt = ACTIVATION_EXEMPT.some(path => location.pathname.startsWith(path));

  if (requireActivation && !activationComplete && !isExempt) {
    console.log("[ProtectedRoute] Not activated, redirecting:", {
      path: location.pathname,
      hasCard: activation?.has_card_on_file,
      isAdmin: isAdmin
    });

    const hasCard = activation?.has_card_on_file === true || activation?.billing_complete === true;
    
    if (!hasCard) {
      return <Navigate to="/billing" replace />;
    }
    return <Navigate to="/activation" replace />;
  }

  if (activationComplete && (location.pathname === "/activation" || location.pathname === "/billing")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}