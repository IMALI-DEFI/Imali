import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StripeElements from "../components/StripeElements";
import BotAPI from "../utils/BotAPI";

const TIER_COPY = {
  starter: { label: "Starter", price: "$0/mo", badge: "🌱", summary: "Paper trading and beginner tools" },
  pro: { label: "Pro", price: "$19/mo", badge: "⭐", summary: "Advanced trading signals and analytics" },
  elite: { label: "Elite", price: "$49/mo", badge: "👑", summary: "Full access to advanced trading features" },
  stock: { label: "DeFi", price: "$99/mo", badge: "📈", summary: "DEX-focused trading and market intelligence" },
  bundle: { label: "Bundle", price: "$199/mo", badge: "🧩", summary: "Everything included in one plan" },
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
  const { user, isAdmin, activation, refreshActivation } = useAuth();

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
  const [billingAvailable, setBillingAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const email = useMemo(() => {
    return location.state?.email || user?.email || localStorage.getItem("IMALI_EMAIL") || "";
  }, [location.state?.email, user?.email]);

  const loadBillingState = useCallback(async () => {
    if (!email && !user?.email) {
      setLoading(false);
      return;
    }

    if (isAdmin || user?.is_admin === true || user?.email === "wayne@imali-defi.com") {
      setHasCard(true);
      setClientSecret("");
      setBillingAvailable(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const probe = await BotAPI.probeBillingRoutes();
      if (!probe.cardStatusAvailable || !probe.setupIntentAvailable) {
        setBillingAvailable(false);
        setHasCard(!!activation?.has_card_on_file || !!activation?.billing_complete);
        setLoading(false);
        setError("Billing routes are not deployed in this environment yet.");
        return;
      }

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
        setLoading(false);
        return;
      }

      const intentRes = await BotAPI.createSetupIntent({ email, tier });
      const intentData = safeExtract(intentRes, {});
      const secret = intentData?.client_secret || intentData?.clientSecret || "";

      if (!secret) {
        throw new Error("Unable to initialize secure billing form.");
      }

      setClientSecret(secret);
      setBillingAvailable(true);
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
  }, [activation?.billing_complete, activation?.has_card_on_file, email, isAdmin, tier, user?.email, user?.is_admin]);

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
          state: { tier, fromBilling: true },
        });
      }, 900);
    } finally {
      setBusy(false);
    }
  }, [navigate, refreshActivation, tier]);

  const handleCardError = useCallback((err) => {
    setError(err?.response?.data?.message || err?.message || "Failed to save payment method.");
  }, []);

  const handleContinue = () => {
    navigate("/activation", {
      replace: true,
      state: { tier, fromBilling: true },
    });
  };

  if (!user && !email) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="text-2xl font-bold mb-3">Billing setup requires login</h1>
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
                <p className="text-white/50 text-sm">Securely add your payment method to continue onboarding</p>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
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
                <div className="text-emerald-300 font-semibold mb-2">✅ Billing complete</div>
                <button
                  onClick={handleContinue}
                  disabled={busy}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold disabled:opacity-50"
                >
                  Continue to Activation
                </button>
              </div>
            ) : !billingAvailable ? (
              <div className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5">
                <div className="text-yellow-300 font-semibold mb-2">
                  Billing is not available in this environment
                </div>
                <p className="text-sm text-white/70 mb-4">
                  The backend billing endpoints are not deployed yet. You can continue to activation or dashboard if you are owner/admin.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleContinue}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold"
                  >
                    Continue
                  </button>
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
                  >
                    Dashboard
                  </button>
                </div>
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
                <div className="text-yellow-300 font-semibold mb-2">Billing form is not ready yet</div>
                <button
                  onClick={loadBillingState}
                  className="px-6 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-700 font-semibold"
                >
                  Retry Billing Setup
                </button>
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
            <h2 className="text-xl font-bold mb-4">Next steps</h2>
            <div className="space-y-4 text-sm text-white/70">
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                1. Billing
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                2. Connect accounts
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                3. Enable trading
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}