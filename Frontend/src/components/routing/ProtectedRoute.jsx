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

export default function ProtectedRoute({
  children,
  requirePaid = true,
  requireActivation = false,
  fallbackPath = "/billing",
}) {
  const { user, isAdmin, activation, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // 1. Loading
  if (loading) return <Spinner />;

  // 2. Not logged in
  if (!isAuthenticated || !user)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  // 3. Admin bypass
  if (isAdmin || user?.is_admin || user?.email === "wayne@imali-defi.com")
    return children;

  const tier = (user?.tier || "starter").toLowerCase();

  // 4. Enterprise — must be approved
  if (tier === "enterprise") {
    if (!activation?.enterprise_approved && !user?.enterprise_approved) {
      return <Navigate to="/enterprise-pending" state={{ from: location.pathname }} replace />;
    }
    // Approved enterprise users skip billing entirely
    return children;
  }

  // 5. Starter — no payment needed
  if (tier === "starter") return children;

  // 6. Paid tier (pro, elite) — MUST have billing_complete
  if (requirePaid) {
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
          to={`${fallbackPath}?tier=${tier}&email=${encodeURIComponent(user?.email || "")}`}
          state={{ from: location.pathname, blocked: true }}
          replace
        />
      );
    }
  }

  // 7. Activation check
  if (requireActivation) {
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
