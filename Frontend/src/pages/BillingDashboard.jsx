// src/pages/BillingDashboard.jsx - REWRITTEN (Fixed routing, tier handling, validation)
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

// ============================================================================
// TIER CONFIGURATION
// ============================================================================
const TIERS = {
  starter: {
    id: "starter",
    name: "Starter",
    displayName: "Free Trial",
    price: 0,
    interval: "7-day trial",
    features: [
      "$1,000 paper trading credits",
      "Test all bots risk-free",
      "Stock & crypto trading demo",
      "No credit card required",
      "Email support",
    ],
    color: "from-emerald-600 to-emerald-700",
    icon: "🌱",
    badge: "Free Trial",
    badgeColor: "green",
    requiresPayment: false,
  },
  pro: {
    id: "pro",
    name: "Pro",
    displayName: "Pro",
    price: 19,
    interval: "month",
    features: [
      "Live trading enabled",
      "All stocks & crypto bots",
      "Advanced strategies",
      "Priority support",
      "API access",
    ],
    color: "from-blue-600 to-blue-700",
    icon: "⭐",
    badge: "Most Popular",
    badgeColor: "orange",
    requiresPayment: true,
  },
  elite: {
    id: "elite",
    name: "Elite",
    displayName: "Elite",
    price: 49,
    interval: "month",
    features: [
      "Everything in Pro",
      "DEX trading (Uniswap, QuickSwap)",
      "Custom indicators",
      "Priority execution",
      "24/7 priority support",
    ],
    color: "from-purple-600 to-purple-700",
    icon: "👑",
    badge: "Power User",
    badgeColor: "purple",
    requiresPayment: true,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    displayName: "Enterprise",
    price: "Custom",
    interval: "",
    priceDetail: "Volume-based pricing",
    features: [
      "Everything in Elite",
      "Custom branded dashboard",
      "Dedicated account manager",
      "Team management & roles",
      "Custom bot development",
      "White-label options",
      "SLAs available",
    ],
    color: "from-indigo-600 to-purple-600",
    icon: "🏢",
    badge: "Teams & Orgs",
    badgeColor: "indigo",
    requiresPayment: false,
    isEnterprise: true,
  },
};

// Price ordering for upgrade/downgrade detection
const getPrice = (tierId) => {
  if (tierId === "starter") return 0;
  if (tierId === "pro") return 19;
  if (tierId === "elite") return 49;
  if (tierId === "enterprise") return Infinity;
  return 0;
};

// ============================================================================
// SAFE API WRAPPER
// ============================================================================
const safeApiCall = async (method, ...args) => {
  if (!BotAPI) {
    console.warn("BotAPI is not defined");
    return { success: false, error: "BotAPI not available", demoMode: true };
  }

  if (typeof BotAPI[method] !== "function") {
    console.warn(`BotAPI.${method} is not a function`);
    return {
      success: false,
      error: `Method ${method} not available`,
      demoMode: true,
    };
  }

  try {
    const result = await BotAPI[method](...args);
    return { success: true, data: result };
  } catch (error) {
    console.error(`BotAPI.${method} failed:`, error);
    return { success: false, error: error.message };
  }
};

