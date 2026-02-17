// src/components/routing/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect } from "react";

// Simple retry function
const retry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && error.response?.status === 429) {
      console.log(`Rate limited, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export default function ProtectedRoute({ requireActivation = false }) {
  const location = useLocation();
  const { user, activation, loading, initialized, activationComplete } = useAuth();
  const [retryCount, setRetryCount] = useState(0);

  // Auto-retry if still loading after a delay
  useEffect(() => {
    if (loading && retryCount < 3) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, retryCount]);

  // Show loading spinner with retry message
  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">
            {retryCount > 0 ? 'Still loading...' : 'Loading...'}
          </p>
          {retryCount > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Having trouble? Please wait...
            </p>
          )}
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
