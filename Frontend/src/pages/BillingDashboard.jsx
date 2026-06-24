// imali/Frontend/src/pages/BillingDashboard.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const VALID_TIERS = ["starter", "pro", "elite", "enterprise"];

function normalizeTier(value) {
  const tier = String(value || "starter").toLowerCase().trim();
  return VALID_TIERS.includes(tier) ? tier : "starter";
}

// ✅ Optional fetch that doesn't throw on 404
async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.message || result?.error || `Failed to load ${url}`
    );
  }

  return result?.data || result;
}

async function fetchJsonOptional(url, fallback = {}) {
  try {
    return await fetchJson(url);
  } catch (err) {
    console.warn(`[BillingDashboard] Optional endpoint unavailable: ${url}`, err);
    return fallback;
  }
}

export default function BillingDashboard() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cardStatus, setCardStatus] = useState({});
  const [activation, setActivation] = useState({});
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ FIX: Get tier from URL first, then state, then localStorage, then user/activation
  const urlTier = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tier") || params.get("plan");
  }, [location.search]);

  const selectedTier = useMemo(() => {
    const tier =
      urlTier ||
      location.state?.tier ||
      localStorage.getItem("IMALI_SELECTED_TIER") ||
      user?.tier ||
      activation?.tier ||
      "starter";
    return normalizeTier(tier);
  }, [urlTier, location.state?.tier, user?.tier, activation?.tier]);

  // ✅ Persist tier to localStorage
  useEffect(() => {
    if (selectedTier) {
      localStorage.setItem("IMALI_SELECTED_TIER", selectedTier);
    }
  }, [selectedTier]);

  const currentTier = selectedTier;

  const realHasCard =
    cardStatus?.has_card === true ||
    cardStatus?.has_card_on_file === true ||
    activation?.has_card_on_file === true;

  const getTierDisplayName = (tierValue) => {
    const names = {
      starter: "Starter",
      pro: "Pro",
      elite: "Elite",
      enterprise: "Enterprise",
    };

    const value = normalizeTier(tierValue || "starter");
    return names[value] || value.charAt(0).toUpperCase() + value.slice(1);
  };

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // ✅ FIX: Use fetchJsonOptional for activation endpoint
      const [cardRes, activationRes, subscriptionRes] = await Promise.allSettled([
        fetchJsonOptional("/api/billing/card-status", {}),
        fetchJsonOptional("/api/activation/status", {}),
        fetchJsonOptional("/api/billing/subscription", null),
      ]);

      if (cardRes.status === "fulfilled") setCardStatus(cardRes.value || {});
      if (activationRes.status === "fulfilled") setActivation(activationRes.value || {});
      if (subscriptionRes.status === "fulfilled") setSubscriptionDetails(subscriptionRes.value || null);
    } catch (err) {
      setError(err?.message || "Failed to load billing information.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    loadBilling();
  }, [user, navigate, loadBilling]);

  const handleUpdateCard = () => {
    navigate("/billing", {
      state: {
        updateCard: true,
        tier: currentTier === "starter" ? "pro" : currentTier,
      },
    });
  };

  const handleRemoveCard = async () => {
    if (!realHasCard) return;

    const confirmed = window.confirm("Remove your payment method?");
    if (!confirmed) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await fetchJson("/api/billing/remove-card", {
        method: "POST",
      });
      setSuccess("Payment method removed.");
      await refreshUser?.();
      await loadBilling();
    } catch (err) {
      setError(err?.message || "Failed to remove payment method.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading billing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.10),transparent_30%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.08),transparent_35%)]" />

      <div className="relative max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm text-emerald-300 font-semibold tracking-wide">
              IMALI BILLING
            </p>
            <h1 className="text-3xl font-bold mt-1">Billing & Subscription</h1>
            <p className="text-gray-400 mt-2">
              Manage your plan and payment method.
            </p>
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 font-medium"
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-300">
            ✅ {success}
          </div>
        )}

        <section className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold">💳 Payment Method</h2>
              <p className="text-sm text-gray-400 mt-1">
                {currentTier === "starter"
                  ? "Starter plan - no payment required"
                  : `${getTierDisplayName(currentTier)} Plan`}
              </p>
            </div>

            {currentTier !== "starter" && currentTier !== "enterprise" && (
              <div className="flex gap-3">
                <button
                  onClick={handleUpdateCard}
                  disabled={busy}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium disabled:opacity-50 transition"
                >
                  {realHasCard ? "Update Card" : "Add Card"}
                </button>

                {realHasCard && (
                  <button
                    onClick={handleRemoveCard}
                    disabled={busy}
                    className="px-4 py-2 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-red-300 border border-red-800/50 disabled:opacity-50 transition"
                  >
                    {busy ? "Removing..." : "Remove Card"}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-700/50 bg-gray-800/30 p-4">
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full ${
                  realHasCard ? "bg-green-500 shadow-lg shadow-green-500/30" : "bg-gray-500"
                }`}
              />

              <span className="font-medium">
                {realHasCard
                  ? "✅ Payment method on file"
                  : currentTier === "starter"
                  ? "No payment method required"
                  : currentTier === "enterprise"
                  ? "Enterprise billing handled by sales"
                  : "No payment method on file"}
              </span>
            </div>

            <p className="mt-3 text-sm text-gray-400">
              {realHasCard
                ? "Your card is active and ready for billing."
                : currentTier === "starter"
                ? "You can use Starter without adding a card."
                : currentTier === "enterprise"
                ? "Enterprise accounts are approved and billed manually."
                : "Add a payment method to activate your subscription."}
            </p>
          </div>

          {realHasCard && subscriptionDetails && currentTier !== "starter" && (
            <div className="mt-4 rounded-xl border border-gray-700 bg-gray-800/50 p-4">
              <h3 className="font-medium mb-3 text-white">Current Plan</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Plan:</span>
                  <span className="text-white">{subscriptionDetails.plan || getTierDisplayName(currentTier)}</span>
                </div>

                {subscriptionDetails.amount && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Price:</span>
                    <span className="text-white">
                      {(subscriptionDetails.currency || "usd").toUpperCase()} $
                      {(subscriptionDetails.amount / 100).toFixed(2)} /{" "}
                      {subscriptionDetails.interval || "month"}
                    </span>
                  </div>
                )}

                {subscriptionDetails.status && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span
                      className={`capitalize ${
                        subscriptionDetails.status === "active"
                          ? "text-green-400"
                          : subscriptionDetails.status === "past_due"
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {String(subscriptionDetails.status).replace("_", " ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-800 bg-white/5 p-6">
          <h2 className="text-lg font-semibold mb-3">Plan Actions</h2>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                navigate(`/pricing?selected=${currentTier}`, {
                  state: { tier: currentTier },
                });
              }}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition"
            >
              Change Plan
            </button>

            <button
              onClick={() => navigate("/activation", { state: { tier: currentTier } })}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition"
            >
              Continue Setup
            </button>

            <button
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </section>

        {process.env.NODE_ENV === "development" && (
          <details className="rounded-xl border border-gray-800 bg-black/40 p-4 text-xs text-gray-400">
            <summary className="cursor-pointer hover:text-gray-300">Debug Information</summary>
            <pre className="mt-3 overflow-auto">
              {JSON.stringify(
                {
                  realHasCard,
                  currentTier,
                  selectedTier,
                  localStorageTier: localStorage.getItem("IMALI_SELECTED_TIER"),
                  cardStatus,
                  activation,
                  subscriptionDetails,
                  userTier: user?.tier,
                },
                null,
                2
              )}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
