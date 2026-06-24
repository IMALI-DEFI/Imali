import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Spinner() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
    </div>
  );
}

export default function ProtectedRoute({
  children,
  requirePaid = true,
  requireActivation = false,
  fallbackPath = "/billing",
}) {
  const location = useLocation();
  const auth = useAuth();

  const {
    user,
    isAdmin,
    activation,
    loading,
    isAuthenticated,
    isPaidUser,
    isEnterpriseUser,
    activationComplete,
    hasCardOnFile,
  } = auth;

  if (loading) return <Spinner />;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Admin bypass
  if (isAdmin || user?.is_admin || user?.email === "wayne@imali-defi.com") {
    return children;
  }

  const tier = user?.tier || "starter";

  // Enterprise check
  if (tier === "enterprise" || isEnterpriseUser) {
    const isApproved = 
      activation?.enterprise_approved === true || 
      user?.enterprise_approved === true;
    
    if (!isApproved) {
      return <Navigate to="/enterprise-pending" replace />;
    }
    return children;
  }

  // Starter - free tier (no payment required)
  if (tier === "starter") {
    return children;
  }

  // Paid tiers (pro, elite)
  if (isPaidUser) {
    // ✅ FIX: ONLY check has_card_on_file - NOT billing_complete
    if (requirePaid) {
      const hasValidPaymentMethod = 
        user?.subscription_status === "active" ||
        activation?.has_card_on_file === true ||
        hasCardOnFile;

      if (!hasValidPaymentMethod) {
        return (
          <Navigate
            to={`${fallbackPath}?tier=${tier}&email=${encodeURIComponent(user?.email || "")}`}
            state={{ from: location.pathname, blocked: true }}
            replace
          />
        );
      }
    }

    // Check activation
    if (requireActivation) {
      const isActivated = 
        activationComplete ||
        activation?.activation_complete === true ||
        activation?.trading_enabled === true;

      if (!isActivated) {
        return <Navigate to="/activation" replace />;
      }
    }
  }

  return children;
}