export default function BillingDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser, hasCardOnFile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [hasCard, setHasCard] = useState(false);
  const [upgrading, setUpgrading] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [autoUpgradeHandled, setAutoUpgradeHandled] = useState(false);

  const currentTierId = user?.tier || "starter";
  const currentTier = TIERS[currentTierId] || TIERS.starter;

  // Check if user came from upgrade flow
  const fromCheckout =
    location.state?.fromCheckout || location.search.includes("checkout=success");
  const pendingTier = location.state?.pendingTier || null;
  const preselectedTier = location.state?.selectedTier || null;

  // ==========================================================================
  // HANDLE PLAN CHANGE LOGIC (wrapped in useCallback for the auto-trigger)
  // ==========================================================================
  const handleChangePlan = useCallback(
    async (newTierId) => {
      if (upgrading) return;

      // Validate tier exists
      if (!TIERS[newTierId]) {
        setError(
          `Invalid plan selected: "${newTierId}". Please choose a valid plan.`
        );
        return;
      }

      // Prevent selecting current tier
      if (newTierId === currentTierId) {
        setError(`You are already on the ${TIERS[newTierId].name} plan.`);
        return;
      }

      const newTier = TIERS[newTierId];
      const currentPrice = getPrice(currentTierId);
      const newPrice = getPrice(newTierId);
      const isUpgrade = newPrice > currentPrice;

      setUpgrading(newTierId);
      setError(null);
      setSuccessMessage(null);

      try {
        // Case 1: Enterprise - contact sales
        if (newTierId === "enterprise") {
          window.location.href =
            "mailto:sales@imali-defi.com?subject=Enterprise%20Plan%20Inquiry&body=I'm%20interested%20in%20the%20Enterprise%20plan%20for%20IMALI.%20Please%20contact%20me.";
          setUpgrading(null);
          return;
        }

        // Case 2: Starter (free trial) - no payment needed
        if (newTierId === "starter") {
          const result = await safeApiCall("changePlan", newTierId);

          if (result.success) {
            setSuccessMessage(
              `Successfully switched to ${newTier.name} plan.`
            );
            if (refreshUser) await refreshUser();
            setTimeout(() => window.location.reload(), 1500);
          } else {
            throw new Error(result.error || "Failed to change plan");
          }
          setUpgrading(null);
          return;
        }

        // Case 3: No payment method for paid plan - redirect to add card
        if (!hasCard && newTier.requiresPayment) {
          navigate("/billing/add-card", {
            state: {
              tier: newTierId,
              returnTo: "/billing",
              isUpgrade: true,
            },
          });
          setUpgrading(null);
          return;
        }

        // Case 4: Actually change the plan
        let result;

        if (isUpgrade) {
          result = await safeApiCall("upgradeSubscription", newTierId);
          if (!result.success) {
            result = await safeApiCall("changePlan", newTierId);
          }
        } else {
          result = await safeApiCall("downgradeSubscription", newTierId);
          if (!result.success) {
            result = await safeApiCall("changePlan", newTierId);
          }
        }

        if (result.success) {
          // Check if Stripe checkout is needed
          if (result.data?.requires_checkout && result.data?.checkout_url) {
            window.location.href = result.data.checkout_url;
            return;
          }

          setSuccessMessage(
            `Successfully ${isUpgrade ? "upgraded to" : "downgraded to"} ${
              newTier.name
            } plan!`
          );

          if (refreshUser) await refreshUser();
          setTimeout(() => window.location.reload(), 1500);
        } else {
          throw new Error(
            result.error || `Failed to change to ${newTier.name} plan`
          );
        }
      } catch (err) {
        console.error("Plan change failed:", err);
        setError(
          err.message ||
            `Failed to change to ${newTier.name} plan. Please try again.`
        );
      } finally {
        setUpgrading(null);
      }
    },
    [upgrading, currentTierId, hasCard, navigate, refreshUser]
  );

  // ==========================================================================
  // INITIAL DATA LOAD
  // ==========================================================================
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    // Show success message from checkout
    if (fromCheckout && pendingTier) {
      setSuccessMessage(
        `Successfully upgraded to ${
          TIERS[pendingTier]?.name || pendingTier
        } plan! Your dashboard has been updated.`
      );
      window.history.replaceState({}, document.title);
    }

    const loadData = async () => {
      try {
        let cardStatus = false;

        if (hasCardOnFile !== undefined) {
          cardStatus = hasCardOnFile;
        }

        if (BotAPI && typeof BotAPI.getCardStatus === "function") {
          const status = await BotAPI.getCardStatus();
          cardStatus =
            cardStatus ||
            status?.has_card ||
            status?.has_card_on_file ||
            false;
        }

        if (BotAPI && typeof BotAPI.getActivationStatus === "function") {
          const activation = await BotAPI.getActivationStatus();
          cardStatus =
            cardStatus ||
            activation?.has_card_on_file ||
            activation?.billing_complete ||
            false;
        }

        setHasCard(cardStatus);
        setError(null);
      } catch (err) {
        console.error("Failed to load billing data:", err);
        setHasCard(false);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, navigate, hasCardOnFile, fromCheckout, pendingTier]);

  // ==========================================================================
  // AUTO-TRIGGER UPGRADE IF TIER WAS PRESELECTED FROM PRICING PAGE
  // ==========================================================================
  useEffect(() => {
    if (
      preselectedTier &&
      !loading &&
      user &&
      !autoUpgradeHandled &&
      preselectedTier !== currentTierId
    ) {
      setAutoUpgradeHandled(true);
      // Clear the state so refresh doesn't re-trigger
      window.history.replaceState({}, document.title);
      // Small delay to ensure component is fully rendered
      setTimeout(() => {
        handleChangePlan(preselectedTier);
      }, 300);
    }
  }, [
    preselectedTier,
    loading,
    user,
    autoUpgradeHandled,
    currentTierId,
    handleChangePlan,
  ]);

  // ==========================================================================
  // RENDER
  // ==========================================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
          <p className="text-gray-400">
            Manage your subscription, payment methods, and billing preferences
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-emerald-500/20 border border-emerald-500/50 rounded-xl p-4 text-emerald-300">
            <p className="font-semibold">✓ Success!</p>
            <p className="text-sm">{successMessage}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Error:</p>
                <p className="text-sm">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-300 hover:text-red-200 text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Current Plan Card */}
        <div
          className={`bg-gradient-to-r ${currentTier.color} rounded-2xl p-6 mb-8 shadow-xl`}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{currentTier.icon}</span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold">{currentTier.name}</h2>
                  {currentTier.badge && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        currentTier.badgeColor === "orange"
                          ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                          : currentTier.badgeColor === "purple"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : currentTier.badgeColor === "indigo"
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {currentTier.badge}
                    </span>
                  )}
                </div>
                <p className="text-white/80 text-lg font-semibold">
                  {typeof currentTier.price === "number"
                    ? `$${currentTier.price}/${currentTier.interval}`
                    : currentTier.price}
                </p>
                {currentTier.priceDetail && (
                  <p className="text-sm text-white/50">
                    {currentTier.priceDetail}
                  </p>
                )}
              </div>
            </div>

            {/* Payment Method Status */}
            <div className="bg-black/30 rounded-xl p-3">
              {hasCard ? (
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✅</span>
                  <span className="text-sm">Payment method on file</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">⚠️</span>
                  <span className="text-sm">No payment method</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Available Plans */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Available Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(TIERS).map(([key, tier]) => {
              const isCurrent = key === currentTierId;
              const currentPrice = getPrice(currentTierId);
              const tierPrice = getPrice(key);
              const isUpgrade = !isCurrent && tierPrice > currentPrice;
              const isEnterprise = key === "enterprise";

              return (
                <div
                  key={key}
                  className={`relative rounded-xl border overflow-hidden transition-all ${
                    isCurrent
                      ? "border-emerald-500/50 bg-gradient-to-br from-emerald-600/10 to-transparent ring-1 ring-emerald-500/30"
                      : "border-white/10 bg-white/5 hover:bg-white/10 hover:scale-[1.02] transition-transform"
                  }`}
                >
                  {tier.badge && !isCurrent && (
                    <div className="absolute top-3 right-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          tier.badgeColor === "orange"
                            ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                            : tier.badgeColor === "purple"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : tier.badgeColor === "indigo"
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {tier.badge}
                      </span>
                    </div>
                  )}

                  {isCurrent && (
                    <div className="absolute top-3 left-3">
                      <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full">
                        Current
                      </span>
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{tier.icon}</span>
                      <div>
                        <h4 className="text-lg font-bold">{tier.name}</h4>
                        <p className="text-xs text-white/50">
                          {tier.displayName}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-baseline gap-1">
                        {typeof tier.price === "number" ? (
                          <>
                            <span className="text-2xl font-bold">
                              ${tier.price}
                            </span>
                            <span className="text-sm text-white/50">
                              /{tier.interval}
                            </span>
                          </>
                        ) : (
                          <span className="text-xl font-bold">
                            {tier.price}
                          </span>
                        )}
                      </div>
                      {key === "starter" && (
                        <p className="text-xs text-emerald-400 mt-1">
                          No credit card required
                        </p>
                      )}
                    </div>

                    <ul className="space-y-2 mb-6">
                      {tier.features.slice(0, 3).map((feature, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="text-emerald-400 mt-0.5">✓</span>
                          <span className="text-white/70">{feature}</span>
                        </li>
                      ))}
                      {tier.features.length > 3 && (
                        <li className="text-xs text-white/40 mt-1">
                          +{tier.features.length - 3} more features
                        </li>
                      )}
                    </ul>

                    {!isCurrent && !isEnterprise && (
                      <button
                        onClick={() => handleChangePlan(key)}
                        disabled={upgrading === key}
                        className={`w-full py-2 rounded-lg font-semibold transition-all ${
                          isUpgrade
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                            : "bg-gray-700 hover:bg-gray-600 text-white"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {upgrading === key ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processing...
                          </span>
                        ) : isUpgrade ? (
                          `Upgrade to ${tier.name} →`
                        ) : (
                          `Switch to ${tier.name} →`
                        )}
                      </button>
                    )}

                    {isEnterprise && !isCurrent && (
                      <a
                        href="mailto:sales@imali-defi.com?subject=Enterprise%20Plan%20Inquiry"
                        className="block w-full py-2 rounded-lg font-semibold text-center bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg"
                      >
                        Contact Sales →
                      </a>
                    )}

                    {isCurrent && (
                      <div className="w-full py-2 text-center text-sm text-white/40 border border-white/10 rounded-lg">
                        Your current plan
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Method Section */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>💳</span> Payment Method
          </h3>

          {hasCard ? (
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💳</span>
                <div>
                  <p className="font-medium">Card on file</p>
                  <p className="text-sm text-white/50">
                    Your payment method is ready for billing
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/billing/add-card")}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Update Payment Method →
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-white/50 mb-3">No payment method on file</p>
              <button
                onClick={() => navigate("/billing/add-card")}
                className="px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700 transition"
              >
                Add Payment Method →
              </button>
              <p className="text-xs text-white/40 mt-3">
                You won't be charged until you upgrade to a paid plan
              </p>
            </div>
          )}
        </div>

        {/* Cancel Subscription */}
        {currentTierId !== "starter" && currentTierId !== "enterprise" && (
          <div className="mt-6 bg-red-500/5 rounded-xl p-6 border border-red-500/20">
            <h3 className="text-lg font-semibold mb-2 text-red-400">
              Cancel Subscription
            </h3>
            <p className="text-sm text-white/50 mb-4">
              Your subscription will remain active until the end of the billing
              period. You can reactivate anytime.
            </p>
            <button
              onClick={async () => {
                if (
                  window.confirm(
                    "Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period."
                  )
                ) {
                  const result = await safeApiCall("cancelSubscription");
                  if (result.success) {
                    setSuccessMessage(
                      "Cancellation request submitted. Your plan will end at the billing period."
                    );
                    if (refreshUser) await refreshUser();
                    setTimeout(() => window.location.reload(), 1500);
                  } else {
                    setError(
                      "Failed to cancel subscription. Please contact support."
                    );
                  }
                }
              }}
              className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition"
            >
              Request Cancellation →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
