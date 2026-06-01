// src/components/routing/ProtectedRoute.jsx - REWRITTEN (Matches pricing page tiers)
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Pages that don't require activation (user can access before activation)
const ACTIVATION_EXEMPT = [
  "/activation",
  "/billing",
  "/billing-dashboard",
  "/settings",
  "/profile",
  "/api-keys",
  "/support",
  "/pricing"
];

// Pages that require specific tier access (matching pricing page)
const TIER_REQUIREMENTS = {
  "/elite-dashboard": ["elite"],
  "/pro-dashboard": ["pro", "elite"],
  "/defi-dashboard": ["elite"],
  "/starter-dashboard": ["starter"],
};

// Loading spinner component for reuse
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-950">
    <div className="text-center">
      <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  </div>
);

// Check if user has required tier (matches pricing page tiers: starter, pro, elite, enterprise)
const hasRequiredTier = (userTier, requiredTiers) => {
  if (!requiredTiers || requiredTiers.length === 0) return true;
  if (!userTier) return false;
  
  const tierRank = {
    "starter": 0,
    "pro": 1,
    "elite": 2,
    "enterprise": 3
  };
  
  const userRank = tierRank[userTier.toLowerCase()] ?? 0;
  
  // Check if user's tier meets any of the required tiers
  return requiredTiers.some(required => {
    const requiredRank = tierRank[required.toLowerCase()] ?? -1;
    return userRank >= requiredRank;
  });
};

