// src/pages/SignupForm.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

// Stripe Elements
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";

// Art
import StarterNFT from "../assets/images/nfts/nft-starter.png";
import ProNFT from "../assets/images/nfts/nft-pro.png";
import EliteNFT from "../assets/images/nfts/nft-elite.png";
import StockNFT from "../assets/images/nfts/nft-stock.png";
import BundleNFT from "../assets/images/nfts/nft-bundle.png";

// API Configuration
const API_BASE = process.env.REACT_APP_API_BASE || 
  (window.location.hostname === "localhost" 
    ? "http://localhost:8001" 
    : "https://api.imali-defi.com");

// Initialize Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY || "pk_test_xxx");

const API = {
  signup: `${API_BASE}/api/signup`,
  promoStatus: `${API_BASE}/api/promo/status`,
  setupIntent: `${API_BASE}/api/billing/create-setup-intent`,
  completeSetup: `${API_BASE}/api/billing/complete-setup`,
  checkout: `${API_BASE}/api/billing/create-checkout`,
  setupFlow: `${API_BASE}/api/billing/setup-flow`,
};

// Strategy options
const STRATEGIES = [
  { value: "momentum", label: "Growth", description: "Focuses on trending assets" },
  { value: "mean_reversion", label: "Conservative", description: "Targets price corrections" },
  { value: "ai_weighted", label: "Balanced", description: "AI-optimized portfolio mix" },
  { value: "volume_spike", label: "Aggressive", description: "High-risk, high-reward trades" },
];

// Tier configurations
const TIERS = {
  starter: {
    img: StarterNFT,
    label: "Starter",
    base: 0,
    monthly: "Free",
    color: "from-sky-500 to-sky-700",
    fee: "30% on profits over 3%",
    description: "Auto-trading only with performance fee",
    features: [
      "Auto Trading ONLY",
      "Performance-based fees",
      "Basic strategy access",
      "Email support"
    ]
  },
  pro: {
    img: ProNFT,
    label: "Pro",
    base: 19,
    monthly: "$19/month",
    color: "from-fuchsia-500 to-fuchsia-700",
    fee: "5% on profits over 3%",
    description: "Manual + Auto trading with lower fees",
    features: [
      "Manual + Auto Trading",
      "Reduced fees",
      "Advanced strategies",
      "Priority support",
      "Custom indicators"
    ]
  },
  elite: {
    img: EliteNFT,
    label: "Elite",
    base: 49,
    monthly: "$49/month",
    color: "from-amber-500 to-amber-700",
    fee: "5% on profits over 3%",
    description: "All features including DEX trading",
    features: [
      "All Pro features",
      "DEX trading access",
      "API integration",
      "24/7 support",
      "Portfolio management"
    ]
  },
  stock: {
    img: StockNFT,
    label: "Stocks",
    base: 99,
    monthly: "$99/month",
    color: "from-yellow-500 to-yellow-700",
    fee: "5% on profits over 3%",
    description: "Stock trading focused",
    features: [
      "Stock market focus",
      "Real-time data",
      "Advanced analytics",
      "Dedicated account manager"
    ]
  },
  bundle: {
    img: BundleNFT,
    label: "Bundle",
    base: 199,
    monthly: "$199/month",
    color: "from-zinc-500 to-zinc-700",
    fee: "5% on profits over 3%",
    description: "Complete trading package",
    features: [
      "All Elite features",
      "Stock market access",
      "Custom bot development",
      "White-glove service",
      "Quarterly strategy reviews"
    ]
  },
};

// Confetti animation
function fireConfetti(container) {
  if (!container) return;
  const EMOJI = ["🎉", "✨", "🏆", "💎", "🚀", "💰", "📈", "💹"];
  const pieces = 25;

  for (let i = 0; i < pieces; i++) {
    const span = document.createElement("span");
    span.textContent = EMOJI[Math.floor(Math.random() * EMOJI.length)];
    span.style.position = "fixed";
    span.style.left = Math.random() * 100 + "vw";
    span.style.top = "-2vh";
    span.style.fontSize = `${18 + Math.random() * 20}px`;
    span.style.zIndex = "9999";
    span.style.pointerEvents = "none";
    span.style.userSelect = "none";
    span.style.transition = "transform 1.2s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 1.2s ease-out";
    container.appendChild(span);

    requestAnimationFrame(() => {
      span.style.transform = `translateY(${110 + Math.random() * 80}vh) translateX(${(Math.random() - 0.5) * 100}px) rotate(${(Math.random() * 720) | 0}deg)`;
      span.style.opacity = "0";
    });

    setTimeout(() => {
      if (span.parentNode === container) {
        container.removeChild(span);
      }
    }, 1300);
  }
}

