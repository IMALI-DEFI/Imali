// src/pages/BillingDashboard.jsx - REWRITTEN (Starter/Pro/Elite only, fixed Tailwind classes, clean tier map)
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

// ============================================================================
// TIER CONFIGURATION — only Starter, Pro, Elite, Enterprise
// ============================================================================
const TIERS = {
  starter: {
    id: "starter", name: "Starter", displayName: "Free Trial",
    price: 0, interval: "7-day trial",
    profitShare: null,
    features: ["$1,000 paper trading credits", "Test all bots risk-free", "Stock & crypto trading demo", "No credit card required", "Email support"],
    color: "from-emerald-600 to-emerald-700", icon: "🌱", badge: "Free Trial", badgeColor: "green", requiresPayment: false,
  },
  pro: {
    id: "pro", name: "Pro", displayName: "Pro",
    price: 19, interval: "month",
    profitShare: 10,
    features: ["Live trading enabled", "All stocks & crypto bots", "Advanced strategies", "Priority support", "API access", "Up to 5 active bots"],
    color: "from-blue-600 to-blue-700", icon: "⭐", badge: "Most Popular", badgeColor: "orange", requiresPayment: true,
  },
  elite: {
    id: "elite", name: "Elite", displayName: "Elite",
    price: 49, interval: "month",
    profitShare: 8,
    features: ["Everything in Pro", "DEX trading", "Custom indicators", "Priority execution", "Up to 10 active bots", "24/7 priority support"],
    color: "from-purple-600 to-purple-700", icon: "👑", badge: "Power User", badgeColor: "purple", requiresPayment: true,
  },
  enterprise: {
    id: "enterprise", name: "Enterprise", displayName: "Enterprise",
    price: "Custom", interval: "", priceDetail: "Volume-based pricing",
    profitShare: "Custom",
    features: ["Everything in Elite", "Custom branded dashboard", "Dedicated account manager", "Team management", "Custom bot development", "White-label", "SLAs"],
    color: "from-indigo-600 to-purple-600", icon: "🏢", badge: "Teams & Orgs", badgeColor: "indigo", requiresPayment: false, isEnterprise: true,
  },
};

// Tier name mapping from DB values to frontend keys
const DB_TIER_MAP = {
  starter: "starter",
  pro: "pro",
  elite: "elite",
  enterprise: "enterprise",
  // Legacy mappings (if DB still has old values)
  common: "pro",
  rare: "elite",
};

// Fixed Tailwind class maps (no dynamic class generation)
const BADGE_CLASSES = {
  green: "bg-green-500/20 text-green-300 border-green-500/30",
  orange: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  purple: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  indigo: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
};

const TOKEN_DISCOUNTS = {
  none: { discount: 0, label: "No token" },
  bronze: { discount: 5, label: "100 IMALI" },
  silver: { discount: 10, label: "500 IMALI" },
  gold: { discount: 15, label: "1,000 IMALI" },
  platinum: { discount: 20, label: "5,000 IMALI" },
};

const PROFIT_SHARE_TOKEN_BOOST = {
  none: { boost: 0, label: "No token" },
  bronze: { boost: 1, label: "100 IMALI" },
  silver: { boost: 2, label: "500 IMALI" },
  gold: { boost: 3, label: "1,000 IMALI" },
  platinum: { boost: 5, label: "5,000 IMALI" },
};

const getPrice = (tierId) => {
  const tier = TIERS[tierId];
  if (!tier || tier.isEnterprise) return Infinity;
  return typeof tier.price === "number" ? tier.price : Infinity;
};