// Get the appropriate dashboard for user's tier
const getDashboardForTier = (tier) => {
  switch (tier?.toLowerCase()) {
    case "starter":
      return "/dashboard";
    case "pro":
      return "/dashboard";
    case "elite":
      return "/dashboard";
    case "enterprise":
      return "/enterprise-dashboard";
    default:
      return "/dashboard";
  }
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

  // Check if user is admin (both flags)
  const isUserAdmin = isAdmin === true || user?.is_admin === true;

  // NOT LOGGED IN - redirect to login
  if (!user && !isAuthenticated) {
    console.log("[ProtectedRoute] Not logged in, redirecting to login");
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  // ADMIN RULE: Admins can access everything
  if (isUserAdmin) {
    console.log("[ProtectedRoute] Admin access granted to:", location.pathname);
    if (location.pathname === "/activation" || location.pathname === "/billing") {
      return <Navigate to="/dashboard" replace />;
    }
    return <Outlet />;
  }

  // ==============================================
  // REGULAR USER RULES (matches pricing page)
  // ==============================================
  
  // Check tier requirements for specific routes
  const requiredTiersForRoute = requiredTier || TIER_REQUIREMENTS[location.pathname];
  if (requiredTiersForRoute && !hasRequiredTier(user?.tier, requiredTiersForRoute)) {
    return <Navigate to="/pricing" replace state={{ 
      from: location.pathname,
      requiredTier: requiredTiersForRoute,
      message: `This feature requires ${requiredTiersForRoute.join(" or ")} tier`
    }} />;
  }

  // Check if current page is exempt from activation
  const isExempt = ACTIVATION_EXEMPT.some(path => location.pathname.startsWith(path));

  // ==============================================
  // STARTER USER HANDLING
  // - No activation required
  // - Direct access to dashboard for paper trading
  // ==============================================
  if (user?.tier === "starter") {
    // Starter users trying to access activation/billing? Redirect to dashboard
    if (location.pathname === "/activation" || location.pathname === "/billing") {
      return <Navigate to="/dashboard" replace />;
    }
    // Starter users can access everything else (except paid features)
    if (!isExempt) {
      // Already checked tier requirements above
      return <Outlet />;
    }
    return <Outlet />;
  }

  // ==============================================
  // PRO & ELITE USER HANDLING
  // - Require activation (billing + connections)
  // ==============================================
  
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
    const dashboard = getDashboardForTier(user?.tier);
    return <Navigate to={dashboard} replace />;
  }

  // Check trading permissions for trading routes
  if (location.pathname.startsWith("/trade") && !canTrade) {
    // Pro/Elite users need activation first
    if (!activationComplete) {
      return <Navigate to="/activation" replace state={{ from: location.pathname }} />;
    }
    if (!hasRequiredIntegrations) {
      return <Navigate to="/activation" replace state={{ from: location.pathname }} />;
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
  const isUserAdmin = isAdmin === true || user?.is_admin === true;

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admins bypass activation redirect
  if (isUserAdmin) {
    return children;
  }

  // Starter users never go to activation
  if (user?.tier === "starter") {
    return <Navigate to="/dashboard" replace />;
  }

  // Pro/Elite users: redirect if activation complete
  if (activationComplete) {
    const dashboard = getDashboardForTier(user?.tier);
    return <Navigate to={dashboard} replace />;
  }

  return children;
}

// =============================================================================
// Tier-based route protection
// =============================================================================
export function RequireTier({ children, requiredTier, fallbackPath = "/pricing" }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();
  const isUserAdmin = isAdmin === true || user?.is_admin === true;

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Admins can access any tier
  if (isUserAdmin) {
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
// Starter-only route protection (paper trading only)
// =============================================================================
export function RequireStarterOrGuest({ children, redirectTo = "/pricing" }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();
  const isUserAdmin = isAdmin === true || user?.is_admin === true;

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Admins can access
  if (isUserAdmin) {
    return children;
  }

  // Only starter users can access this route
  if (user?.tier !== "starter") {
    return <Navigate to={redirectTo} replace state={{ 
      from: location.pathname,
      message: "This feature is only available for Starter plan users"
    }} />;
  }

  return children;
}

// =============================================================================
// Pro/Elite route protection (requires activation)
// =============================================================================
export function RequirePaidTier({ children, redirectTo = "/pricing" }) {
  const { user, activationComplete, loading, isAdmin } = useAuth();
  const location = useLocation();
  const isUserAdmin = isAdmin === true || user?.is_admin === true;

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Admins can access
  if (isUserAdmin) {
    return children;
  }

  // Check if user is on paid tier (pro or elite)
  const isPaidTier = user?.tier === "pro" || user?.tier === "elite";
  
  if (!isPaidTier) {
    return <Navigate to={redirectTo} replace state={{ 
      from: location.pathname,
      message: "This feature requires a Pro or Elite subscription"
    }} />;
  }

  // Paid tier users must complete activation
  if (!activationComplete) {
    return <Navigate to="/activation" replace state={{ from: location.pathname }} />;
  }

  return children;
}

// =============================================================================
// Enterprise-only route protection
// =============================================================================
export function RequireEnterprise({ children, redirectTo = "/pricing" }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();
  const isUserAdmin = isAdmin === true || user?.is_admin === true;

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Admins can access
  if (isUserAdmin) {
    return children;
  }

  if (user?.tier !== "enterprise") {
    return <Navigate to={redirectTo} replace state={{ 
      from: location.pathname,
      message: "This feature requires an Enterprise subscription"
    }} />;
  }

  return children;
}

// =============================================================================
// Trading-specific route protection
// =============================================================================
export function RequireTradingEnabled({ children, redirectTo = "/activation" }) {
  const { user, canTrade, loading, activationComplete, hasCardOnFile, hasRequiredIntegrations } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Starter users can only paper trade
  if (user?.tier === "starter") {
    if (location.pathname.includes("live")) {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  }

  // Pro/Elite users need trading enabled
  if (!canTrade) {
    // Determine the appropriate redirect
    if (!hasCardOnFile) {
      return <Navigate to="/billing" replace state={{ from: location.pathname }} />;
    }
    if (!hasRequiredIntegrations) {
      return <Navigate to="/activation" replace state={{ from: location.pathname }} />;
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
export function RequireIntegration({ children, requiredIntegrations = [], redirectTo = "/activation" }) {
  const { user, activation, loading, isAdmin } = useAuth();
  const location = useLocation();
  const isUserAdmin = isAdmin === true || user?.is_admin === true;

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admins bypass integration checks
  if (isUserAdmin) {
    return children;
  }

  // Starter users don't need integrations
  if (user?.tier === "starter") {
    return children;
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
    if (auth.isAdmin === true || auth.user?.is_admin === true) return true;
    
    // Starter users have special rules
    if (auth.user?.tier === "starter") {
      if (requiredTier && !hasRequiredTier("starter", requiredTier)) return false;
      return true;
    }
    
    if (requiredTier && !hasRequiredTier(auth.user?.tier, requiredTier)) return false;
    if (requireActivation && !auth.activationComplete) return false;
    
    return true;
  }, [auth]);

  const getRedirectPath = useCallback(() => {
    // Starter users go directly to dashboard
    if (auth.user?.tier === "starter") return "/dashboard";
    
    if (!auth.hasCardOnFile) return "/billing";
    if (!auth.hasRequiredIntegrations) return "/activation";
    if (!auth.activationComplete) return "/activation";
    return "/dashboard";
  }, [auth]);

  return {
    canAccessRoute,
    getRedirectPath,
    getDashboardForTier: () => getDashboardForTier(auth.user?.tier),
    isExemptRoute: (path) => ACTIVATION_EXEMPT.some(exempt => path.startsWith(exempt))
  };
};

export default ProtectedRoute;
