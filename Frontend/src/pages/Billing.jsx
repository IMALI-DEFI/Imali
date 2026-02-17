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
import { useAuth } from "../context/AuthContext";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY
);

function BillingInner() {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
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

      // SUCCESS - Payment method saved
      
      // Wait for webhook to process (1.5 seconds is usually enough)
      // This gives Stripe time to send webhook and backend time to update
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Force refresh user data from backend
      // This will update billing_complete in activation state
      await refreshUser();

      // Now navigate to activation with fresh data
      navigate("/activation", { replace: true });

    } catch (err) {
      console.error("Payment setup error:", err);
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
        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? "Processing…" : "Save Payment Method"}
      </button>

      {busy && (
        <p className="text-xs text-center text-gray-400 mt-2">
          Please wait while we confirm your payment method...
        </p>
      )}
    </div>
  );
}

export default function Billing() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const email =
    location.state?.email || localStorage.getItem("IMALI_EMAIL") || user?.email;
  const tier = location.state?.tier || "starter";

  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const initializeBilling = async () => {
      try {
        // Check if we're already logged in via token
        const token = BotAPI.getToken();
        
        // If no token and no email, go to signup
        if (!token && !email) {
          navigate("/signup", { replace: true });
          return;
        }

        // If we have token but no email, try to get it from user
        let userEmail = email;
        if (!userEmail && token) {
          try {
            // Use refreshUser to get latest user data
            const userData = await refreshUser();
            userEmail = userData?.email;
            if (userEmail) {
              localStorage.setItem("IMALI_EMAIL", userEmail);
            }
          } catch (e) {
            console.warn("Could not fetch user email:", e);
          }
        }

        // If still no email, go to signup
        if (!userEmail) {
          navigate("/signup", { replace: true });
          return;
        }

        // Create setup intent
        const res = await BotAPI.createSetupIntent({
          email: userEmail,
          tier,
        });

        if (!res?.client_secret) {
          throw new Error("Stripe client_secret missing");
        }

        setClientSecret(res.client_secret);
      } catch (err) {
        console.error("Billing initialization error:", err);
        
        // Handle specific errors
        if (err.response?.status === 401) {
          const isOnboarding = window.location.pathname.includes("/billing");
          if (isOnboarding) {
            setError("Session expired. Please try signing up again.");
          } else {
            navigate("/login", {
              replace: true,
              state: { from: "/billing" },
            });
          }
          return;
        }

        if (err.response?.status === 429) {
          setError("Too many requests. Please wait a moment and try again.");
        } else if (err.response?.status === 503) {
          setError("Service temporarily unavailable. Please try again later.");
        } else {
          setError(err.message || "Failed to initialize billing");
        }
      } finally {
        setLoading(false);
      }
    };

    initializeBilling();
  }, [email, tier, navigate, refreshUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <div className="text-emerald-400">Loading billing...</div>
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

          <button
            onClick={() => navigate("/signup")}
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Back to Signup
          </button>
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
