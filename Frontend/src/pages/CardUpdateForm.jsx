import { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import CardUpdateForm from "./CardUpdateForm";

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

        const token = localStorage.getItem("token");

        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/api/billing/setup-intent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || `Billing initialization failed (${response.status})`
          );
        }

        if (!data.clientSecret) {
          throw new Error("The server did not return a client secret");
        }

        if (active) {
          setClientSecret(data.clientSecret);
        }
      } catch (err) {
        console.error("Billing initialization error:", err);

        if (active) {
          setError(err.message);
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
    return <p>Loading secure payment form…</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (!clientSecret) {
    return <p>Unable to initialize the payment form.</p>;
  }

  return (
    <Elements
      key={clientSecret}
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
        },
      }}
    >
      <CardUpdateForm />
    </Elements>
  );
}
