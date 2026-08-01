import React from "react";
import { useAuth } from "../../hooks/useAuth";

/**
 * TierLock
 * ----------
 * Usage:
 * <TierLock allow={["pro", "elite"]}>
 *   <ProFeature />
 * </TierLock>
 *
 * Props:
 * - allow: array of allowed tiers
 * - fallback: optional JSX to show if locked
 */
export default function TierLock({
  allow = [],
  fallback = null,
  children,
}) {
  const { user, loading } = useAuth();

  // While auth is loading, render nothing (or spinner if you want)
  if (loading) return null;

  // Not logged in
  if (!user) {
    return fallback || (
      <div className="p-4 text-sm text-red-400">
        Please log in to access this feature.
      </div>
    );
  }

  const userTier = (user.tier || "starter").toLowerCase();
  const allowed = allow.map(t => t.toLowerCase());

  // Tier allowed
  if (allowed.includes(userTier)) {
    return <>{children}</>;
  }

  // Tier locked
  return (
    fallback || (
      <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5 text-sm text-red-300">
        <strong>Upgrade required.</strong>
        <div className="mt-1">
          Your plan (<code>{userTier}</code>) does not include this feature.
        </div>
      </div>
    )
  );
}