const safeApiCall = async (method, ...args) => {
  if (!BotAPI || typeof BotAPI[method] !== "function") {
    return { success: false, error: `${method} not available`, demoMode: true };
  }
  try {
    const result = await BotAPI[method](...args);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export default function BillingDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser, hasCardOnFile, activation } = useAuth();

  const [loading, setLoading] = useState(true);
  const [hasCard, setHasCard] = useState(false);
  const [upgrading, setUpgrading] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [autoUpgradeHandled, setAutoUpgradeHandled] = useState(false);

  const [billingModel, setBillingModel] = useState(user?.billingModel || "fixed");
  const [profitSharePct, setProfitSharePct] = useState(user?.profitSharePct || null);
  const [tokenTier, setTokenTier] = useState(user?.tokenTier || "none");

  const currentTierId = DB_TIER_MAP[user?.tier] || user?.tier || "starter";
  const currentTier = TIERS[currentTierId] || TIERS.starter;

  const fromCheckout = location.state?.fromCheckout || location.search.includes("checkout=success");
  const pendingTier = location.state?.pendingTier || null;
  const preselectedTier = location.state?.selectedTier || null;

  const handleChangePlan = useCallback(async (newTierId, newBillingModel = null, newProfitSharePct = null) => {
    if (upgrading) return;
    if (!TIERS[newTierId]) { setError(`Invalid plan: "${newTierId}"`); return; }
    if (newTierId === currentTierId && !newBillingModel) { setError(`You are already on the ${TIERS[newTierId].name} plan.`); return; }

    const newTier = TIERS[newTierId];
    const currentPrice = getPrice(currentTierId);
    const newPrice = getPrice(newTierId);
    const isUpgrade = newPrice > currentPrice;
    const model = newBillingModel || billingModel;
    const pct = newProfitSharePct || profitSharePct || newTier.profitShare;

    setUpgrading(newTierId);
    setError(null);
    setSuccessMessage(null);

    try {
      if (newTierId === "enterprise") {
        window.location.href = "mailto:sales@imali-defi.com?subject=Enterprise%20Plan";
        setUpgrading(null);
        return;
      }
      if (newTierId === "starter") {
        const result = await safeApiCall("changePlan", newTierId, model, null);
        if (result.success) {
          setSuccessMessage(`Switched to ${newTier.name} plan.`);
          if (refreshUser) await refreshUser();
          setTimeout(() => window.location.reload(), 1500);
        } else throw new Error(result.error || "Failed to change plan");
        setUpgrading(null);
        return;
      }
      if (!hasCard && newTier.requiresPayment) {
        navigate(`/billing?tier=${newTierId}`, {
          state: { tier: newTierId, billingModel: model, profitSharePct: pct, returnTo: "/billing-dashboard" },
        });
        setUpgrading(null);
        return;
      }
      const result = await safeApiCall("changePlan", newTierId, model, model === "profit_share" ? pct : null);
      if (result.success) {
        setBillingModel(model);
        if (model === "profit_share") setProfitSharePct(pct);
        setSuccessMessage(`${isUpgrade ? "Upgraded to" : "Switched to"} ${newTier.name} plan!`);
        if (refreshUser) await refreshUser();
        setTimeout(() => window.location.reload(), 1500);
      } else throw new Error(result.error || `Failed to change plan`);
    } catch (err) {
      setError(err.message || "Failed to change plan.");
    } finally {
      setUpgrading(null);
    }
  }, [upgrading, currentTierId, billingModel, profitSharePct, hasCard, navigate, refreshUser]);

  const handleBillingModelSwitch = async (model) => {
    if (model === billingModel) return;
    setError(null);
    setSuccessMessage(null);
    if (model === "profit_share" && !hasCard) {
      navigate(`/billing?tier=${currentTierId}`, {
        state: { tier: currentTierId, billingModel: "profit_share", profitSharePct: currentTier.profitShare },
      });
      return;
    }
    const pct = model === "profit_share" ? (currentTier.profitShare || 10) : null;
    await handleChangePlan(currentTierId, model, pct);
  };

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (fromCheckout && pendingTier) {
      setSuccessMessage(`Successfully upgraded to ${TIERS[pendingTier]?.name || pendingTier} plan!`);
      window.history.replaceState({}, document.title);
    }
    const loadData = async () => {
      try {
        let cardStatus = hasCardOnFile || false;
        if (BotAPI?.getCardStatus) {
          const status = await BotAPI.getCardStatus();
          cardStatus = cardStatus || status?.has_card || status?.has_card_on_file || false;
        }
        if (BotAPI?.getActivationStatus) {
          const act = await BotAPI.getActivationStatus();
          cardStatus = cardStatus || act?.has_card_on_file || act?.billing_complete || false;
        }
        setHasCard(cardStatus);
        if (user?.billingModel) setBillingModel(user.billingModel);
        if (user?.profitSharePct) setProfitSharePct(user.profitSharePct);
        if (user?.tokenTier) setTokenTier(user.tokenTier);
        setError(null);
      } catch (err) { console.error("Failed to load billing data:", err); }
      finally { setLoading(false); }
    };
    loadData();
  }, [user, navigate, hasCardOnFile, fromCheckout, pendingTier]);

  useEffect(() => {
    if (preselectedTier && !loading && user && !autoUpgradeHandled && preselectedTier !== currentTierId) {
      setAutoUpgradeHandled(true);
      window.history.replaceState({}, document.title);
      setTimeout(() => handleChangePlan(preselectedTier), 300);
    }
  }, [preselectedTier, loading, user, autoUpgradeHandled, currentTierId, handleChangePlan]);

  const effectiveMonthlyPrice = () => {
    if (currentTier.isEnterprise || typeof currentTier.price !== "number") return null;
    const discount = TOKEN_DISCOUNTS[tokenTier]?.discount || 0;
    if (billingModel === "profit_share") return null;
    return Math.round(currentTier.price * (1 - discount / 100));
  };

  const effectiveProfitShare = () => {
    if (!currentTier.profitShare || typeof currentTier.profitShare !== "number") return null;
    const boost = PROFIT_SHARE_TOKEN_BOOST[tokenTier]?.boost || 0;
    return Math.max(5, currentTier.profitShare - boost);
  };

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
          <p className="text-gray-400">Manage your subscription, payment methods, and billing preferences</p>
        </div>

        {successMessage && (
          <div className="mb-6 bg-emerald-500/20 border border-emerald-500/50 rounded-xl p-4 text-emerald-300">
            <p className="font-semibold">✓ Success!</p>
            <p className="text-sm">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-300">
            <div className="flex items-center justify-between">
              <div><p className="font-semibold">Error:</p><p className="text-sm">{error}</p></div>
              <button onClick={() => setError(null)} className="text-red-300 hover:text-red-200 text-xl leading-none">×</button>
            </div>
          </div>
        )}

        {/* Current Plan */}
        <div className={`bg-gradient-to-r ${currentTier.color} rounded-2xl p-6 mb-8 shadow-xl`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{currentTier.icon}</span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold">{currentTier.name}</h2>
                  {currentTier.badge && (
                    <span className={`text-xs px-2 py-1 rounded-full ${BADGE_CLASSES[currentTier.badgeColor] || "bg-white/10 text-white/70 border-white/20"}`}>
                      {currentTier.badge}
                    </span>
                  )}
                </div>
                {billingModel === "profit_share" && effectiveProfitShare() ? (
                  <div>
                    <p className="text-white/80 text-lg font-semibold">{effectiveProfitShare()}% profit share</p>
                    <p className="text-sm text-white/60">above 3% monthly return</p>
                  </div>
                ) : effectiveMonthlyPrice() !== null ? (
                  <div className="flex items-baseline gap-1">
                    {tokenTier !== "none" && <span className="text-sm text-white/50 line-through">${currentTier.price}</span>}
                    <p className="text-white/80 text-lg font-semibold">${effectiveMonthlyPrice()}/{currentTier.interval}</p>
                  </div>
                ) : (
                  <p className="text-white/80 text-lg font-semibold">
                    {typeof currentTier.price === "number" ? `$${currentTier.price}/${currentTier.interval}` : currentTier.price}
                  </p>
                )}
                {currentTier.priceDetail && <p className="text-sm text-white/50">{currentTier.priceDetail}</p>}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="bg-black/30 rounded-xl p-3">
                {hasCard ? (
                  <div className="flex items-center gap-2"><span className="text-green-400">✅</span><span className="text-sm">Payment method on file</span></div>
                ) : (
                  <div className="flex items-center gap-2"><span className="text-yellow-400">⚠️</span><span className="text-sm">No payment method</span></div>
                )}
              </div>
              {tokenTier !== "none" && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 text-xs text-amber-300 text-center">
                  🎉 {TOKEN_DISCOUNTS[tokenTier]?.label} discount active
                </div>
              )}
            </div>
          </div>

          {currentTier.requiresPayment && currentTier.profitShare && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-sm text-white/60 mb-2">Billing Model:</p>
              <div className="flex gap-2">
                <button onClick={() => handleBillingModelSwitch("fixed")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${billingModel === "fixed" ? "bg-white/20 text-white ring-1 ring-white/30" : "bg-black/30 text-white/60 hover:bg-black/50"}`}>
                  Fixed Monthly {effectiveMonthlyPrice() !== null && `($${effectiveMonthlyPrice()}/mo)`}
                </button>
                <button onClick={() => handleBillingModelSwitch("profit_share")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${billingModel === "profit_share" ? "bg-white/20 text-white ring-1 ring-white/30" : "bg-black/30 text-white/60 hover:bg-black/50"}`}>
                  Profit Share ({effectiveProfitShare()}%)
                </button>
              </div>
              {billingModel === "profit_share" && (
                <p className="text-xs text-white/50 mt-2">
                  💡 You keep 100% of first 3% monthly return. We take {effectiveProfitShare()}% of profits above that. $0 when you don't profit.
                </p>
              )}
            </div>
          )}
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
              const discountedPrice = tokenTier !== "none" && typeof tier.price === "number"
                ? Math.round(tier.price * (1 - (TOKEN_DISCOUNTS[tokenTier]?.discount || 0) / 100)) : tier.price;
              const displayProfitShare = tier.profitShare && tokenTier !== "none"
                ? Math.max(5, tier.profitShare - (PROFIT_SHARE_TOKEN_BOOST[tokenTier]?.boost || 0)) : tier.profitShare;

              return (
                <div key={key} className={`relative rounded-xl border overflow-hidden transition-all ${
                  isCurrent ? "border-emerald-500/50 bg-gradient-to-br from-emerald-600/10 to-transparent ring-1 ring-emerald-500/30" : "border-white/10 bg-white/5 hover:bg-white/10 hover:scale-[1.02]"
                }`}>
                  {tier.badge && !isCurrent && (
                    <div className="absolute top-3 right-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70 border border-white/20">{tier.badge}</span>
                    </div>
                  )}
                  {isCurrent && <div className="absolute top-3 left-3"><span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full">Current</span></div>}
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{tier.icon}</span>
                      <div><h4 className="text-lg font-bold">{tier.name}</h4><p className="text-xs text-white/50">{tier.displayName}</p></div>
                    </div>
                    <div className="mb-4">
                      {typeof tier.price === "number" ? (
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-1"><span className="text-xl font-bold">${discountedPrice}</span><span className="text-xs text-white/50">/mo fixed</span></div>
                          {displayProfitShare && <div className="text-xs text-white/50">or <span className="text-white/70 font-semibold">{displayProfitShare}%</span> profit share</div>}
                        </div>
                      ) : <span className="text-xl font-bold">{tier.price}</span>}
                    </div>
                    <ul className="space-y-2 mb-6">
                      {tier.features.slice(0, 4).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm"><span className="text-emerald-400 mt-0.5">✓</span><span className="text-white/70">{feature}</span></li>
                      ))}
                    </ul>
                    {!isCurrent && !isEnterprise && (
                      <button onClick={() => handleChangePlan(key)} disabled={upgrading === key}
                        className={`w-full py-2 rounded-lg font-semibold transition-all ${isUpgrade ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white" : "bg-gray-700 hover:bg-gray-600 text-white"} disabled:opacity-50 disabled:cursor-not-allowed`}>
                        {upgrading === key ? "Processing..." : isUpgrade ? `Upgrade to ${tier.name} →` : `Switch to ${tier.name} →`}
                      </button>
                    )}
                    {isEnterprise && !isCurrent && (
                      <a href="mailto:sales@imali-defi.com" className="block w-full py-2 rounded-lg font-semibold text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white">Contact Sales →</a>
                    )}
                    {isCurrent && <div className="w-full py-2 text-center text-sm text-white/40 border border-white/10 rounded-lg">Your current plan</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
          <h3 className="text-lg font-semibold mb-4">💳 Payment Method</h3>
          {hasCard ? (
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div><p className="font-medium">Card on file</p><p className="text-sm text-white/50">Your payment method is ready</p></div>
              <button onClick={() => navigate("/billing")} className="text-sm text-blue-400 hover:text-blue-300">Update →</button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-white/50 mb-3">No payment method on file</p>
              <button onClick={() => navigate("/billing")} className="px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700 transition">Add Payment Method →</button>
            </div>
          )}
        </div>

        {/* Token Discounts */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
          <h3 className="text-lg font-semibold mb-4">🪙 IMALI Token Discounts</h3>
          <p className="text-sm text-white/50 mb-4">Hold IMALI tokens to reduce your subscription costs. Discounts apply automatically.</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {Object.entries(TOKEN_DISCOUNTS).map(([key, val]) => (
              <div key={key} className={`rounded-lg p-3 text-center border ${tokenTier === key ? "border-amber-500/50 bg-amber-500/10" : "border-white/10 bg-black/30"}`}>
                <p className="text-sm font-semibold">{val.label}</p>
                <p className="text-xs text-amber-400">{val.discount}% off</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cancel */}
        {currentTierId !== "starter" && currentTierId !== "enterprise" && (
          <div className="mt-6 bg-red-500/5 rounded-xl p-6 border border-red-500/20">
            <h3 className="text-lg font-semibold mb-2 text-red-400">Cancel Subscription</h3>
            <p className="text-sm text-white/50 mb-4">Your subscription will remain active until the end of the billing period.</p>
            <button
              onClick={async () => {
                if (window.confirm("Are you sure you want to cancel?")) {
                  const result = await safeApiCall("cancelSubscription");
                  if (result.success) { setSuccessMessage("Cancellation submitted."); if (refreshUser) await refreshUser(); setTimeout(() => window.location.reload(), 1500); }
                  else setError("Failed to cancel. Please contact support.");
                }
              }}
              className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition">Request Cancellation →</button>
          </div>
        )}
      </div>
    </div>
  );
}
