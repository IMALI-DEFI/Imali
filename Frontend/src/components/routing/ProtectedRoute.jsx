// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Spinner() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
    </div>
  );
}

/**
 * ProtectedRoute — single source of truth for billing & activation.
 *
 * Logic:
 *  1. Not logged in → /login
 *  2. Admin → always allowed
 *  3. Free tier (starter, enterprise) → allowed
 *  4. Paid tier (pro, elite) → MUST have billing_complete
 *  5. If requireActivation is true → MUST have exchange connected
 */
export default function ProtectedRoute({
  children,
  requirePaid = true,
  requireActivation = false,
}) {
  const { user, isAdmin, activation, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!isAuthenticated || !user)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (isAdmin || user?.is_admin || user?.email === "wayne@imali-defi.com")
    return children;

  const tier = (user?.tier || "starter").toLowerCase();
  const freeTiers = ["starter", "enterprise"];

  // ---------- PAID TIER CHECK ----------
  if (requirePaid && !freeTiers.includes(tier)) {
    const hasPaid =
      user?.subscription_status === "active" ||
      user?.subscription_status === "trialing" ||
      user?.billing_complete === true ||
      activation?.billing_complete === true ||
      activation?.has_card_on_file === true ||
      !!user?.stripe_subscription_id;

    if (!hasPaid) {
      return (
        <Navigate
          to={`/billing?tier=${tier}&email=${encodeURIComponent(user?.email || "")}`}
          state={{ from: location.pathname, blocked: true }}
          replace
        />
      );
    }
  }

  // ---------- ACTIVATION CHECK ----------
  if (requireActivation && !freeTiers.includes(tier)) {
    const isActivated =
      activation?.activation_complete ||
      activation?.trading_enabled ||
      activation?.okx_connected ||
      activation?.alpaca_connected ||
      activation?.wallet_connected;

    if (!isActivated) {
      return <Navigate to="/activation" state={{ from: location.pathname }} replace />;
    }
  }

  return children;
}
