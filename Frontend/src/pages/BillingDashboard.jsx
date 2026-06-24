// imali/Frontend/src/pages/BillingDashboard.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://api.imali-defi.com";

const VALID_TIERS = ["starter", "pro", "elite", "enterprise"];

const TIERS = {
  starter: {
    label: "Starter",
    icon: "🌱",
    price: "Free",
    monthly: 0,
    summary: "Paper trading and beginner tools.",
    features: ["Paper trading", "$1,000 demo balance", "Basic strategies"],
  },
  pro: {
    label: "Pro",
    icon: "⭐",
    price: "$19/mo",
    monthly: 19,
    summary: "Live crypto and stock trading.",
    features: ["Live crypto", "Live stocks", "AI strategies", "Advanced analytics"],
  },
  elite: {
    label: "Elite",
    icon: "👑",
    price: "$49/mo",
    monthly: 49,
    summary: "Full trading access with DEX and futures.",
    features: ["Everything in Pro", "DEX sniper", "Futures", "NFT benefits"],
  },
  enterprise: {
    label: "Enterprise",
    icon: "🏢",
    price: "Custom",
    monthly: null,
    summary: "Custom billing, teams, and dedicated support.",
    features: ["Team management", "White-label tools", "Dedicated support"],
  },
};

function normalizeTier(value) {
  const tier = String(value || "starter").toLowerCase().trim();
  return VALID_TIERS.includes(tier) ? tier : "starter";
}

function getAuthToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("imali_token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("IMALI_TOKEN") ||
    ""
  );
}

async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || result?.error || `Failed: ${endpoint}`);
  }

  return result?.data || result;
}

async function optionalFetch(endpoint, fallback) {
  try {
    return await apiFetch(endpoint);
  } catch (err) {
    console.warn(`[BillingDashboard] Optional endpoint failed: ${endpoint}`, err);
    return fallback;
  }
}

