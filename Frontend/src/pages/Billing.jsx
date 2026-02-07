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
        redirect: "if_required",
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
          console.log("Default payment method set successfully");
        } catch (err) {
          console.warn("Failed to set default payment method:", err);
          // Don't fail the whole process if this fails
        }
      }

      // Check if the setup intent succeeded
      if (setupIntent?.status === "succeeded") {
        console.log("Setup intent succeeded, redirecting...");
        nav("/billing-success", { replace: true });
      } else if (setupIntent?.status === "requires_payment_method") {
        setError("Please add a payment method");
      } else if (setupIntent?.status === "requires_action") {
        // Handle 3D Secure authentication
        const { error: confirmError } = await stripe.confirmCardSetup(clientSecret);
        if (confirmError) {
          throw confirmError;
        }
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
  const [userEmail, setUserEmail] = useState("");

  const stripePromise = useMemo(
    () => (STRIPE_KEY ? loadStripe(STRIPE_KEY) : null),
    []
  );

  // Auth guard
  useEffect(() => {
    const token = BotAPI.getToken();
    if (!token) {
      console.log("No token found, redirecting to signup");
      nav("/signup", { replace: true });
    }
  }, [nav]);

  useEffect(() => {
    (async () => {
      try {
        console.log("Loading billing setup...");
        
        // First, get user info to check tier
        console.log("Fetching user data...");
        const userData = await BotAPI.me();
        console.log("User data:", userData);
        
        setUserTier(userData?.user?.tier || "starter");
        setUserEmail(userData?.user?.email || "");
        
        // Check if user already has a card on file
        console.log("Checking card status...");
        try {
          const cardStatus = await BotAPI.billingCardStatus();
          console.log("Card status:", cardStatus);
          
          if (cardStatus?.has_card) {
            console.log("User already has a card on file");
            // User already has card, redirect to activation
            nav("/activation", { replace: true });
            return;
          }
        } catch (cardErr) {
          console.log("Card status check failed, continuing:", cardErr.message);
        }
        
        // Create setup intent
        console.log("Creating setup intent...");
        const data = await BotAPI.billingSetupIntent({
          email: userEmail,
          tier: userTier
        });
        console.log("Setup intent response:", data);
        
        if (!data?.client_secret) {
          throw new Error("No client secret returned from server");
        }
        
        // Validate client secret format
        const secret = data.client_secret;
        if (!secret.startsWith("seti_") && !secret.startsWith("secret_")) {
          console.warn("Client secret doesn't have expected prefix:", secret.substring(0, 20) + "...");
        } else {
          console.log("Client secret format looks OK");
        }

        setClientSecret(secret);
        setCustomerId(data.customer_id || data.customer || "");
        console.log("Setup intent loaded successfully");
        
      } catch (err) {
        console.error("Failed to load billing setup:", err);
        
        let errorMessage = err.message || "Failed to load billing information";
        
        // Handle specific errors
        if (err.status === 404) {
          errorMessage = "Billing endpoint not found. Please contact support.";
        } else if (err.status === 401) {
          errorMessage = "Session expired. Please log in again.";
          BotAPI.logout();
          setTimeout(() => nav("/login"), 2000);
        } else if (err.status === 403) {
          errorMessage = "You don't have permission to access billing.";
        } else if (err.status === 500) {
          errorMessage = "Server error. Please try again later.";
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    })();
  }, [nav, userEmail, userTier]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading billing information...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
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
            <p className="text-red-300 mb-4">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
              <Link
                to="/activation"
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium text-center transition-colors"
              >
                Back to Activation
              </Link>
            </div>
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
            <p className="text-yellow-300 mb-4">
              Stripe publishable key is missing. Please check your environment configuration.
            </p>
            <Link
              to="/activation"
              className="inline-block px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
            >
              Back to Activation
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-md mx-auto">
          <div className="p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <h2 className="text-xl font-bold text-yellow-400 mb-2">Setup Required</h2>
            <p className="text-yellow-300 mb-4">
              Unable to load payment form. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg font-medium transition-colors"
            >
              Refresh Page
            </button>
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
          {userEmail && (
            <p className="text-sm text-gray-500 mt-1">Account: {userEmail}</p>
          )}
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
            
            {/* Debug info for development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                <details>
                  <summary className="cursor-pointer text-sm text-gray-400">Debug Info</summary>
                  <div className="mt-2 text-xs text-gray-500">
                    <p>Client Secret: {clientSecret?.substring(0, 30)}...</p>
                    <p>Customer ID: {customerId || "None"}</p>
                    <p>User Tier: {userTier}</p>
                    <button 
                      onClick={() => console.log({
                        clientSecret: clientSecret?.substring(0, 50),
                        customerId,
                        userTier,
                        userEmail
                      })}
                      className="mt-2 text-xs text-blue-400"
                    >
                      Log Details
                    </button>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