// Parse query parameters
function parseQueryParams(params) {
  const tier = (params.get("tier") || "").toLowerCase().trim();
  const strategy = (params.get("strategy") || "").toLowerCase().trim();
  
  return {
    tier: TIERS[tier] ? tier : "starter",
    strategy: STRATEGIES.some(s => s.value === strategy) ? strategy : "ai_weighted"
  };
}

// Payment Form Component
function PaymentForm({ userData, onComplete, onError, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError("");

    try {
      // Confirm the SetupIntent
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/signup/complete`,
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (setupIntent.status !== "succeeded") {
        throw new Error(`SetupIntent status: ${setupIntent.status}`);
      }

      // Call backend to complete setup
      const completeResponse = await axios.post(API.completeSetup, {
        user_id: userData.user_id,
        setup_intent_id: setupIntent.id,
      });

      if (!completeResponse.data?.ok) {
        throw new Error(completeResponse.data?.detail || "Setup completion failed");
      }

      onComplete(completeResponse.data);

    } catch (err) {
      console.error("Payment setup failed:", err);
      setError(err.message || "Payment setup failed");
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-300">
        <p className="mb-2">🔒 Secure billing setup required for all tiers</p>
        <p>Your card will be charged performance fees (30% on profits over 3% for Starter).</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 border border-gray-600 rounded-xl bg-gray-900/30">
          <PaymentElement />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!stripe || loading}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              !stripe || loading
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Processing...
              </div>
            ) : (
              "Save Payment Method"
            )}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 rounded-xl border border-gray-600 hover:border-gray-500 hover:bg-gray-800/30 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// Subscription Checkout Component
function SubscriptionCheckout({ userData, tier, onComplete, onError }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubscribe = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(API.checkout, {
        tier: tier,
        stripe_customer_id: userData.stripe_customer_id,
        user_id: userData.user_id,
      });

      if (!response.data?.ok) {
        throw new Error(response.data?.detail || "Checkout creation failed");
      }

      const { client_secret, requires_action } = response.data;

      if (requires_action && client_secret) {
        onComplete({ client_secret, requires_action: true });
      } else {
        onComplete({});
      }
      
    } catch (err) {
      console.error("Subscription failed:", err);
      setError(err.message || "Subscription setup failed");
      onError(err);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
            <span className="text-xl">✨</span>
          </div>
          <div>
            <div className="font-bold">{TIERS[tier].label} Tier</div>
            <div className="text-sm text-gray-300">{TIERS[tier].monthly}</div>
          </div>
        </div>
        <p className="text-sm text-gray-300">
          Complete your subscription to unlock all {TIERS[tier].label} features.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={handleSubscribe}
        disabled={loading}
        className={`w-full py-3 px-4 rounded-xl font-medium transition-all ${
          loading
            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Processing...
          </div>
        ) : (
          `Subscribe to ${TIERS[tier].label} - ${TIERS[tier].monthly}`
        )}
      </button>

      <button
        onClick={() => onComplete({ skip: true })}
        className="w-full py-3 px-4 rounded-xl border border-gray-600 hover:border-gray-500 hover:bg-gray-800/30 transition-colors text-sm"
      >
        Skip for now (trading disabled)
      </button>
    </div>
  );
}

