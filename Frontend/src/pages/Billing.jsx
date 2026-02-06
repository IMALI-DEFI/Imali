import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { BotAPI } from "../utils/BotAPI";

const STRIPE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "";

function BillingInner({ clientSecret, customerId }) {
  const stripe = useStripe();
  const elements = useElements();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (!stripe || !elements) return;

    setBusy(true);
    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });

      if (error) throw error;

      if (setupIntent?.payment_method && customerId) {
        await BotAPI.billingSetDefaultPaymentMethod({
          customer_id: customerId,
          payment_method_id: setupIntent.payment_method,
        });
      }

      nav("/billing-success", { replace: true });
    } catch (e) {
      setErr(e?.message || "Failed to save card");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {err && <div className="text-red-400 text-sm">{err}</div>}
      <PaymentElement />
      <button
        onClick={submit}
        disabled={busy}
        className="w-full bg-blue-600 py-3 rounded-xl font-semibold"
      >
        {busy ? "Processing…" : "Save Card"}
      </button>
    </div>
  );
}

export default function Billing() {
  const nav = useNavigate();
  const [clientSecret, setClientSecret] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState("");

  const stripePromise = useMemo(
    () => (STRIPE_KEY ? loadStripe(STRIPE_KEY) : null),
    []
  );

  useEffect(() => {
    (async () => {
      try {
        const data = await BotAPI.billingSetupIntent();
        setClientSecret(data.client_secret);
        setCustomerId(data.customer_id || "");
      } catch (e) {
        setFatal(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6">Loading billing…</div>;
  if (fatal) return <div className="p-6 text-red-400">{fatal}</div>;
  if (!stripePromise) return <div className="p-6">Stripe not configured</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">Billing</h1>

        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <BillingInner clientSecret={clientSecret} customerId={customerId} />
        </Elements>

        <Link to="/activation" className="block mt-4 text-sm underline text-center">
          Skip billing
        </Link>
      </div>
    </div>
  );
}
