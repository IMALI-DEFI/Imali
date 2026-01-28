// src/pages/SignupForm.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";

// Assets
import StarterNFT from "../assets/images/nfts/nft-starter.png";
import ProNFT from "../assets/images/nfts/nft-pro.png";
import EliteNFT from "../assets/images/nfts/nft-elite.png";
import StockNFT from "../assets/images/nfts/nft-stock.png";
import BundleNFT from "../assets/images/nfts/nft-bundle.png";

/* ------------------------------------------------------------------ */
/* CONFIG                                                             */
/* ------------------------------------------------------------------ */

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:8001"
    : "https://api.imali-defi.com");

const API = {
  signup: `${API_BASE}/api/signup`,
  promoStatus: `${API_BASE}/api/promo/status`,
  createSetupIntent: `${API_BASE}/api/billing/create-setup-intent`,
  completeSetup: `${API_BASE}/api/billing/complete-setup`,
  createCheckout: `${API_BASE}/api/billing/create-checkout`,
};

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLIC_KEY || "pk_test_xxx"
);

/* ------------------------------------------------------------------ */
/* CONSTANTS                                                          */
/* ------------------------------------------------------------------ */

const STRATEGIES = [
  { value: "momentum", label: "Growth" },
  { value: "mean_reversion", label: "Conservative" },
  { value: "ai_weighted", label: "Balanced" },
  { value: "volume_spike", label: "Aggressive" },
];

const TIERS = {
  starter: { label: "Starter", img: StarterNFT },
  pro: { label: "Pro", img: ProNFT },
  elite: { label: "Elite", img: EliteNFT },
  stock: { label: "Stocks", img: StockNFT },
  bundle: { label: "Bundle", img: BundleNFT },
};

/* ------------------------------------------------------------------ */
/* PAYMENT FORM                                                       */
/* ------------------------------------------------------------------ */

function PaymentForm({ user, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);

    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });

      if (error) throw error;
      if (setupIntent.status !== "succeeded")
        throw new Error("SetupIntent not completed");

      await axios.post(API.completeSetup, {
        user_id: user.user_id,
        setup_intent_id: setupIntent.id,
      });

      onSuccess();
    } catch (err) {
      console.error(err);
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement />
      <button
        disabled={loading}
        className="w-full py-3 rounded-xl bg-emerald-600"
      >
        {loading ? "Saving…" : "Save Payment Method"}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */

export default function SignupForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const confettiRef = useRef(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    tier: "starter",
    strategy: "ai_weighted",
  });

  const [step, setStep] = useState("signup"); // signup → payment → subscription → done
  const [user, setUser] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* ---------------- INIT ---------------- */

  useEffect(() => {
    const tier = params.get("tier");
    const strategy = params.get("strategy");
    setForm((f) => ({
      ...f,
      tier: TIERS[tier] ? tier : "starter",
      strategy: STRATEGIES.find((s) => s.value === strategy)
        ? strategy
        : "ai_weighted",
    }));
  }, [params]);

  /* ---------------- VALIDATION ---------------- */

  const valid = useMemo(() => {
    return (
      form.email.includes("@") &&
      form.password.length >= 8 &&
      !!form.strategy
    );
  }, [form]);

  /* ---------------- SIGNUP ---------------- */

  const signup = async (e) => {
    e.preventDefault();
    if (!valid || loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await axios.post(API.signup, {
        email: form.email.trim(),
        password: form.password,
        tier: form.tier,
        strategy: form.strategy,
        execution_mode: form.tier === "starter" ? "auto" : "manual",
      });

      if (!res.data?.ok) throw new Error("Signup failed");

      setUser(res.data);

      // Always collect payment method
      const si = await axios.post(API.createSetupIntent, {
        user_id: res.data.user_id,
        stripe_customer_id: res.data.stripe_customer_id,
        tier: form.tier,
      });

      setClientSecret(si.data.client_secret);
      setStep("payment");
    } catch (err) {
      console.error(err);
      setError("Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- AFTER PAYMENT ---------------- */

  const paymentComplete = () => {
    if (form.tier === "starter") {
      setStep("done");
      setTimeout(() => navigate("/dashboard"), 1200);
      return;
    }
    setStep("subscription");
  };

  /* ---------------- SUBSCRIPTION ---------------- */

  const subscribe = async () => {
    // 🔒 HARD STOP — STARTER NEVER CALLS THIS
    if (form.tier === "starter") {
      setStep("done");
      navigate("/dashboard");
      return;
    }

    try {
      await axios.post(API.createCheckout, {
        tier: form.tier,
        user_id: user.user_id,
        stripe_customer_id: user.stripe_customer_id,
      });

      setStep("done");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Subscription failed");
    }
  };

  /* ---------------- RENDER ---------------- */

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-xl mx-auto space-y-6">

        {step === "signup" && (
          <form onSubmit={signup} className="space-y-4">
            <input
              className="w-full p-3 rounded bg-gray-900"
              placeholder="Email"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />
            <input
              type="password"
              className="w-full p-3 rounded bg-gray-900"
              placeholder="Password"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
            />

            <button
              disabled={!valid || loading}
              className="w-full py-3 bg-indigo-600 rounded-xl"
            >
              {loading ? "Creating…" : "Create Account"}
            </button>
          </form>
        )}

        {step === "payment" && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              user={user}
              onSuccess={paymentComplete}
              onError={setError}
            />
          </Elements>
        )}

        {step === "subscription" && (
          <button
            onClick={subscribe}
            className="w-full py-3 bg-indigo-600 rounded-xl"
          >
            Subscribe & Enable Trading
          </button>
        )}

        {step === "done" && (
          <div className="text-center text-xl">
            🎉 Setup complete. Redirecting…
          </div>
        )}

        {error && <div className="text-red-400">{error}</div>}
      </div>
    </div>
  );
}
