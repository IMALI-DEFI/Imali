import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StripeElements from "../components/StripeElements";
import BotAPI from "../utils/BotAPI";

const TIER_COPY = {
  starter: {
    label: "Starter",
    price: "$0/mo",
    badge: "🌱",
    summary: "Paper trading and beginner tools",
  },
  pro: {
    label: "Pro",
    price: "$19/mo",
    badge: "⭐",
    summary: "Advanced trading signals and analytics",
  },
  elite: {
    label: "Elite",
    price: "$49/mo",
    badge: "👑",
    summary: "Full access to advanced trading features",
  },
  stock: {
    label: "DeFi",
    price: "$99/mo",
    badge: "📈",
    summary: "DEX-focused trading and market intelligence",
  },
  bundle: {
    label: "Bundle",
    price: "$199/mo",
    badge: "🧩",
    summary: "Everything included in one plan",
  },
};

function normalizeTier(value) {
  const tier = String(value || "starter").toLowerCase().trim();
  return TIER_COPY[tier] ? tier : "starter";
}

function safeExtract(response, fallback = {}) {
  if (!response) return fallback;
  if (response.data && typeof response.data === "object") return response.data;
  return response;
}

export default function Billing() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, activation, refreshActivation } = useAuth();

  const tier = useMemo(() => {
    return normalizeTier(
      location.state?.tier ||
        user?.tier ||
        localStorage.getItem("IMALI_TIER") ||
        localStorage.getItem("imali_selected_tier") ||
        "starter"
    );
  }, [location.state?.tier, user?.tier]);

  const tierInfo = TIER_COPY[tier];

  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState("");
  const [hasCard, setHasCard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const email = useMemo(() => {
    return (
      location.state?.email ||
      user?.email ||
      localStorage.getItem("IMALI_EMAIL") ||
      ""
    );
  }, [location.state?.email, user?.email]);

  const loadBillingState = useCallback(async () => {
    if (!email && !user?.email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const cardStatusRes = await BotAPI.getCardStatus();
      const cardStatus = safeExtract(cardStatusRes, {});

      const alreadyHasCard =
        !!cardStatus?.has_card ||
        !!cardStatus?.has_card_on_file ||
        !!activation?.has_card_on_file ||
        !!activation?.billing_complete;

      setHasCard(alreadyHasCard);

      if (alreadyHasCard) {
        setClientSecret("");
        return;
      }

      const intentRes = await BotAPI.createSetupIntent({
        email,
        tier,
      });

      const intentData = safeExtract(intentRes, {});
      const secret = intentData?.client_secret || intentData?.clientSecret || "";

      if (!secret) {
        throw new Error("Unable to initialize secure billing form.");
      }

      setClientSecret(secret);
    } catch (err) {
      console.error("[Billing] Failed to initialize billing:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load billing setup."
      );
      setClientSecret("");
    } finally {
      setLoading(false);
    }
  }, [activation?.billing_complete, activation?.has_card_on_file, email, tier, user?.email]);

  useEffect(() => {
    loadBillingState();
  }, [loadBillingState]);

  const handleCardSuccess = useCallback(async () => {
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await refreshActivation?.();
      setHasCard(true);
      setClientSecret("");
      setSuccess("✅ Card added successfully. Taking you to activation...");
      setTimeout(() => {
        navigate("/activation", {
          replace: true,
          state: {
            tier,
            fromBilling: true,
          },
        });
      }, 900);
    } catch (err) {
      console.error("[Billing] Card success refresh failed:", err);
      setHasCard(true);
      setClientSecret("");
      setSuccess("✅ Card added successfully.");
      setTimeout(() => {
        navigate("/activation", {
          replace: true,
          state: {
            tier,
            fromBilling: true,
          },
        });
      }, 900);
    } finally {
      setBusy(false);
    }
  }, [navigate, refreshActivation, tier]);

  const handleCardError = useCallback((err) => {
    setError(
      err?.response?.data?.message ||
        err?.message ||
        "Failed to save payment method."
    );
  }, []);

  const handleContinue = () => {
    navigate("/activation", {
      replace: true,
      state: {
        tier,
        fromBilling: true,
      },
    });
  };

  const handleRetry = () => {
    loadBillingState();
  };

  if (!user && !email) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="text-2xl font-bold mb-3">Billing setup requires login</h1>
          <p className="text-white/60 mb-6">
            Please log in first so we can securely attach your payment method.
          </p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{tierInfo.badge}</span>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Billing Setup</h1>
                <p className="text-white/50 text-sm">
                  Securely add your payment method to continue onboarding
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm text-white/50">Selected Plan</div>
                  <div className="text-lg font-semibold">
                    {tierInfo.label} <span className="text-emerald-400">{tierInfo.price}</span>
                  </div>
                  <div className="text-sm text-white/60">{tierInfo.summary}</div>
                </div>
                <button
                  onClick={() => navigate("/pricing")}
                  className="text-sm px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10"
                >
                  Change Plan
                </button>
              </div>
            </div>

            <div className="space-y-4 text-sm text-white/70">
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                <div className="font-semibold text-blue-300 mb-2">How billing works</div>
                <ul className="space-y-1 list-disc pl-5">
                  <li>Your card is stored securely with Stripe.</li>
                  <li>We do not store full card details.</li>
                  <li>Billing setup is required before activation can complete.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="font-semibold mb-2">Account</div>
                <div className="text-white/60 break-all">{email}</div>
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {success}
              </div>
            )}

            {loading ? (
              <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-3" />
                <p className="text-white/50">Preparing secure billing form...</p>
              </div>
            ) : hasCard ? (
              <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                <div className="text-emerald-300 font-semibold mb-2">✅ Card already on file</div>
                <p className="text-sm text-white/70 mb-4">
                  Your payment method is already saved. Continue to activation to finish connecting your accounts.
                </p>
                <button
                  onClick={handleContinue}
                  disabled={busy}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold disabled:opacity-50"
                >
                  Continue to Activation
                </button>
              </div>
            ) : clientSecret ? (
              <div className="mt-6">
                <StripeElements
                  clientSecret={clientSecret}
                  onSuccess={handleCardSuccess}
                  onError={handleCardError}
                />
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5">
                <div className="text-yellow-300 font-semibold mb-2">
                  Billing form is not ready yet
                </div>
                <p className="text-sm text-white/70 mb-4">
                  We couldn’t load your secure payment form on the first try.
                </p>
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-700 font-semibold"
                >
                  Retry Billing Setup
                </button>
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
            <h2 className="text-xl font-bold mb-4">Next steps</h2>

            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm font-semibold mb-1">1. Add payment method</div>
                <div className="text-sm text-white/50">
                  Required before onboarding can be completed.
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm font-semibold mb-1">2. Connect trading accounts</div>
                <div className="text-sm text-white/50">
                  Link OKX, Alpaca, or wallet connections based on your tier.
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm font-semibold mb-1">3. Turn on trading</div>
                <div className="text-sm text-white/50">
                  Activate your bot after billing and account connections are complete.
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-purple-500/20 bg-purple-500/10 p-4 text-sm text-purple-200">
              💡 New users can start with safer paper-trading account connections first, then switch to live trading later in activation.
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => navigate("/activation", { state: { tier } })}
                className="px-5 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
              >
                Skip for now
              </button>
              <button
                onClick={() => navigate("/pricing")}
                className="px-5 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
              >
                Review Plans
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
