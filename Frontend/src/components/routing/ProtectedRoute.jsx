// src/components/routing/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Pages that need login but NOT activation
const ACTIVATION_EXEMPT = ["/activation", "/billing", "/settings"];

// Admin emails that bypass activation requirements
const ADMIN_EMAILS = ["wayne@imali-defi.com", "admin@imali-defi.com"];

export default function ProtectedRoute({ requireActivation = false }) {
  const location = useLocation();
  const { user, activation, loading, activationComplete, isAuthenticated } = useAuth();

  // ── Still loading auth state ────────────────────────────
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

  // ── Not logged in → login ───────────────────────────────
  if (!user && !isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // ── Check if user is admin (bypass activation) ──────────
  const isAdmin = user?.is_admin === true || ADMIN_EMAILS.includes(user?.email);

  // Admin bypass - allow access regardless of activation
  if (isAdmin && requireActivation) {
    console.log("[ProtectedRoute] Admin bypass - allowing access to:", location.pathname);
    return <Outlet />;
  }

  // ── Check if current path is exempt from activation ─────
  const isExempt = ACTIVATION_EXEMPT.some((path) =>
    location.pathname.startsWith(path)
  );

  // ── Activation required but not complete ────────────────
  if (requireActivation && !activationComplete && !isExempt) {
    console.log("[ProtectedRoute] Not activated, redirecting:", {
      path: location.pathname,
      hasCard: activation?.has_card_on_file,
      billingComplete: activation?.billing_complete,
      okx: activation?.okx_connected,
      alpaca: activation?.alpaca_connected,
      wallet: activation?.wallet_connected,
      trading: activation?.trading_enabled,
      isAdmin: isAdmin
    });

    // Check if user has a card on file
    const hasCard = activation?.has_card_on_file === true || activation?.billing_complete === true;
    
    // Send to billing if missing card
    if (!hasCard) {
      return <Navigate to="/billing" replace state={{ from: location.pathname }} />;
    }

    // Otherwise send to activation to finish connections + trading
    return <Navigate to="/activation" replace state={{ from: location.pathname }} />;
  }

  // ── Already activated but sitting on /activation → dashboard
  if (activationComplete && location.pathname === "/activation") {
    console.log("[ProtectedRoute] Already activated, pushing to /dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  // ── Already activated but sitting on /billing → dashboard
  if (activationComplete && location.pathname === "/billing") {
    console.log("[ProtectedRoute] Already activated, pushing to /dashboard from billing");
    return <Navigate to="/dashboard" replace />;
  }

  // ── All clear — render the route ────────────────────────
  return <Outlet />;
}
