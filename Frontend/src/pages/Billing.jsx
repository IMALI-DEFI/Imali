import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import BotAPI from "../utils/BotAPI";

const STRIPE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
if (!STRIPE_KEY) console.error("❌ Missing REACT_APP_STRIPE_PUBLISHABLE_KEY");
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

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
        confirmParams: { return_url: `${window.location.origin}/activation` },
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
      <Link to="/activation" className="block text-center text-xs text-slate-400 underline">
        Skip for now
      </Link>
    </div>
  );
}

export default function Billing() {
  const navigate = useNavigate();
  const location = useLocation();

  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const initBilling = async () => {
      // Guard: must be logged in FIRST
      if (!BotAPI.isLoggedIn()) {
        console.log("[Billing] Not logged in → redirecting to signup");
        if (isMounted) navigate("/signup", { replace: true });
        return;
      }

      try {
        setLoading(true);
        setErrorMsg("");

        // Now safe to call protected endpoints
        const meData = await BotAPI.me();
        const userData = meData?.user || meData;
        if (isMounted) setUser(userData);

        if (!userData?.email) throw new Error("No email in profile");

        const setup = await BotAPI.billingSetupIntent({
          email: userData.email.trim(),
          tier: userData.tier || "starter",
        });

        if (!setup?.client_secret) throw new Error("Missing client_secret");

        if (isMounted) setClientSecret(setup.client_secret);
      } catch (err) {
        console.error("[Billing] Load failed:", err);

        let msg = "Unable to load billing. Please try again.";

        if (err.status === 401) {
          BotAPI.clearToken();
          msg = "Session expired. Please log in again.";
          navigate("/login", { replace: true });
        } else if (err.message) {
          msg = err.message;
        }

        if (isMounted) setErrorMsg(msg);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initBilling();

    return () => { isMounted = false; };
  }, [navigate, location.state]);

  if (!stripePromise) return <div className="min-h-screen bg-black text-white p-6">Stripe not configured.</div>;

  if (loading) return <div className="min-h-screen bg-black text-white p-6 text-center">Loading billing setup…</div>;

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <div className="max-w-md rounded-xl border border-red-500/30 bg-red-950/30 p-8 text-center">
          <div className="text-red-400 mb-6">{errorMsg}</div>
          <Link
            to="/activation"
            className="inline-block rounded-xl bg-slate-700 px-6 py-3 text-white hover:bg-slate-600"
          >
            Continue without billing
          </Link>
        </div>
      </div>
    );
  }

  if (!clientSecret) return null;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-2xl font-bold">Billing Setup {user?.tier ? `(${user.tier})` : ""}</h1>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <BillingInner clientSecret={clientSecret} />
        </Elements>
      </div>
    </div>
  );
}