export default function SignupForm() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const confettiRootRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    tier: "starter",
    strategy: "ai_weighted"
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [promo, setPromo] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [signupData, setSignupData] = useState(null);
  const [billingStep, setBillingStep] = useState("signup"); // signup, payment, subscription, complete
  const [setupIntentClientSecret, setSetupIntentClientSecret] = useState("");

  // Initialize from query params
  useEffect(() => {
    const { tier, strategy } = parseQueryParams(params);
    setFormData(prev => ({ ...prev, tier, strategy }));
  }, [params]);

  // Fetch promo status
  useEffect(() => {
    let mounted = true;

    const fetchPromoStatus = async () => {
      try {
        const { data } = await axios.get(API.promoStatus, {
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' }
        });
        if (mounted && data) {
          setPromo(data);
        }
      } catch (err) {
        console.warn("Could not fetch promo status:", err.message);
      }
    };

    fetchPromoStatus();
    return () => { mounted = false; };
  }, []);

  // Email validation
  const emailValid = useMemo(() => {
    const email = formData.email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [formData.email]);

  // Password validation
  const passwordValid = useMemo(() => {
    return formData.password.length >= 8;
  }, [formData.password]);

  // Form validation
  const formValid = emailValid && passwordValid;

  // Current tier info
  const currentTier = TIERS[formData.tier];
  const currentStrategy = STRATEGIES.find(s => s.value === formData.strategy);

  // Handle form input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  // Step 1: Signup
  const handleSignup = async (e) => {
    e.preventDefault();
    if (loading || !formValid) return;

    setLoading(true);
    setError("");
    setDebugInfo(null);

    try {
      const cleanEmail = formData.email.trim();
      const executionMode = formData.tier === "starter" ? "auto" : "manual";

      console.log("Starting signup process...");

      const signupPayload = {
        email: cleanEmail,
        password: formData.password,
        tier: formData.tier,
        strategy: formData.strategy,
        execution_mode: executionMode,
        source: "web_signup"
      };

      console.log("Sending signup request:", { ...signupPayload, password: "***" });

      const signupResponse = await axios.post(API.signup, signupPayload, {
        timeout: 15000,
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log("Signup response:", signupResponse.data);

      if (!signupResponse.data?.ok) {
        throw new Error(signupResponse.data?.detail || signupResponse.data?.message || "Signup failed");
      }

      const userData = signupResponse.data;
      setSignupData(userData);

      // Store user data locally
      localStorage.setItem("IMALI_USER", JSON.stringify({
        email: cleanEmail,
        tier: formData.tier,
        strategy: formData.strategy,
        user_id: userData.user_id,
        stripe_customer_id: userData.stripe_customer_id,
        timestamp: Date.now()
      }));

      // Move to payment step
      setBillingStep("payment");

      // Create SetupIntent for payment method collection
      const setupIntentResponse = await axios.post(API.setupIntent, {
        stripe_customer_id: userData.stripe_customer_id,
        user_id: userData.user_id,
        tier: formData.tier,
      });

      if (!setupIntentResponse.data?.ok) {
        throw new Error(setupIntentResponse.data?.detail || "Payment setup failed");
      }

      setSetupIntentClientSecret(setupIntentResponse.data.client_secret);

    } catch (error) {
      console.error("Signup process failed:", error);

      let errorMessage = "An unexpected error occurred. Please try again.";

      if (error.response) {
        const { status, data } = error.response;
        console.error("Server error response:", { status, data });

        switch (status) {
          case 400:
            errorMessage = data?.detail || data?.error || data?.message || "Invalid request data";
            break;
          case 401:
            errorMessage = "Authentication failed";
            break;
          case 409:
            errorMessage = "Account already exists with this email";
            break;
          case 422:
            errorMessage = data?.detail || "Validation error";
            break;
          case 429:
            errorMessage = "Too many requests. Please try again later";
            break;
          case 500:
            errorMessage = "Server error. Our team has been notified";
            break;
          default:
            errorMessage = `Server error (${status})`;
        }

        setDebugInfo({
          status,
          data,
          url: error.config?.url,
          method: error.config?.method
        });
      } else if (error.request) {
        errorMessage = "Network error. Please check your internet connection";
      } else {
        errorMessage = error.message || "Request failed";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Payment method setup complete
  const handlePaymentComplete = async (result) => {
    try {
      if (formData.tier === "starter") {
        // Starter tier is now ready
        setSuccess(true);
        fireConfetti(confettiRootRef.current);

        setTimeout(() => {
          navigate("/dashboard", { 
            state: { 
              message: "Welcome! Your billing setup is complete and trading is now enabled." 
            }
          });
        }, 1500);
      } else {
        // Paid tiers need subscription
        setBillingStep("subscription");
      }
    } catch (err) {
      setError("Failed to complete billing setup: " + err.message);
      setBillingStep("signup");
    }
  };

  // Step 3: Subscription complete
  const handleSubscriptionComplete = (result) => {
    setSuccess(true);
    fireConfetti(confettiRootRef.current);

    if (result.skip) {
      // User skipped subscription
      setTimeout(() => {
        navigate("/dashboard", { 
          state: { 
            message: "Account created! Please subscribe to enable trading features." 
          }
        });
      }, 1500);
    } else if (result.requires_action && result.client_secret) {
      // Handle 3D Secure authentication
      // You would typically handle this with Stripe.js
      console.log("Requires 3D Secure authentication");
    } else {
      // Subscription successful
      setTimeout(() => {
        navigate("/dashboard", { 
          state: { 
            message: "Welcome! Your subscription is active and trading is now enabled." 
          }
        });
      }, 1500);
    }
  };

  // Render billing steps
  const renderBillingStep = () => {
    switch (billingStep) {
      case "payment":
        return (
          <Elements stripe={stripePromise} options={{
            clientSecret: setupIntentClientSecret,
            appearance: {
              theme: 'night',
              variables: {
                colorPrimary: '#6366f1',
                colorBackground: '#0f172a',
                colorText: '#f8fafc',
              },
            },
          }}>
            <PaymentForm
              userData={signupData}
              onComplete={handlePaymentComplete}
              onError={(err) => setError(err.message)}
              onCancel={() => setBillingStep("signup")}
            />
          </Elements>
        );

      case "subscription":
        return (
          <SubscriptionCheckout
            userData={signupData}
            tier={formData.tier}
            onComplete={handleSubscriptionComplete}
            onError={(err) => setError(err.message)}
          />
        );

      case "complete":
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎉</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Setup Complete!</h3>
            <p className="text-gray-300 mb-6">Redirecting to dashboard...</p>
          </div>
        );

      default:
        return (
          <form onSubmit={handleSignup} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className={`w-full px-4 py-3 rounded-xl bg-gray-900/50 border ${
                  formData.email ? 
                    (emailValid ? "border-emerald-500/50" : "border-red-500/50") : 
                    "border-gray-600"
                } focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all`}
                placeholder="you@example.com"
                disabled={loading || success}
                required
              />
              {formData.email && !emailValid && (
                <p className="mt-1 text-sm text-red-400">Please enter a valid email address</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className={`w-full px-4 py-3 rounded-xl bg-gray-900/50 border ${
                  formData.password ? 
                    (passwordValid ? "border-emerald-500/50" : "border-red-500/50") : 
                    "border-gray-600"
                } focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all`}
                placeholder="At least 8 characters"
                disabled={loading || success}
                required
              />
              <p className="mt-1 text-sm text-gray-400">
                {formData.password.length > 0 && !passwordValid 
                  ? "Password must be at least 8 characters"
                  : "Use a strong, unique password"
                }
              </p>
            </div>

            {/* Strategy Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Trading Strategy
              </label>
              <div className="grid grid-cols-2 gap-3">
                {STRATEGIES.map((strategyOption) => (
                  <button
                    key={strategyOption.value}
                    type="button"
                    onClick={() => handleChange("strategy", strategyOption.value)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      formData.strategy === strategyOption.value
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-gray-600 bg-gray-900/30 hover:border-gray-500"
                    }`}
                    disabled={loading || success}
                  >
                    <div className="font-medium">{strategyOption.label}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {strategyOption.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tier Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Your Tier
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(TIERS).map(([key, tierOption]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleChange("tier", key)}
                    className={`p-4 rounded-xl border transition-all relative overflow-hidden ${
                      formData.tier === key
                        ? "border-blue-500 bg-gradient-to-br from-gray-800 to-gray-900"
                        : "border-gray-600 bg-gray-900/30 hover:border-gray-500"
                    }`}
                    disabled={loading || success}
                  >
                    {formData.tier === key && (
                      <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-bl-full" />
                    )}
                    <div className="flex items-center gap-3 mb-2">
                      <img
                        src={tierOption.img}
                        alt={tierOption.label}
                        className="w-10 h-10 rounded-lg"
                      />
                      <div>
                        <div className="font-bold text-left">{tierOption.label}</div>
                        <div className="text-sm font-semibold">{tierOption.monthly}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-300 text-left">
                      {tierOption.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Terms */}
            <div className="text-xs text-gray-400">
              <p className="mb-2">
                By creating an account, you agree to our{" "}
                <Link to="/terms" className="text-blue-400 hover:text-blue-300 underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                  Privacy Policy
                </Link>.
              </p>
              <p className="text-amber-300/80">
                💳 <strong>Billing setup required:</strong> All tiers need payment method for performance fees.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!formValid || loading || success}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                !formValid || loading || success
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Creating Account...</span>
                </div>
              ) : success ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl">✨</span>
                  <span>Redirecting...</span>
                </div>
              ) : (
                "Create Account & Setup Billing"
              )}
            </button>

            {/* Login Link */}
            <div className="text-center text-sm text-gray-400 pt-4 border-t border-gray-700">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-blue-400 hover:text-blue-300 font-medium underline"
              >
                Log in here
              </Link>
            </div>
          </form>
        );
    }
  };

  return (
    <div
      ref={confettiRootRef}
      className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 text-white"
    >
      {/* Debug info - only show in development */}
      {process.env.NODE_ENV === 'development' && debugInfo && (
        <div className="fixed top-4 right-4 z-50 max-w-md bg-gray-800 border border-gray-700 rounded-lg p-4 text-xs overflow-auto max-h-64">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-red-400">Debug Info</span>
            <button 
              onClick={() => setDebugInfo(null)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-10 md:mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-4">
            {billingStep === "payment" ? "Secure Billing Setup" : 
             billingStep === "subscription" ? "Complete Your Subscription" : 
             "Start Your Trading Journey"}
          </h1>
          
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-6">
            {billingStep === "payment" ? 
              "Add a payment method for performance fee collection (required)" :
              billingStep === "subscription" ? 
              `Subscribe to ${currentTier.label} tier to unlock all features` :
              "Join thousands of traders using AI-powered strategies to maximize returns"
            }
          </p>
          
          {promo && billingStep === "signup" && (
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-sm font-semibold shadow-lg">
              🎯 {promo.message || "First 50 users get 90 days of reduced fees!"}
            </div>
          )}

          {/* API debug - development only */}
          {process.env.NODE_ENV === 'development' && billingStep === "signup" && (
            <div className="mt-3 text-xs text-gray-500">
              API: {API_BASE}
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - Tier Selection & Info */}
          <div className="lg:w-2/5 space-y-6">
            {/* Tier Card */}
            <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700 p-6 shadow-xl">
              <div className={`inline-flex px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r ${currentTier.color} mb-4`}>
                {currentTier.label} Tier
              </div>

              <div className="flex items-start gap-4 mb-6">
                <img
                  src={currentTier.img}
                  alt={currentTier.label}
                  className="w-20 h-20 rounded-xl ring-2 ring-white/10 shadow-lg"
                />
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{currentTier.monthly}</span>
                    {currentTier.base > 0 && (
                      <span className="text-sm text-gray-400">/month</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-300 mt-1">
                    {currentTier.fee} performance fee
                  </div>
                  <div className="text-emerald-300 text-sm mt-2 flex items-center gap-1">
                    <span>⚡</span>
                    <span>{currentTier.description}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {currentTier.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    </div>
                    <span className="text-sm text-gray-200">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="text-xs text-gray-400 pt-4 border-t border-gray-700">
                {billingStep === "payment" ? (
                  <>Add payment method to enable trading</>
                ) : billingStep === "subscription" ? (
                  <>Subscribe now to unlock all features</>
                ) : formData.tier === "starter" ? (
                  <>Free tier requires billing setup for performance fee collection</>
                ) : (
                  <>Includes all features from lower tiers</>
                )}
              </div>
            </div>

            {/* Billing Steps */}
            <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700 p-6 shadow-xl">
              <h3 className="font-bold text-lg mb-4">Billing Setup</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    billingStep === "signup" ? "bg-blue-500/20 border border-blue-500" :
                    billingStep === "payment" ? "bg-blue-500" :
                    "bg-emerald-500"
                  }`}>
                    <span className="text-sm">1</span>
                  </div>
                  <span className={`text-sm ${billingStep === "signup" ? "text-white" : "text-gray-400"}`}>
                    Create Account
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    billingStep === "payment" ? "bg-blue-500" :
                    billingStep === "subscription" || billingStep === "complete" ? "bg-emerald-500" :
                    "bg-gray-700"
                  }`}>
                    <span className="text-sm">2</span>
                  </div>
                  <span className={`text-sm ${billingStep === "payment" ? "text-white" : "text-gray-400"}`}>
                    Add Payment Method
                  </span>
                </div>
                {formData.tier !== "starter" && (
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      billingStep === "subscription" ? "bg-blue-500" :
                      billingStep === "complete" ? "bg-emerald-500" :
                      "bg-gray-700"
                    }`}>
                      <span className="text-sm">3</span>
                    </div>
                    <span className={`text-sm ${billingStep === "subscription" ? "text-white" : "text-gray-400"}`}>
                      Subscribe ({currentTier.monthly})
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    billingStep === "complete" ? "bg-emerald-500" : "bg-gray-700"
                  }`}>
                    <span className="text-sm">{formData.tier === "starter" ? "3" : "4"}</span>
                  </div>
                  <span className={`text-sm ${billingStep === "complete" ? "text-white" : "text-gray-400"}`}>
                    Start Trading
                  </span>
                </div>
              </div>
            </div>

            {/* Strategy Info */}
            <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700 p-6 shadow-xl">
              <h3 className="font-bold text-lg mb-4">Selected Strategy</h3>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentTier.color} flex items-center justify-center`}>
                  <span className="text-xl">🎯</span>
                </div>
                <div>
                  <div className="font-semibold">{currentStrategy?.label}</div>
                  <div className="text-sm text-gray-300">{currentStrategy?.description}</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-400">
                You can change strategies anytime in your dashboard.
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="lg:w-3/5">
            <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700 shadow-xl overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${currentTier.color}`} />
              
              <div className="p-6 md:p-8">
                {billingStep === "payment" && (
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2">Add Payment Method</h2>
                    <p className="text-gray-400 mb-6">
                      Your card will be charged performance fees when you make profits.
                      Starter: 30% on profits over 3%. Paid tiers: 5% on profits over 3%.
                    </p>
                  </div>
                )}

                {billingStep === "subscription" && (
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2">Complete Your Subscription</h2>
                    <p className="text-gray-400 mb-6">
                      Subscribe to {currentTier.label} tier to unlock all features.
                      {currentTier.monthly} + {currentTier.fee} performance fee.
                    </p>
                  </div>
                )}

                {billingStep === "signup" && (
                  <>
                    <h2 className="text-2xl font-bold mb-2">Create Your Account</h2>
                    <p className="text-gray-400 mb-6">
                      Enter your details to get started. All tiers require billing setup for performance fee collection.
                    </p>
                  </>
                )}

                {success && (
                  <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <div className="flex items-center gap-2 text-emerald-300">
                      <span className="text-xl">🎉</span>
                      <span>Setup complete! Redirecting to dashboard...</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">⚠️</span>
                      <div className="flex-1">
                        <div className="font-medium text-red-300">
                          {billingStep === "payment" ? "Payment Setup Failed" : 
                           billingStep === "subscription" ? "Subscription Failed" : 
                           "Signup Failed"}
                        </div>
                        <div className="text-sm text-red-200/80 mt-1">{error}</div>
                        {process.env.NODE_ENV === 'development' && (
                          <button
                            onClick={() => console.error("Error details:", { error, debugInfo })}
                            className="text-xs text-red-300 underline mt-2"
                          >
                            View details
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {renderBillingStep()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
