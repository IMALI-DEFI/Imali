// imali/Frontend/src/pages/Billing.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import CardUpdateForm from "./CardUpdateForm";

const VALID_TIERS = ["starter", "pro", "elite", "enterprise"];

const TIER_META = {
  starter: {
    label: "Starter",
    icon: "🌱",
    price: "Free",
    description: "Paper trading and beginner tools. No payment required.",
  },
  pro: {
    label: "Pro",
    icon: "⭐",
    price: "$19/mo",
    description: "Live crypto and stock trading with advanced signals.",
  },
  elite: {
    label: "Elite",
    icon: "👑",
    price: "$49/mo",
    description: "Crypto, DEX, futures, wallet tools, and advanced automation.",
  },
  enterprise: {
    label: "Enterprise",
    icon: "🏢",
    price: "Custom",
    description: "Custom pricing, team management, and dedicated support.",
  },
};

function normalizeTier(value) {
  const tier = String(value || "starter").toLowerCase().trim();
  return VALID_TIERS.includes(tier) ? tier : "starter";
}

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

export default function Billing() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cardStatus, setCardStatus] = useState({});
  const [activation, setActivation] = useState({});
  const [subscription, setSubscription] = useState(null);
  const [showUpdateCard, setShowUpdateCard] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const urlTier = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tier") || params.get("plan");
  }, [location.search]);

  const currentTier = normalizeTier(
    urlTier ||
      location.state?.tier ||
      user?.tier ||
      activation?.tier ||
      "starter"
  );

  const tierMeta = TIER_META[currentTier] || TIER_META.starter;

  const realHasCard =
    cardStatus?.has_card === true ||
    cardStatus?.has_card_on_file === true ||
    activation?.has_card_on_file === true;

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [cardRes, activationRes, subscriptionRes] =
        await Promise.allSettled([
          fetchJson("/api/billing/card-status"),
          fetchJson("/api/activation/status"),
          fetchJson("/api/billing/subscription"),
        ]);

      setCardStatus(cardRes.status === "fulfilled" ? cardRes.value || {} : {});
      setActivation(
        activationRes.status === "fulfilled" ? activationRes.value || {} : {}
      );
      setSubscription(
        subscriptionRes.status === "fulfilled" ? subscriptionRes.value || null : null
      );

      if (location.state?.updateCard === true) {
        setShowUpdateCard(true);
      }
    } catch (err) {
      setError(err?.message || "Failed to load billing information.");
    } finally {
      setLoading(false);
    }
  }, [location.state?.updateCard]);

  useEffect(() => {
    if (!user) {
      navigate("/login", {
        replace: true,
        state: { from: "/billing" },
      });
      return;
    }

    loadBilling();
  }, [user, navigate, loadBilling]);

  const handleUpdateCard = () => {
    setShowUpdateCard(true);

    navigate("/billing", {
      replace: true,
      state: {
        updateCard: true,
        tier: currentTier === "starter" ? "pro" : currentTier,
      },
    });
  };

  const handleCancelUpdate = () => {
    setShowUpdateCard(false);

    navigate("/billing", {
      replace: true,
      state: {
        tier: currentTier,
      },
    });
  };

  const handleCardUpdateSuccess = async () => {
    setShowUpdateCard(false);
    setNotice("Payment method saved successfully.");

    await refreshUser?.();
    await loadBilling();

    navigate("/billing", {
      replace: true,
      state: {
        tier: currentTier,
      },
    });
  };

  const handleRemoveCard = async () => {
    if (!realHasCard) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove your payment method?"
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await fetchJson("/api/billing/remove-card", {
        method: "POST",
      });

      setNotice("Payment method removed successfully.");
      await refreshUser?.();
      await loadBilling();
    } catch (err) {
      setError(err?.message || "Failed to remove payment method.");
    } finally {
      setBusy(false);
    }
  };

  const cardFormTier = currentTier === "starter" ? "pro" : currentTier;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white px-4 py-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_30%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.10),transparent_35%)]" />

      <div className="relative max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm text-emerald-300 font-semibold tracking-wide">
              IMALI BILLING
            </p>
            <h1 className="text-3xl md:text-4xl font-black mt-1">
              Billing & Subscription
            </h1>
            <p className="text-white/50 mt-2">
              Manage your plan, payment method, and subscription status.
            </p>
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 font-bold"
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
            ⚠️ {error}
          </div>
        )}

        {notice && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-200">
            ✅ {notice}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl">
            <div className="text-5xl mb-4">{tierMeta.icon}</div>
            <h2 className="text-2xl font-black">{tierMeta.label} Plan</h2>
            <p className="text-white/50 mt-2">{tierMeta.description}</p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
              <p className="text-sm text-white/40">Current Price</p>
              <p className="text-3xl font-black mt-1">{tierMeta.price}</p>
            </div>

            <div className="mt-6 grid gap-3">
              <button
                onClick={() => navigate("/pricing")}
                className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-5 py-3 font-black"
              >
                Change Plan
              </button>

              {currentTier === "enterprise" && (
                <a
                  href="mailto:sales@imali-defi.com"
                  className="w-full text-center rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 font-black"
                >
                  Contact Sales
                </a>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold">💳 Payment Method</h2>
                <p className="text-sm text-white/50 mt-1">
                  {currentTier === "starter"
                    ? "Starter does not require a payment method."
                    : realHasCard
                    ? "Your payment method is connected."
                    : "Add a payment method to activate billing."}
                </p>
              </div>

              {currentTier !== "starter" && currentTier !== "enterprise" && (
                <div className="flex gap-3">
                  <button
                    onClick={handleUpdateCard}
                    disabled={busy}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold disabled:opacity-50"
                  >
                    {realHasCard ? "Update Card" : "Add Card"}
                  </button>

                  {realHasCard && (
                    <button
                      onClick={handleRemoveCard}
                      disabled={busy}
                      className="px-4 py-2 rounded-xl bg-red-900/60 hover:bg-red-800/60 text-red-200 border border-red-700/50 font-semibold disabled:opacity-50"
                    >
                      {busy ? "Removing..." : "Remove"}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full ${
                    realHasCard ? "bg-emerald-400" : "bg-gray-500"
                  }`}
                />

                <p className="font-bold">
                  {realHasCard
                    ? "Payment method on file"
                    : currentTier === "starter"
                    ? "No payment method required"
                    : currentTier === "enterprise"
                    ? "Enterprise billing handled by sales"
                    : "No payment method on file"}
                </p>
              </div>

              <p className="text-sm text-white/50 mt-3">
                {realHasCard
                  ? "Your card is ready for subscription billing."
                  : currentTier === "starter"
                  ? "Starter users can continue without a card."
                  : currentTier === "enterprise"
                  ? "Enterprise accounts are approved and billed manually."
                  : "Add a card to continue activation."}
              </p>
            </div>

            {subscription && realHasCard && currentTier !== "starter" && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5">
                <h3 className="font-bold mb-4">Subscription Details</h3>

                <div className="space-y-3 text-sm">
                  <InfoRow
                    label="Plan"
                    value={subscription.plan || tierMeta.label}
                  />

                  {subscription.amount && (
                    <InfoRow
                      label="Price"
                      value={`${(
                        subscription.currency || "usd"
                      ).toUpperCase()} $${(subscription.amount / 100).toFixed(
                        2
                      )} / ${subscription.interval || "month"}`}
                    />
                  )}

                  {subscription.status && (
                    <InfoRow
                      label="Status"
                      value={String(subscription.status).replace("_", " ")}
                      valueClass={
                        subscription.status === "active"
                          ? "text-emerald-300"
                          : subscription.status === "past_due"
                          ? "text-red-300"
                          : "text-yellow-300"
                      }
                    />
                  )}
                </div>
              </div>
            )}

            {showUpdateCard && (
              <div className="mt-6 border-t border-white/10 pt-6">
                <CardUpdateForm
                  onSuccess={handleCardUpdateSuccess}
                  onCancel={handleCancelUpdate}
                  tier={cardFormTier}
                />
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-xl font-black mb-4">Setup Progress</h2>

          <div className="grid gap-4 md:grid-cols-3">
            <ProgressStep
              done={currentTier === "starter" || realHasCard}
              number="1"
              title="Billing"
              description={
                currentTier === "starter"
                  ? "No card required"
                  : realHasCard
                  ? "Payment method saved"
                  : "Add payment method"
              }
            />

            <ProgressStep
              done={activation?.okx_connected || activation?.alpaca_connected}
              number="2"
              title="Connect Accounts"
              description="OKX or Alpaca connection"
            />

            <ProgressStep
              done={activation?.trading_enabled}
              number="3"
              title="Enable Trading"
              description="Start bot automation"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/activation", { state: { tier: currentTier } })}
              className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-black"
            >
              Continue Activation
            </button>

            <button
              onClick={() => navigate("/dashboard")}
              className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 font-black"
            >
              Go to Dashboard
            </button>
          </div>
        </section>

        {process.env.NODE_ENV === "development" && (
          <details className="rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-white/50">
            <summary className="cursor-pointer">Debug Information</summary>
            <pre className="mt-3 overflow-auto">
              {JSON.stringify(
                {
                  currentTier,
                  realHasCard,
                  cardStatus,
                  activation,
                  subscription,
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

function InfoRow({ label, value, valueClass = "text-white" }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-white/40">{label}</span>
      <span className={`font-semibold capitalize text-right ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

function ProgressStep({ done, number, title, description }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        done
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-white/10 bg-black/30"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-black ${
            done ? "bg-emerald-500 text-black" : "bg-white/10 text-white/50"
          }`}
        >
          {done ? "✓" : number}
        </div>

        <div>
          <h3 className="font-black">{title}</h3>
          <p className="text-xs text-white/50">{description}</p>
        </div>
      </div>
    </div>
  );
}
