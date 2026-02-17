// src/components/routing/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect } from "react";
import BotAPI from "../../utils/BotAPI";

export default function ProtectedRoute({ requireActivation = false }) {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [redirectTo, setRedirectTo] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      // Wait for auth to load
      if (loading) return;

      // Not logged in
      if (!user) {
        setRedirectTo("/login");
        setChecking(false);
        return;
      }

      // If activation not required, allow access
      if (!requireActivation) {
        setChecking(false);
        return;
      }

      // Check activation status
      try {
        const act = await BotAPI.activationStatus();
        const status = act?.status || act || {};

        // Check billing first
        if (!status.billing_complete) {
          setRedirectTo("/billing");
          setChecking(false);
          return;
        }

        // Check if fully activated
        const tier = (user?.tier || "starter").toLowerCase();
        
        // Determine required connections based on tier
        const needsOkx = ["starter", "pro", "bundle"].includes(tier);
        const needsAlpaca = ["starter", "bundle"].includes(tier);
        const needsWallet = ["elite", "stock", "bundle"].includes(tier);

        const okxConnected = !!status.okx_connected;
        const alpacaConnected = !!status.alpaca_connected;
        const walletConnected = !!status.wallet_connected;

        const connectionsComplete = 
          (!needsOkx || okxConnected) &&
          (!needsAlpaca || alpacaConnected) &&
          (!needsWallet || walletConnected);

        const tradingEnabled = !!status.trading_enabled;
        const activationComplete = status.billing_complete && connectionsComplete && tradingEnabled;

        // If not fully activated, send to activation
        if (!activationComplete) {
          setRedirectTo("/activation");
        }
      } catch (error) {
        console.error("Failed to check activation:", error);
        // On error, let the page handle it
      } finally {
        setChecking(false);
      }
    };

    checkAccess();
  }, [user, loading, requireActivation]);

  // Show loading spinner while checking
  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Redirect if needed
  if (redirectTo) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // Allow access
  return <Outlet />;
}
