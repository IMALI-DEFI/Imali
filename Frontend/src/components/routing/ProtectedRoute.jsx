// src/components/routing/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect } from "react";
import BotAPI from "../../utils/BotAPI";

export default function ProtectedRoute({ requireActivation = false }) {
  const location = useLocation();
  const { user, loading, initialized } = useAuth();
  const [checking, setChecking] = useState(true);
  const [redirectTo, setRedirectTo] = useState(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId;

    const checkAccess = async () => {
      // Wait for auth to load
      if (loading || !initialized) return;

      // Not logged in
      if (!user) {
        if (mounted) {
          setRedirectTo("/login");
          setChecking(false);
        }
        return;
      }

      // If activation not required, allow access
      if (!requireActivation) {
        if (mounted) {
          setChecking(false);
        }
        return;
      }

      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Activation check timeout')), 10000);
        });

        const actPromise = BotAPI.activationStatus();
        const act = await Promise.race([actPromise, timeoutPromise]);
        
        clearTimeout(timeoutId);
        
        const status = act?.status || act || {};

        // Check billing first
        if (!status.billing_complete) {
          if (mounted) setRedirectTo("/billing");
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

        if (!activationComplete) {
          if (mounted) setRedirectTo("/activation");
        }
      } catch (error) {
        console.error("Failed to check activation:", error);
        // On timeout or error, still allow access to activation page
        if (mounted && error.message?.includes('timeout')) {
          setRedirectTo("/activation");
        }
      } finally {
        if (mounted) setChecking(false);
      }
    };

    checkAccess();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, loading, initialized, requireActivation, location.pathname]);

  // Show loading spinner while checking
  if (loading || !initialized || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Checking authentication...</p>
        </div>
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
