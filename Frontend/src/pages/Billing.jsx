// src/pages/Billing.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { createSetupIntent } from "../utils/billingApi";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

function BillingInner() {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!stripe || !elements) return;

    setBusy(true);
    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: `${window.location.origin}/activation` },
        redirect: "if_required",
      });
      if (error) throw error;
      navigate("/activation", { replace: true });
    } catch (e) {
      setError(e.message || "Billing failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {error && <div className="text-red-400">{error}</div>}
      <PaymentElement />
      <button onClick={submit} disabled={busy} className="w-full mt-4 bg-emerald-600 p-3 rounded">
        {busy ? "Saving…" : "Save Payment Method"}
      </button>
    </>
  );
}

export default function Billing() {
  const location = useLocation();
  const navigate = useNavigate();

  const email =
    location.state?.email ||
    localStorage.getItem("IMALI_EMAIL");

  const tier = location.state?.tier || "starter";

  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!email) {
      navigate("/signup", { replace: true });
      return;
    }

    createSetupIntent({ email, tier })
      .then((res) => setClientSecret(res.client_secret))
      .catch((e) => setError(e.message));
  }, [email, tier, navigate]);

  if (error) {
    return (
      <div className="p-6 text-white">
        <div className="text-red-400 mb-4">{error}</div>
        <Link to="/activation">Continue without billing</Link>
      </div>
    );
  }

  if (!clientSecret) return <div className="p-6 text-white">Loading billing…</div>;

  return (
    <div className="p-6 text-white max-w-md mx-auto">
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <BillingInner />
      </Elements>
    </div>
  );
}
