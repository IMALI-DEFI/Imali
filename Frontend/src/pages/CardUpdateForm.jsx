import { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import CardUpdateForm from "./CardUpdateForm";
import BotAPI from "../utils/BotAPI";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY
);

export default function BillingCardForm() {
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function initializeBilling() {
      try {
        setLoading(true);
        setError("");
        setClientSecret("");

        if (!BotAPI.isAuthenticated()) {
          throw new Error("Please log in again to continue.");
        }

        const result = await BotAPI.createSetupIntent({
          tier: "pro",
        });

        const secret =
          result?.client_secret ||
          result?.data?.client_secret ||
          result?.clientSecret ||
          result?.data?.clientSecret;

        if (!secret) {
          throw new Error("The server did not return a client secret");
        }

        if (active) {
          setClientSecret(secret);
        }
      } catch (err) {
        console.error("Billing initialization error:", err);
        if (active) {
          setError(err?.message || "Failed to initialize billing");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initializeBilling();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-white/60">Loading secure payment form…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200 text-sm">
        <p className="mb-3">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2 text-white font-black text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="text-center py-8 text-white/60">
        <p>Unable to initialize the payment form.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 font-black text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <Elements
      key={clientSecret}
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#10b981",
            colorBackground: "#050816",
            colorText: "#ffffff",
            borderRadius: "14px",
          },
        },
      }}
    >
      <CardUpdateForm tier="pro" />
    </Elements>
  );
}
