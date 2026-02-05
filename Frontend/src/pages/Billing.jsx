// src/pages/Billing.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

const TOKEN_KEY = "imali_token";
const API_BASE = process.env.REACT_APP_API_BASE || "https://api.imali-defi.com";
const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "";

// Axios (Bearer token)
const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((cfg) => {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
  } catch (e) {
    console.warn("Failed to set auth token:", e);
  }
  return cfg;
});

// Validate Stripe client secret format (SetupIntent)
function isValidSetupIntentSecret(secret) {
  if (!secret || typeof secret !== "string") return false;
  // SetupIntent secrets: seti_..._secret_...
  return secret.startsWith("seti_") && secret.length > 20;
}

function BillingInner({ customerId }) {
  const stripe = useStripe();
  const elements = useElements();
  const nav = useNavigate();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async () => {
    setErr("");
    if (!stripe || !elements) {
      setErr("Stripe not ready. Please refresh the page.");
      return;
    }

    setBusy(true);
    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/billing`,
        },
        redirect: "if_required",
      });

      if (error) {
        console.error("Stripe confirmSetup error:", error);
        throw error;
      }

      // If confirmSetup completed without redirect, we can set default PM now
      const pmId = setupIntent?.payment_method;
      if (customerId && pmId) {
        try {
          await api.post("/billing/set-default-payment-method", {
            customer_id: customerId,
            payment_method_id: pmId,
          });
        } catch (e) {
          console.warn("Failed to set default payment method:", e);
          // Non-fatal: card may still be saved
        }
      }

      // Navigate to activation regardless
      nav("/activation", { replace: true });
    } catch (e) {
      const errorMsg = e?.message || "Failed to save card. Please try again.";
      setErr(errorMsg);
      console.error("Card save error:", e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Add Payment Method</h2>
        <p className="text-sm text-white/70 mt-1">
          Your card will be charged for performance fees on the Starter tier.
        </p>
      </div>

      {err && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          <div className="font-medium">Error</div>
          <div className="mt-1">{err}</div>
        </div>
      )}

      <div className="mb-4">
        <PaymentElement 
          options={{
            layout: "tabs",
            wallets: {
              applePay: "auto",
              googlePay: "auto",
            },
          }}
        />
      </div>

      <div className="space-y-3">
        <button
          onClick={handleSubmit}
          disabled={busy || !stripe || !elements}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Processing…" : "Save Card"}
        </button>

        <Link 
          to="/activation" 
          className="block text-center text-sm text-white/70 underline hover:text-white"
        >
          Continue without adding card
        </Link>
      </div>
    </div>
  );
}

export default function Billing() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [customerId, setCustomerId] = useState("");

  // Create Stripe promise once
  const stripePromise = useMemo(() => {
    if (!STRIPE_PUBLISHABLE_KEY) {
      console.error("Stripe publishable key is missing");
      return null;
    }
    try {
      return loadStripe(STRIPE_PUBLISHABLE_KEY);
    } catch (e) {
      console.error("Failed to load Stripe:", e);
      return null;
    }
  }, []);

  // Check for redirect from Stripe (3DS)
  useEffect(() => {
    const returnedSecret = params.get("setup_intent_client_secret");
    if (returnedSecret && isValidSetupIntentSecret(returnedSecret)) {
      console.log("Received Stripe redirect with secret");
      setClientSecret(returnedSecret);
      setLoading(false);
    }
  }, [params]);

  // Normal flow: request SetupIntent from backend
  useEffect(() => {
    // Check authentication first
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      nav("/signup", { replace: true });
      return;
    }

    // If we already have a valid secret (from redirect), skip
    if (clientSecret && isValidSetupIntentSecret(clientSecret)) {
      console.log("Using existing client secret");
      return;
    }

    let isMounted = true;

    const fetchSetupIntent = async () => {
      setLoading(true);
      setFatal("");

      try {
        const tier = params.get("tier") || undefined;
        const strategy = params.get("strategy") || undefined;

        console.log("Requesting setup intent from backend...");
        const response = await api.post("/billing/setup-intent", { 
          tier, 
          strategy 
        });

        const secret = response?.data?.client_secret;
        const custId = response?.data?.customer_id || "";

        if (!isMounted) return;

        if (!isValidSetupIntentSecret(secret)) {
          console.error("Invalid Stripe client secret returned:", secret);
          throw new Error("Invalid response from server. Please try again.");
        }

        setClientSecret(secret);
        setCustomerId(custId);
      } catch (e) {
        console.error("Failed to fetch setup intent:", e);
        if (!isMounted) return;
        
        const errorMsg = e?.response?.data?.message || 
                        e?.response?.data?.error || 
                        e?.message || 
                        "Unable to load billing. Please try again.";
        setFatal(errorMsg);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSetupIntent();

    return () => {
      isMounted = false;
    };
  }, [nav, params, clientSecret]);

  // Early returns for loading and error states
  if (!STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <div className="font-semibold text-red-200 mb-2">Configuration Error</div>
            <p className="text-sm text-red-100/80">
              Stripe publishable key is missing. Please check your environment variables.
            </p>
            <Link 
              to="/" 
              className="mt-3 inline-block text-sm underline text-white/80 hover:text-white"
            >
              Return to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <div className="font-semibold text-red-200 mb-2">Stripe Error</div>
            <p className="text-sm text-red-100/80">
              Failed to initialize Stripe. Please check your internet connection and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-center space-x-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
              <span>Loading billing form...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (fatal) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <div className="font-semibold text-red-200 mb-2">Error</div>
            <p className="text-sm text-red-100/80 mb-4">{fatal}</p>
            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium"
              >
                Retry
              </button>
              <Link 
                to="/activation" 
                className="block w-full text-center px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium"
              >
                Continue without billing
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret || !isValidSetupIntentSecret(clientSecret)) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <div className="font-semibold text-red-200 mb-2">Invalid Setup</div>
            <p className="text-sm text-red-100/80">
              Unable to initialize payment form. Please try again or contact support.
            </p>
            <div className="mt-3 space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium"
              >
                Retry
              </button>
              <Link 
                to="/activation" 
                className="block w-full text-center px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium"
              >
                Skip billing setup
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const elementsOptions = {
    clientSecret,
    appearance: {
      theme: "night",
      variables: {
        colorPrimary: "#3b82f6",
        colorBackground: "#111827",
        colorText: "#f3f4f6",
        colorDanger: "#ef4444",
        fontFamily: "Inter, system-ui, sans-serif",
        spacingUnit: "4px",
        borderRadius: "12px",
      },
    },
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-white/70 hover:text-white mb-4"
          >
            ← Back to home
          </Link>
          <h1 className="text-2xl font-bold">Billing Setup</h1>
          <p className="text-gray-400 mt-2">
            Add a payment method to your account. You'll only be charged for actual performance fees.
          </p>
        </div>

        <Elements stripe={stripePromise} options={elementsOptions}>
          <BillingInner customerId={customerId} />
        </Elements>

        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>Powered by Stripe. Your payment information is encrypted and secure.</p>
          <p className="mt-1">Need help? Contact support@imali-defi.com</p>
        </div>
      </div>
    </div>
  );
}