// src/pages/Billing.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import BotAPI from "../utils/BotAPI";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY
);

function BillingInner() {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!stripe || !elements) return;

    setBusy(true);
    setError("");

    try {
      const { error: stripeError } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/activation`,
        },
        redirect: "if_required",
      });

      if (stripeError) {
        throw stripeError;
      }

      navigate("/activation", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to save payment method");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <PaymentElement />

      <button
        onClick={handleSubmit}
        disabled={busy || !stripe || !elements}
        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save Payment Method"}
      </button>
    </div>
  );
}

export default function Billing() {
  const location = useLocation();
  const navigate = useNavigate();

  const email =
    location.state?.email || localStorage.getItem("IMALI_EMAIL");
  const tier = location.state?.tier || "starter";

  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const initializeBilling = async () => {
      try {
        // If no token, redirect
        if (!BotAPI.isLoggedIn()) {
          navigate("/login", {
            replace: true,
            state: { from: "/billing" },
          });
          return;
        }

        if (!email) {
          navigate("/signup", { replace: true });
          return;
        }

        const res = await BotAPI.createSetupIntent({
          email,
          tier,
        });

        if (!res?.client_secret) {
          throw new Error("Stripe client_secret missing");
        }

        setClientSecret(res.client_secret);
      } catch (err) {
        if (err.response?.status === 401) {
          navigate("/login", {
            replace: true,
            state: { from: "/billing" },
          });
          return;
        }

        setError(err.message || "Failed to initialize billing");
      } finally {
        setLoading(false);
      }
    };

    initializeBilling();
  }, [email, tier, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center text-emerald-400">
          Loading billing...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>

          <Link
            to="/activation"
            className="inline-block bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Continue
          </Link>
        </div>
      </div>
    );
  }

  if (!clientSecret) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-2">Add Payment Method</h1>
        <p className="text-gray-400 text-sm mb-6">
          Your card will be saved securely with Stripe
        </p>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "night",
                variables: {
                  colorPrimary: "#10b981",
                  colorBackground: "#1f2937",
                  colorText: "#ffffff",
                  colorDanger: "#ef4444",
                },
              },
            }}
          >
            <BillingInner />
          </Elements>
        </div>

        <div className="mt-4 text-center">
          <Link
            to="/activation"
            className="text-sm text-gray-400 hover:text-white"
          >
            Skip for now
          </Link>
        </div>
      </div>
    </div>
  );
}
