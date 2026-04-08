// src/components/routing/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Pages that don't require activation (user can access before activation)
const ACTIVATION_EXEMPT = [
  "/activation",
  "/billing",
  "/billing-dashboard",
  "/settings",
  "/profile",
  "/api-keys"
];

// Pages that require specific tier access
const TIER_REQUIREMENTS = {
  "/elite-dashboard": ["elite", "pro"],
  "/pro-features": ["pro", "elite"],
  "/starter-only": ["starter"],
};

// Admin emails (consider moving to env variable)
const ADMIN_EMAILS = ["wayne@imali-defi.com", "admin@imali-defi.com"];

// Loading spinner component for reuse
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-gray-500 text-sm">Loading...</p>
    </div>
  </div>
);

// Check if user has required tier
const hasRequiredTier = (userTier, requiredTiers) => {
  if (!requiredTiers || requiredTiers.length === 0) return true;
  return requiredTiers.includes(userTier);
};

export default function ProtectedRoute({ 
  requireActivation = false, 
  requiredTier = null,
  redirectTo = "/login" 
}) {
  const location = useLocation();
  const { 
    user, 
    loading, 
    activationComplete, 
    hasCardOnFile, 
    isAdmin, 
    isAuthenticated,
    hasRequiredIntegrations,
    canTrade
  } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return <LoadingSpinner />;
  }

  // Check if user is admin (case-insensitive email check)
  const isUserAdmin = isAdmin || (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));

  // NOT LOGGED IN - redirect to login
  if (!user && !isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  // ADMIN RULE: Admins can access everything, skip all checks
  if (isUserAdmin) {
    // Admin trying to access activation/billing? Send to dashboard
    if (location.pathname === "/activation" || location.pathname === "/billing") {
      return <Navigate to="/dashboard" replace />;
    }
    return <Outlet />;
  }

  // REGULAR USER RULES
  
  // Check tier requirements for specific routes
  const requiredTiersForRoute = requiredTier || TIER_REQUIREMENTS[location.pathname];
  if (requiredTiersForRoute && !hasRequiredTier(user?.tier, requiredTiersForRoute)) {
    return <Navigate to="/upgrade" replace state={{ 
      from: location.pathname,
      requiredTier: requiredTiersForRoute,
      message: `This feature requires ${requiredTiersForRoute.join(" or ")} tier`
    }} />;
  }

  // Check if current page is exempt from activation
  const isExempt = ACTIVATION_EXEMPT.some(path => location.pathname.startsWith(path));

  // If activation is required but not complete
  if (requireActivation && !activationComplete && !isExempt) {
    // Check if user has the required integrations
    if (!hasRequiredIntegrations) {
      return <Navigate to="/activation" replace state={{ 
        from: location.pathname,
        reason: "missing_integrations"
      }} />;
    }
    
    // Decide where to redirect based on billing status
    if (!hasCardOnFile) {
      return <Navigate to="/billing" replace state={{ from: location.pathname }} />;
    }
    
    return <Navigate to="/activation" replace state={{ from: location.pathname }} />;
  }

  // If activation is complete, prevent going back to activation/billing pages
  if (activationComplete && (location.pathname === "/activation" || location.pathname === "/billing")) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check trading permissions for trading routes
  if (location.pathname.startsWith("/trade") && !canTrade) {
    // Redirect to appropriate page based on what's missing
    if (!activationComplete) {
      return <Navigate to="/activation" replace state={{ from: location.pathname }} />;
    }
    if (!hasRequiredIntegrations) {
      return <Navigate to="/integrations" replace state={{ from: location.pathname }} />;
    }
    if (!hasCardOnFile) {
      return <Navigate to="/billing" replace state={{ from: location.pathname }} />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // All good - render the route
  return <Outlet />;
}

// =============================================================================
// Simplified version for routes that just need auth (no activation check)
// =============================================================================
export function RequireAuth({ children, redirectTo = "/login" }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user && !isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  return children;
}

// =============================================================================
// For routes that should redirect if already activated
// =============================================================================
export function RedirectIfActivated({ children, redirectTo = "/dashboard" }) {
  const { user, activationComplete, loading, isAdmin } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admins bypass activation redirect
  if (isAdmin) {
    return children;
  }

  if (activationComplete) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

// =============================================================================
// Tier-based route protection
// =============================================================================
export function RequireTier({ children, requiredTier, fallbackPath = "/upgrade" }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Admins can access any tier
  if (isAdmin) {
    return children;
  }

  const requiredTiers = Array.isArray(requiredTier) ? requiredTier : [requiredTier];
  
  if (!hasRequiredTier(user?.tier, requiredTiers)) {
    return <Navigate to={fallbackPath} replace state={{ 
      from: location.pathname,
      requiredTier: requiredTiers,
      currentTier: user?.tier
    }} />;
  }

  return children;
}

// =============================================================================
// Trading-specific route protection
// =============================================================================
export function RequireTradingEnabled({ children, redirectTo = "/activation" }) {
  const { canTrade, loading, activationComplete, hasCardOnFile, hasRequiredIntegrations } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!canTrade) {
    // Determine the appropriate redirect
    if (!hasCardOnFile) {
      return <Navigate to="/billing" replace state={{ from: location.pathname }} />;
    }
    if (!hasRequiredIntegrations) {
      return <Navigate to="/integrations" replace state={{ from: location.pathname }} />;
    }
    if (!activationComplete) {
      return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// =============================================================================
// Integration check protection
// =============================================================================
export function RequireIntegration({ children, requiredIntegrations = [], redirectTo = "/integrations" }) {
  const { user, activation, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check each required integration
  const missingIntegrations = requiredIntegrations.filter(integration => {
    switch (integration) {
      case "alpaca":
        return !activation?.alpaca_connected;
      case "okx":
        return !activation?.okx_connected;
      case "wallet":
        return !activation?.wallet_connected;
      default:
        return true;
    }
  });

  if (missingIntegrations.length > 0) {
    return <Navigate to={redirectTo} replace state={{ 
      from: location.pathname,
      missingIntegrations,
      message: `Please connect ${missingIntegrations.join(", ")} to continue`
    }} />;
  }

  return children;
}

// =============================================================================
// Utility hook for route protection checks
// =============================================================================
export const useRouteProtection = () => {
  const auth = useAuth();
  const location = useLocation();

  const canAccessRoute = useCallback((routePath, options = {}) => {
    const { requireActivation = false, requiredTier = null } = options;
    
    if (!auth.isAuthenticated) return false;
    if (auth.isAdmin) return true;
    
    if (requiredTier && !hasRequiredTier(auth.user?.tier, requiredTier)) return false;
    if (requireActivation && !auth.activationComplete) return false;
    
    return true;
  }, [auth]);

  const getRedirectPath = useCallback(() => {
    if (!auth.hasCardOnFile) return "/billing";
    if (!auth.hasRequiredIntegrations) return "/integrations";
    if (!auth.activationComplete) return "/activation";
    return "/dashboard";
  }, [auth]);

  return {
    canAccessRoute,
    getRedirectPath,
    isExemptRoute: (path) => ACTIVATION_EXEMPT.some(exempt => path.startsWith(exempt))
  };
};

export default ProtectedRoute;