export default function BillingDashboard() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [cardStatus, setCardStatus] = useState({});
  const [activation, setActivation] = useState({});
  const [subscription, setSubscription] = useState(null);
  const [imali, setImali] = useState({
    balance: 0,
    discountPct: 0,
    discountActive: false,
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const urlTier = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tier") || params.get("plan") || params.get("selected");
  }, [location.search]);

  const activationStatus = activation?.status || activation || {};

  const currentTier = useMemo(() => {
    return normalizeTier(
      urlTier ||
        location.state?.tier ||
        localStorage.getItem("IMALI_SELECTED_TIER") ||
        user?.tier ||
        activationStatus?.tier ||
        "starter"
    );
  }, [urlTier, location.state?.tier, user?.tier, activationStatus?.tier]);

  useEffect(() => {
    localStorage.setItem("IMALI_SELECTED_TIER", currentTier);
  }, [currentTier]);

  const tierMeta = TIERS[currentTier] || TIERS.starter;

  const realHasCard =
    cardStatus?.has_card === true ||
    cardStatus?.has_card_on_file === true ||
    activationStatus?.has_card_on_file === true ||
    user?.has_card_on_file === true;

  const subscriptionStatus =
    subscription?.status ||
    user?.subscription_status ||
    (realHasCard && currentTier !== "starter" ? "active" : "inactive");

  const isPaidTier = currentTier === "pro" || currentTier === "elite";

  const loadBillingDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [
        cardData,
        activationData,
        subscriptionData,
        imaliBalanceData,
        imaliDiscountData,
      ] = await Promise.all([
        optionalFetch("/api/billing/card-status", {}),
        optionalFetch("/api/me/activation-status", {}),
        optionalFetch("/api/billing/subscription", null),
        optionalFetch("/api/wallet/imali-balance", {}),
        optionalFetch("/api/billing/imali-discount-status", {}),
      ]);

      setCardStatus(cardData || {});
      setActivation(activationData || {});
      setSubscription(subscriptionData || null);

      setImali({
        balance: Number(
          imaliBalanceData?.balance ??
            imaliBalanceData?.imali_balance ??
            imaliBalanceData?.imaliBalance ??
            0
        ),
        discountPct: Number(
          imaliDiscountData?.discountPct ??
            imaliDiscountData?.discount_pct ??
            0
        ),
        discountActive: Boolean(
          imaliDiscountData?.active ??
            imaliDiscountData?.discountActive ??
            false
        ),
      });
    } catch (err) {
      setError(err?.message || "Failed to load billing dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login", {
        replace: true,
        state: { from: "/billing-dashboard" },
      });
      return;
    }

    loadBillingDashboard();
  }, [user, navigate, loadBillingDashboard]);

  const goToPaymentSetup = () => {
    const targetTier = currentTier === "starter" ? "pro" : currentTier;

    navigate(`/billing?tier=${targetTier}`, {
      state: {
        tier: targetTier,
        updateCard: true,
      },
    });
  };

  const handleUpgrade = (tier) => {
    localStorage.setItem("IMALI_SELECTED_TIER", tier);
    navigate(`/billing?tier=${tier}`, {
      state: { tier, updateCard: tier !== "starter" },
    });
  };

  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      "Cancel your subscription? Your paid features may stop at the end of the billing period."
    );

    if (!confirmed) return;

    setBusy("cancel");
    setError("");
    setNotice("");

    try {
      await apiFetch("/api/billing/cancel-subscription", {
        method: "POST",
      });

      setNotice("Subscription cancellation request submitted.");
      await refreshUser?.();
      await loadBillingDashboard();
    } catch (err) {
      setError(err?.message || "Failed to cancel subscription.");
    } finally {
      setBusy("");
    }
  };

  const handleRemoveCard = async () => {
    if (!realHasCard) return;

    const confirmed = window.confirm("Remove your saved payment method?");
    if (!confirmed) return;

    setBusy("remove-card");
    setError("");
    setNotice("");

    try {
      await apiFetch("/api/billing/remove-card", {
        method: "POST",
      });

      setNotice("Payment method removed.");
      await refreshUser?.();
      await loadBillingDashboard();
    } catch (err) {
      setError(err?.message || "Failed to remove payment method.");
    } finally {
      setBusy("");
    }
  };

  const handleApplyImaliDiscount = async () => {
    setBusy("imali");
    setError("");
    setNotice("");

    try {
      await apiFetch("/api/billing/apply-imali-discount", {
        method: "POST",
      });

      setNotice("IMALI discount applied.");
      await loadBillingDashboard();
    } catch (err) {
      setError(err?.message || "Unable to apply IMALI discount.");
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading billing dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white px-4 py-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_30%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.10),transparent_35%)]" />

      <div className="relative max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-sm text-emerald-300 font-bold tracking-wide">
              IMALI BILLING CENTER
            </p>
            <h1 className="text-3xl md:text-4xl font-black mt-1">
              Billing, Subscription & Discounts
            </h1>
            <p className="text-white/50 mt-2">
              View your plan, manage payment, upgrade, cancel, and apply IMALI token benefits.
            </p>
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 font-bold"
          >
            Back to Dashboard
          </button>
        </header>

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

        <section className="grid gap-6 lg:grid-cols-3">
          <SummaryCard
            title="Current Plan"
            icon={tierMeta.icon}
            value={`${tierMeta.label} Plan`}
            detail={tierMeta.price}
            subtext={tierMeta.summary}
          />

          <SummaryCard
            title="Subscription Status"
            icon="📄"
            value={String(subscriptionStatus).replace("_", " ")}
            detail={isPaidTier ? "Paid Access" : "Free / Manual"}
            subtext={
              isPaidTier
                ? "Your subscription controls live trading access."
                : "Starter and Enterprise use different billing flows."
            }
          />

          <SummaryCard
            title="IMALI Discount"
            icon="🪙"
            value={imali.discountActive ? `${imali.discountPct}% Active` : "Not Active"}
            detail={`${imali.balance.toLocaleString()} IMALI`}
            subtext="Hold IMALI to unlock fee and subscription benefits."
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Panel title="Plan Details" icon={tierMeta.icon}>
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <p className="text-white/40 text-sm">Plan</p>
                <h2 className="text-3xl font-black mt-1">{tierMeta.label}</h2>
                <p className="text-emerald-300 font-bold mt-2">{tierMeta.price}</p>
              </div>

              <div>
                <h3 className="font-bold mb-3">Included Features</h3>
                <div className="space-y-2">
                  {tierMeta.features.map((feature) => (
                    <div
                      key={feature}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70"
                    >
                      ✓ {feature}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                {currentTier !== "pro" && currentTier !== "elite" && (
                  <button
                    onClick={() => handleUpgrade("pro")}
                    className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 font-black"
                  >
                    Upgrade to Pro
                  </button>
                )}

                {currentTier !== "elite" && (
                  <button
                    onClick={() => handleUpgrade("elite")}
                    className="px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 font-black"
                  >
                    Upgrade to Elite
                  </button>
                )}

                <button
                  onClick={() => navigate("/pricing")}
                  className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 font-black"
                >
                  Compare Plans
                </button>
              </div>
            </div>
          </Panel>

          <Panel title="Payment Method" icon="💳">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full ${
                    realHasCard ? "bg-emerald-400" : "bg-gray-500"
                  }`}
                />
                <h3 className="font-black">
                  {realHasCard ? "Payment Method On File" : "No Payment Method"}
                </h3>
              </div>

              <p className="text-white/50 text-sm mt-3">
                {realHasCard
                  ? "Your card is saved securely through Stripe."
                  : currentTier === "starter"
                  ? "Starter does not require a card."
                  : "Add a card to activate paid access."}
              </p>
            </div>

            {subscription && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5">
                <h3 className="font-bold mb-4">Subscription Details</h3>
                <InfoRow label="Plan" value={subscription.plan || tierMeta.label} />

                {subscription.amount && (
                  <InfoRow
                    label="Price"
                    value={`${(subscription.currency || "usd").toUpperCase()} $${(
                      subscription.amount / 100
                    ).toFixed(2)} / ${subscription.interval || "month"}`}
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
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              {currentTier !== "starter" && currentTier !== "enterprise" && (
                <button
                  onClick={goToPaymentSetup}
                  disabled={!!busy}
                  className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 font-black disabled:opacity-50"
                >
                  {realHasCard ? "Update Card" : "Add Card"}
                </button>
              )}

              {realHasCard && (
                <button
                  onClick={handleRemoveCard}
                  disabled={busy === "remove-card"}
                  className="px-5 py-3 rounded-2xl bg-red-900/60 hover:bg-red-800/60 border border-red-700/50 text-red-200 font-black disabled:opacity-50"
                >
                  {busy === "remove-card" ? "Removing..." : "Remove Card"}
                </button>
              )}
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Panel title="Subscription Actions" icon="⚙️">
            <div className="space-y-3">
              <ActionRow
                title="Upgrade or change your plan"
                description="Move between Starter, Pro, Elite, or Enterprise options."
                button="Change Plan"
                onClick={() => navigate("/pricing")}
              />

              <ActionRow
                title="Continue account setup"
                description="Connect OKX, Alpaca, wallet, and activate trading."
                button="Activation"
                onClick={() => navigate("/activation", { state: { tier: currentTier } })}
              />

              {isPaidTier && subscriptionStatus !== "canceled" && (
                <ActionRow
                  danger
                  title="Cancel subscription"
                  description="Cancel paid access. You may retain access until the end of your billing period."
                  button={busy === "cancel" ? "Canceling..." : "Cancel"}
                  onClick={handleCancelSubscription}
                />
              )}
            </div>
          </Panel>

          <Panel title="IMALI Token Discounts" icon="🪙">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <p className="text-white/40 text-sm">Current IMALI Balance</p>
              <h3 className="text-3xl font-black mt-1">
                {imali.balance.toLocaleString()} IMALI
              </h3>

              <p className="text-white/60 text-sm mt-3">
                Discount Status:{" "}
                <span
                  className={
                    imali.discountActive ? "text-emerald-300" : "text-yellow-300"
                  }
                >
                  {imali.discountActive
                    ? `${imali.discountPct}% active`
                    : "Not active"}
                </span>
              </p>
            </div>

            <div className="mt-5 grid gap-3">
              <button
                onClick={handleApplyImaliDiscount}
                disabled={busy === "imali"}
                className="w-full px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-black disabled:opacity-50"
              >
                {busy === "imali" ? "Applying..." : "Apply IMALI Discount"}
              </button>

              <button
                onClick={() => navigate("/buy-imali")}
                className="w-full px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 font-black"
              >
                Buy IMALI Tokens
              </button>
            </div>
          </Panel>
        </section>

        {process.env.NODE_ENV === "development" && (
          <details className="rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-white/50">
            <summary className="cursor-pointer">Debug Information</summary>
            <pre className="mt-3 overflow-auto">
              {JSON.stringify(
                {
                  apiBase: API_BASE,
                  hasToken: !!getAuthToken(),
                  currentTier,
                  realHasCard,
                  subscriptionStatus,
                  cardStatus,
                  activation,
                  subscription,
                  imali,
                  userTier: user?.tier,
                  localStorageTier: localStorage.getItem("IMALI_SELECTED_TIER"),
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

function SummaryCard({ title, icon, value, detail, subtext }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="text-4xl mb-4">{icon}</div>
      <p className="text-white/40 text-sm">{title}</p>
      <h2 className="text-2xl font-black mt-1 capitalize">{value}</h2>
      <p className="text-emerald-300 font-bold mt-2">{detail}</p>
      <p className="text-white/50 text-sm mt-3">{subtext}</p>
    </div>
  );
}

function Panel({ title, icon, children }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-black">{title}</h2>
        <span className="text-3xl">{icon}</span>
      </div>
      {children}
    </section>
  );
}

function InfoRow({ label, value, valueClass = "text-white" }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-white/40">{label}</span>
      <span className={`font-semibold capitalize text-right ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

function ActionRow({ title, description, button, onClick, danger = false }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h3 className="font-black">{title}</h3>
        <p className="text-sm text-white/50 mt-1">{description}</p>
      </div>

      <button
        onClick={onClick}
        className={`px-5 py-3 rounded-2xl font-black ${
          danger
            ? "bg-red-900/60 hover:bg-red-800/60 text-red-200 border border-red-700/50"
            : "bg-white/10 hover:bg-white/15 border border-white/10"
        }`}
      >
        {button}
      </button>
    </div>
  );
}
