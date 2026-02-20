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
  const { refreshActivation } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle"); // idle, processing, confirming, success

  const handleSubmit = async () => {
    if (!stripe || !elements) return;

    setBusy(true);
    setStatus("processing");
    setError("");

    try {
      // Step 1: Confirm setup with Stripe
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

      // Step 2: Payment successful - now confirm with our backend
      setStatus("confirming");
      
      // Call our dedicated confirm-card endpoint
      // This tells the backend to check Stripe and update the database
      const confirmResult = await BotAPI.confirmCard();
      
      if (!confirmResult) {
        throw new Error("No response from server");
      }

      // Step 3: Refresh activation data to get updated billing_complete
      setStatus("refreshing");
      await refreshActivation();
      
      // Small delay for state to propagate
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 4: Navigate to activation
      setStatus("success");
      navigate("/activation", { replace: true });

    } catch (err) {
      console.error("Payment setup error:", err);
      
      // Handle specific errors
      if (err.message?.includes("card_declined")) {
        setError("Your card was declined. Please try another card.");
      } else if (err.message?.includes("insufficient_funds")) {
        setError("Insufficient funds. Please try another card.");
      } else if (err.response?.status === 429) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError(err.message || "Failed to save payment method");
      }
      
      setStatus("idle");
    } finally {
      setBusy(false);
    }
  };

  // Helper to get status message
  const getStatusMessage = () => {
    switch (status) {
      case "processing":
        return "Processing your payment...";
      case "confirming":
        return "Confirming with Stripe...";
      case "refreshing":
        return "Updating your account...";
      case "success":
        return "Success! Redirecting...";
      default:
        return "Please wait...";
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg text-sm">
          ⚠️ {error}
        </div>
      )}

      <PaymentElement />

      <button
        onClick={handleSubmit}
        disabled={busy || !stripe || !elements}
        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? getStatusMessage() : "Save Payment Method"}
      </button>

      {busy && (
        <div className="text-center">
          <div className="flex justify-center mt-2 space-x-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {getStatusMessage()}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Billing() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const email =
    location.state?.email || localStorage.getItem("IMALI_EMAIL") || user?.email;
  const tier = location.state?.tier || "starter";

  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const initializeBilling = async () => {
      try {
        // Check if we're logged in
        const token = BotAPI.getToken();
        
        if (!token && !email) {
          navigate("/signup", { replace: true });
          return;
        }

        // Get user email if not provided
        let userEmail = email;
        if (!userEmail && token) {
          try {
            const me = await BotAPI.me();
            userEmail = me?.user?.email || me?.email;
            if (userEmail) {
              localStorage.setItem("IMALI_EMAIL", userEmail);
            }
          } catch (e) {
            console.warn("Could not fetch user email:", e);
          }
        }

        if (!userEmail) {
          navigate("/signup", { replace: true });
          return;
        }

        // Create Stripe SetupIntent
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
        
        if (err.response?.status === 401) {
          setError("Session expired. Please log in again.");
        } else if (err.response?.status === 429) {
          setError("Too many requests. Please wait a moment.");
        } else if (err.response?.status === 503) {
          setError("Service temporarily unavailable.");
        } else {
          setError(err.message || "Failed to initialize billing");
        }
      } finally {
        setLoading(false);
      }
    };

    initializeBilling();
  }, [email, tier, navigate]);

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
            ⚠️ {error}
          </div>

          <button
            onClick={() => navigate("/activation")}
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Back to Activation
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
