import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { BotAPI } from "../utils/BotAPI";

const STRIPE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "";

function BillingInner({ customerId, clientSecret }) {
  const stripe = useStripe();
  const elements = useElements();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!stripe || !elements) {
      setError("Stripe not initialized");
      return;
    }

    setBusy(true);
    try {
      const { error: stripeError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/billing-success`,
        },
      });

      if (stripeError) {
        console.error("Stripe error:", stripeError);
        throw stripeError;
      }

      console.log("SetupIntent result:", setupIntent);

      // If we have a payment method and customer ID, set it as default
      if (setupIntent?.payment_method && customerId) {
        try {
          await BotAPI.billingSetDefaultPaymentMethod({
            customer_id: customerId,
            payment_method_id: setupIntent.payment_method,
          });
        } catch (err) {
          console.warn("Failed to set default payment method:", err);
          // Don't fail the whole process if this fails
        }
      }

      // Check if the setup intent succeeded
      if (setupIntent?.status === "succeeded") {
        nav("/billing-success", { replace: true });
      } else {
        setError(`Setup not completed. Status: ${setupIntent?.status}`);
      }
    } catch (err) {
      console.error("Billing submission error:", err);
      setError(err?.message || "Failed to save card");
    } finally {
      setBusy(false);
    }
  };

  if (!clientSecret) {
    return (
      <div className="text-center p-8">
        <div className="text-yellow-400">Loading payment form...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
        <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
        <p className="text-gray-400 text-sm mb-6">
          Add a card to pay performance fees. Your card will only be charged when you make profitable trades.
        </p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        <div className="space-y-4">
          <PaymentElement 
            options={{
              layout: "tabs",
              wallets: {
                applePay: "auto",
                googlePay: "auto"
              }
            }}
          />
          
          <button
            onClick={submit}
            disabled={busy || !stripe}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl font-semibold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              "Save Card"
            )}
          </button>
        </div>
      </div>
      
      <div className="text-xs text-gray-500 text-center">
        <p>Your card details are processed securely by Stripe. We never store your full card information.</p>
      </div>
    </div>
  );
}

export default function Billing() {
  const nav = useNavigate();
  const [clientSecret, setClientSecret] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userTier, setUserTier] = useState("starter");

  const stripePromise = useMemo(
    () => (STRIPE_KEY ? loadStripe(STRIPE_KEY) : null),
    []
  );

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem("imali_token");
    if (!token) {
      nav("/signup", { replace: true });
    }
  }, [nav]);

  useEffect(() => {
    (async () => {
      try {
        // First, get user info to check tier
        const userData = await BotAPI.me();
        setUserTier(userData?.user?.tier || "starter");
        
        // Then get setup intent
        const data = await BotAPI.billingSetupIntent();
        
        if (!data?.client_secret) {
          throw new Error("No client secret returned from server");
        }
        
        if (!data.client_secret.startsWith("seti_")) {
          console.warn("Client secret doesn't start with 'seti_':", data.client_secret);
        }

        setClientSecret(data.client_secret);
        setCustomerId(data.customer_id || "");
      } catch (err) {
        console.error("Failed to load billing setup:", err);
        setError(err.message || "Failed to load billing information");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading billing information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-md mx-auto">
          <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl">
            <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
            <p className="text-red-300">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-md mx-auto">
          <div className="p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <h2 className="text-xl font-bold text-yellow-400 mb-2">Stripe Not Configured</h2>
            <p className="text-yellow-300">
              Stripe is not properly configured. Please contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Billing Setup</h1>
          <p className="text-gray-400">
            Complete your billing setup to activate your {userTier} account
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary: '#3b82f6',
                    colorBackground: '#111827',
                    colorText: '#f9fafb',
                    colorDanger: '#ef4444',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    spacingUnit: '4px',
                    borderRadius: '12px',
                  }
                }
              }}
            >
              <BillingInner 
                customerId={customerId} 
                clientSecret={clientSecret} 
              />
            </Elements>
          </div>
          
          <div className="space-y-6">
            <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
              <h3 className="font-semibold mb-4">Fee Structure</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Your Tier:</span>
                  <span className="font-medium capitalize">{userTier}</span>
                </div>
                {userTier === "starter" ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Fee:</span>
                      <span className="font-medium">30%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Threshold:</span>
                      <span className="font-medium">3% P&L</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Only charged on profits above 3% of portfolio value
                    </p>
                  </>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Flat Fee:</span>
                    <span className="font-medium">5%</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
              <h3 className="font-semibold mb-4">Next Steps</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start">
                  <div className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mr-3 flex-shrink-0">
                    1
                  </div>
                  <span>Save your payment method</span>
                </li>
                <li className="flex items-start">
                  <div className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mr-3 flex-shrink-0">
                    2
                  </div>
                  <span>Connect required exchanges/wallet</span>
                </li>
                <li className="flex items-start">
                  <div className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mr-3 flex-shrink-0">
                    3
                  </div>
                  <span>Enable trading to activate your account</span>
                </li>
              </ul>
            </div>
            
            <Link
              to="/activation"
              className="block w-full py-3 text-center bg-gray-800 hover:bg-gray-700 rounded-xl font-medium transition-colors"
            >
              Back to Activation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}