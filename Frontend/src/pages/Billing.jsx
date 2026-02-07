import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { BotAPI } from "../utils/BotAPI";

const STRIPE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "pk_test_your_test_key_here";

function BillingInner({ customerId, clientSecret, userTier }) {
  const stripe = useStripe();
  const elements = useElements();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async () => {
    setError("");
    setSuccess("");
    
    if (!stripe || !elements) {
      setError("Payment system is initializing. Please wait...");
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
          // Continue anyway - this is not critical
        }
      }

      // Check if the setup intent succeeded
      if (setupIntent?.status === "succeeded") {
        setSuccess("Payment method saved successfully! Redirecting...");
        
        // Update user's billing status
        try {
          await BotAPI.me(); // This will refresh user data
        } catch (err) {
          console.warn("Could not refresh user data:", err);
        }
        
        setTimeout(() => {
          nav("/activation", { replace: true });
        }, 1500);
      } else if (setupIntent?.status === "requires_payment_method") {
        setError("Please add a payment method and try again");
      } else if (setupIntent?.status === "requires_action") {
        // Handle 3D Secure authentication
        setSuccess("Verifying your card... Please complete authentication.");
        
        const { error: confirmError } = await stripe.confirmCardSetup(clientSecret);
        if (confirmError) {
          throw confirmError;
        }
        
        setSuccess("Card verified successfully! Redirecting...");
        setTimeout(() => {
          nav("/activation", { replace: true });
        }, 1500);
      } else {
        setError(`Payment setup incomplete. Status: ${setupIntent?.status}`);
      }
    } catch (err) {
      console.error("Billing submission error:", err);
      setError(err?.message || "Failed to save card. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!clientSecret) {
    return (
      <div className="text-center p-8">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-400">Loading secure payment form...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-800 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <span className="text-blue-400">💳</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Payment Method</h2>
            <p className="text-gray-400 text-sm">
              Your card will only be charged when you make profitable trades
            </p>
          </div>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="text-red-400 text-lg">⚠️</div>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="text-emerald-400 text-lg">✓</div>
              <p className="text-emerald-400 text-sm">{success}</p>
            </div>
          </div>
        )}
        
        <div className="space-y-6">
          <PaymentElement 
            options={{
              layout: "tabs",
              wallets: {
                applePay: "auto",
                googlePay: "auto"
              },
              fields: {
                billingDetails: {
                  email: 'never'
                }
              }
            }}
          />
          
          <button
            onClick={submit}
            disabled={busy || !stripe}
            className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
          >
            {busy ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Securing Your Card...
              </span>
            ) : (
              "Save Payment Method"
            )}
          </button>
        </div>
      </div>
      
      <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="text-emerald-400 text-lg">🔒</div>
          <div>
            <p className="text-sm text-gray-300">
              Powered by <span className="text-white font-medium">Stripe</span> • Bank-level security
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Your card details are encrypted and never stored on our servers
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Billing() {
  const nav = useNavigate();
  const location = useLocation();
  const [clientSecret, setClientSecret] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userTier, setUserTier] = useState("starter");
  const [userEmail, setUserEmail] = useState("");
  const [cardStatus, setCardStatus] = useState(null);

  const stripePromise = useMemo(() => {
    if (!STRIPE_KEY || STRIPE_KEY.includes("your_test_key")) {
      console.warn("Stripe key not configured. Using test mode.");
      return loadStripe("pk_test_51YourTestKeyHere");
    }
    return loadStripe(STRIPE_KEY);
  }, []);

  // Auth guard
  useEffect(() => {
    const token = BotAPI.getToken();
    if (!token) {
      console.log("No token found, redirecting to signup");
      nav("/signup", { replace: true });
    }
  }, [nav]);

  const loadBillingData = async () => {
    try {
      console.log("Loading billing setup...");
      
      // Get user info
      const userData = await BotAPI.me();
      console.log("User data:", userData);
      
      const user = userData?.user || userData;
      setUserTier(user?.tier || "starter");
      setUserEmail(user?.email || "");
      
      // Check if user already has a card on file
      try {
        const cardStatus = await BotAPI.billingCardStatus();
        console.log("Card status:", cardStatus);
        
        if (cardStatus?.has_card) {
          setCardStatus(cardStatus);
          console.log("User already has a card on file");
          
          // If just signed up, still show billing for confirmation
          if (!location.state?.justSignedUp) {
            nav("/activation", { replace: true });
            return;
          }
        }
      } catch (cardErr) {
        console.log("Card status check:", cardErr.message);
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
      
      setClientSecret(data.client_secret);
      setCustomerId(data.customer_id || data.customer || "");
      console.log("Setup intent loaded successfully");
      
    } catch (err) {
      console.error("Failed to load billing setup:", err);
      
      let errorMessage = "Failed to load billing information";
      
      if (err.status === 404) {
        errorMessage = "Billing service is currently unavailable. Please try again later.";
      } else if (err.status === 401) {
        errorMessage = "Your session has expired. Please log in again.";
        BotAPI.logout();
        setTimeout(() => nav("/login"), 2000);
      } else if (err.status === 403) {
        errorMessage = "Access denied. Please contact support.";
      } else if (err.status === 500) {
        errorMessage = "Server error. Our team has been notified. Please try again in a few minutes.";
      } else if (err.message.includes("client_secret")) {
        errorMessage = "Payment system configuration error. Please contact support.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-gray-800"></div>
            <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-4 text-lg">Preparing your secure payment portal...</p>
          <p className="text-sm text-gray-500 mt-2">This usually takes just a moment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 text-white p-6">
        <div className="max-w-md mx-auto pt-20">
          <div className="p-8 bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-800 shadow-2xl">
            <div className="text-center mb-6">
              <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-red-400 text-2xl">⚠️</span>
              </div>
              <h2 className="text-2xl font-bold text-red-400 mb-2">Unable to Load Billing</h2>
              <p className="text-red-300 mb-6">{error}</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={loadBillingData}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl font-medium transition-colors"
              >
                Try Again
              </button>
              <Link
                to="/activation"
                className="w-full py-3 text-center bg-gray-800 hover:bg-gray-700 rounded-xl font-medium transition-colors"
              >
                Back to Activation
              </Link>
              <Link
                to="/dashboard"
                className="w-full py-3 text-center bg-gray-900 hover:bg-gray-800 rounded-xl font-medium transition-colors text-gray-400"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 text-white p-6">
        <div className="max-w-md mx-auto">
          <div className="p-8 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl">
            <h2 className="text-xl font-bold text-yellow-400 mb-2">Payment System Configuration</h2>
            <p className="text-yellow-300 mb-4">
              The payment system requires additional configuration. Please contact support.
            </p>
            <div className="space-y-3">
              <Link
                to="/activation"
                className="block w-full py-3 text-center bg-gray-800 hover:bg-gray-700 rounded-xl font-medium transition-colors"
              >
                Back to Activation
              </Link>
              <a
                href="mailto:support@imali-defi.com"
                className="block w-full py-3 text-center bg-yellow-600 hover:bg-yellow-700 rounded-xl font-medium transition-colors"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 text-white p-6">
        <div className="max-w-md mx-auto">
          <div className="p-8 bg-blue-500/10 border border-blue-500/30 rounded-2xl">
            <h2 className="text-xl font-bold text-blue-400 mb-2">Setup Required</h2>
            <p className="text-blue-300 mb-6">
              Unable to initialize payment form. Please refresh the page or contact support if the issue persists.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition-colors"
              >
                Refresh Page
              </button>
              <Link
                to="/activation"
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium text-center transition-colors"
              >
                Go Back
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const feeInfo = {
    starter: {
      description: "Perfect for beginners",
      fee: "30%",
      threshold: "3% P&L",
      details: "Only charged on profits above 3% of portfolio value",
      features: ["AI Trading", "Basic Analytics", "Email Support"]
    },
    pro: {
      description: "For active traders",
      fee: "5% flat",
      threshold: "No threshold",
      details: "Charged on all profitable trades",
      features: ["Advanced AI", "Real-time Analytics", "Priority Support", "API Access"]
    },
    elite: {
      description: "For professional traders",
      fee: "5% flat",
      threshold: "No threshold",
      details: "Charged on all profitable trades",
      features: ["All Pro Features", "Custom Strategies", "Dedicated Account Manager", "24/7 Phone Support"]
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Complete Your Setup
              </h1>
              <p className="text-gray-400 mt-2">
                Final step to activate your {userTier} trading account
              </p>
              {userEmail && (
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  Account: {userEmail}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-full text-sm">
                <span className="text-gray-400">Tier: </span>
                <span className="font-medium capitalize text-blue-400">{userTier}</span>
              </div>
              {cardStatus?.has_card && (
                <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">
                  Card on File ✓
                </div>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6 md:mt-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Account Setup Progress</span>
              <span className="text-sm font-medium">Step 1 of 3</span>
            </div>
            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: '33%' }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span className={cardStatus?.has_card ? "text-emerald-400 font-medium" : ""}>
                Payment Method
              </span>
              <span>Exchange Connections</span>
              <span>Enable Trading</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <div className="sticky top-6">
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
                    },
                    rules: {
                      '.Input': {
                        border: '1px solid #374151',
                        backgroundColor: '#1f2937',
                      },
                      '.Input:focus': {
                        borderColor: '#3b82f6',
                        boxShadow: '0 0 0 1px #3b82f6',
                      }
                    }
                  }
                }}
              >
                <BillingInner 
                  customerId={customerId} 
                  clientSecret={clientSecret}
                  userTier={userTier}
                />
              </Elements>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Fee Structure Card */}
            <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-800 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <span className="text-purple-400">💰</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Fee Structure</h3>
                  <p className="text-gray-400 text-sm">{feeInfo[userTier].description}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-800/30 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">Performance Fee:</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      {feeInfo[userTier].fee}
                    </span>
                  </div>
                  {userTier === "starter" && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Threshold:</span>
                      <span className="font-medium">{feeInfo[userTier].threshold}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-3">
                    {feeInfo[userTier].details}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">Included Features:</h4>
                  <ul className="space-y-2">
                    {feeInfo[userTier].features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <span className="text-blue-400 text-xs">✓</span>
                        </div>
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Next Steps Card */}
            <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-800 shadow-xl">
              <h3 className="font-semibold text-lg mb-4">Next Steps</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${cardStatus?.has_card ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"}`}>
                    {cardStatus?.has_card ? "✓" : "1"}
                  </div>
                  <div>
                    <div className="font-medium">Payment Method</div>
                    <p className="text-sm text-gray-400">
                      {cardStatus?.has_card ? "Complete ✓" : "Add your card (current step)"}
                    </p>
                  </div>
                </li>
                
                <li className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-800/50 text-gray-400 flex items-center justify-center flex-shrink-0">
                    2
                  </div>
                  <div>
                    <div className="font-medium">Exchange Connections</div>
                    <p className="text-sm text-gray-400">
                      Connect required trading accounts
                    </p>
                  </div>
                </li>
                
                <li className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-800/50 text-gray-400 flex items-center justify-center flex-shrink-0">
                    3
                  </div>
                  <div>
                    <div className="font-medium">Enable Trading</div>
                    <p className="text-sm text-gray-400">
                      Activate your automated trading bot
                    </p>
                  </div>
                </li>
              </ul>
              
              <div className="mt-6 space-y-3">
                <Link
                  to="/activation"
                  className="block w-full py-3 text-center bg-gray-800 hover:bg-gray-700 rounded-xl font-medium transition-colors"
                >
                  View Full Activation Steps
                </Link>
                
                <a
                  href="https://docs.imali-defi.com/billing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 text-center bg-gray-900 hover:bg-gray-800 rounded-xl font-medium transition-colors text-sm text-gray-400"
                >
                  Learn More About Billing
                </a>
              </div>
            </div>
            
            {/* Security Info */}
            <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="text-emerald-400 text-xl">🛡️</div>
                <div>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">No upfront fees</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    You'll only be charged when you make profitable trades
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-500">
              Questions? <a href="mailto:support@imali-defi.com" className="text-blue-400 hover:text-blue-300">Contact Support</a>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/privacy" className="text-gray-500 hover:text-gray-400">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-gray-500 hover:text-gray-400">
                Terms of Service
              </Link>
              <span className="text-gray-600">|</span>
              <span className="text-gray-500">Secured by Stripe</span>
            </div>
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}