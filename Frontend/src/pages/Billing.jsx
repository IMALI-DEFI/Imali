import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import  BotAPI from "../utils/BotAPI";

/* -------------------------------------------------- */
/* Stripe setup (MUST be module-level) */
/* -------------------------------------------------- */

const STRIPE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;

if (!STRIPE_KEY) {
  console.error("❌ Missing REACT_APP_STRIPE_PUBLISHABLE_KEY");
}

const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

/* -------------------------------------------------- */
/* Inner payment form */
/* -------------------------------------------------- */

function BillingInner({ clientSecret }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!stripe || !elements) return;

    setBusy(true);
    setError("");

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/activation`,
        },
        redirect: "if_required",
      });

      if (error) throw error;

      navigate("/activation", { replace: true });
    } catch (err) {
      console.error("Stripe error:", err);
      setError(err?.message || "Failed to save payment method.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <PaymentElement />

      <button
        onClick={submit}
        disabled={!stripe || busy}
        className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-black hover:bg-emerald-500 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save Payment Method"}
      </button>

      <Link
        to="/activation"
        className="block text-center text-xs text-slate-400 underline"
      >
        Skip for now
      </Link>
    </div>
  );
}

/* -------------------------------------------------- */
/* Page */
/* -------------------------------------------------- */

export default function Billing() {
  const navigate = useNavigate();
  const location = useLocation();

  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  /* Auth guard */
  useEffect(() => {
    if (!BotAPI.getToken()) {
      navigate("/signup", { replace: true });
    }
  }, [navigate]);

  /* Load billing setup */
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const me = await BotAPI.me();
        const userData = me?.user || me;
        setUser(userData);

        const setup = await BotAPI.billingSetupIntent({
          email: userData.email,
          tier: userData.tier,
        });

        if (!setup?.client_secret) {
          throw new Error("Missing Stripe client_secret");
        }

        if (mounted) setClientSecret(setup.client_secret);
      } catch (err) {
        console.error("Billing load error:", err);
        setError(
          err?.message ||
            "Billing is currently unavailable. Please try again."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [location.state]);

  /* -------------------------------------------------- */
  /* Render states */
  /* -------------------------------------------------- */

  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        Stripe is not configured.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6 text-center">
        Loading billing…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="mx-auto max-w-md rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          {error}
          <div className="mt-4 text-center">
            <Link to="/activation" className="underline">
              Continue without billing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-xl font-bold">
          Billing Setup ({user?.tier})
        </h1>

        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <BillingInner clientSecret={clientSecret} />
        </Elements>
      </div>
    </div>
  );
}
