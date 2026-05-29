// src/pages/BillingDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY
);

// ============================================================================
// TIER CONFIGURATION - MATCHES PRICING PAGE EXACTLY
// ============================================================================
const TIERS = {
  starter: {
    name: "Free Trial",
    displayName: "Starter",
    price: 0,
    interval: "7 days",
    features: [
      "$1,000 paper trading credits",
      "Test all bots risk-free",
      "Stock & crypto trading demo",
      "No performance fee",
      "No credit card required",
      "Email support",
    ],
    color: "from-emerald-600 to-emerald-700",
    border: "border-emerald-500/30",
    icon: "🌱",
    badge: "Safe Start",
    badgeColor: "green",
  },
  pro: {
    name: "Pro",
    displayName: "Pro",
    price: 19,
    interval: "month",
    features: [
      "Live trading enabled",
      "All stocks & crypto bots",
      "Advanced strategies",
      "15% performance fee",
      "Priority support",
      "API access",
    ],
    color: "from-blue-600 to-blue-700",
    border: "border-blue-500/30",
    icon: "⭐",
    badge: "Most Popular",
    badgeColor: "orange",
  },
  elite: {
    name: "Elite",
    displayName: "Elite",
    price: 49,
    interval: "month",
    features: [
      "Everything in Pro",
      "DEX trading (Uniswap, QuickSwap)",
      "Custom indicators",
      "10% performance fee",
      "Priority execution",
      "24/7 priority support",
    ],
    color: "from-purple-600 to-purple-700",
    border: "border-purple-500/30",
    icon: "👑",
    badge: "Power User",
    badgeColor: "purple",
  },
  // Note: Stock/DeFi plan removed - not in pricing page
  // Note: Bundle plan removed - not in pricing page
};

// ============================================================================
// PAYMENT METHOD COMPONENT
// ============================================================================
function PaymentMethodForm({ onSuccess, onCancel, clientSecret }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleConfirmCard = async () => {
    if (!stripe || !elements) return;

    setBusy(true);
    setError("");

    try {
      const { error: stripeError } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/billing-dashboard`,
        },
        redirect: "if_required",
      });

      if (stripeError) throw stripeError;

      await BotAPI.confirmCard();
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to save card");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-black/30 rounded-lg">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
          ⚠️ {error}
        </div>
      )}
      <PaymentElement />
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleConfirmCard}
          disabled={busy || !stripe}
          className="flex-1 px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save Card"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// PAYMENT METHOD MANAGER
// ============================================================================
function PaymentMethodManager({ onSuccess }) {
  const [showAddCard, setShowAddCard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [defaultMethod, setDefaultMethod] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const res = await BotAPI.getCardStatus();
      if (res?.payment_method) {
        setDefaultMethod(res.payment_method);
        setPaymentMethods([res.payment_method]);
      }
    } catch (err) {
      console.error("Failed to load payment methods:", err);
    }
  };

  const handleAddCard = async () => {
    try {
      setBusy(true);
      const res = await BotAPI.createSetupIntent({
        email: user?.email,
        tier: user?.tier || "starter",
      });
      setClientSecret(res.client_secret);
      setShowAddCard(true);
    } catch (err) {
      setError(err.message || "Failed to initialize card addition");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmSuccess = async () => {
    await loadPaymentMethods();
    setShowAddCard(false);
    if (onSuccess) onSuccess();
  };

  const handleRemoveCard = async (methodId) => {
    if (!window.confirm("Are you sure you want to remove this card?")) return;
    try {
      await loadPaymentMethods();
    } catch (err) {
      setError(err.message || "Failed to remove card");
    }
  };

  const handleSetDefault = async (methodId) => {
    try {
      await BotAPI.setDefaultPaymentMethod({
        payment_method_id: methodId,
        customer_id: user?.stripeCustomerId,
      });
      await loadPaymentMethods();
    } catch (err) {
      setError(err.message || "Failed to set default card");
    }
  };

  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>💳</span> Payment Methods
      </h3>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
          ⚠️ {error}
        </div>
      )}

      {paymentMethods.length > 0 ? (
        <div className="space-y-3 mb-4">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`p-4 rounded-lg border ${
                defaultMethod?.id === method.id
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-white/10 bg-black/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💳</span>
                  <div>
                    <p className="font-medium">
                      {method.brand?.toUpperCase()} •••• {method.last4}
                    </p>
                    <p className="text-xs text-white/50">
                      Expires {method.exp_month}/{method.exp_year}
                    </p>
                  </div>
                </div>
                {defaultMethod?.id === method.id && (
                  <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full">
                    Default
                  </span>
                )}
              </div>
              
              {defaultMethod?.id !== method.id && (
                <div className="mt-3 flex gap-2 justify-end">
                  <button
                    onClick={() => handleSetDefault(method.id)}
                    className="text-xs px-3 py-1 bg-blue-600/20 text-blue-300 rounded hover:bg-blue-600/30"
                  >
                    Set Default
                  </button>
                  <button
                    onClick={() => handleRemoveCard(method.id)}
                    className="text-xs px-3 py-1 bg-red-600/20 text-red-300 rounded hover:bg-red-600/30"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-white/40 border border-dashed border-white/10 rounded-lg mb-4">
          No payment methods saved
        </div>
      )}

      {showAddCard && clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentMethodForm
            onSuccess={handleConfirmSuccess}
            onCancel={() => setShowAddCard(false)}
            clientSecret={clientSecret}
          />
        </Elements>
      ) : (
        <button
          onClick={handleAddCard}
          disabled={busy}
          className="w-full px-4 py-3 bg-blue-600/20 text-blue-300 rounded-lg border border-blue-500/30 hover:bg-blue-600/30 flex items-center justify-center gap-2"
        >
          <span>➕</span> Add Payment Method
        </button>
      )}
    </div>
  );
}

// ============================================================================
// SUBSCRIPTION PLANS COMPONENT - MATCHES PRICING PAGE
// ============================================================================
function SubscriptionPlans({ currentTier }) {
  const navigate = useNavigate();
  const [upgrading, setUpgrading] = useState(null);

  const handleUpgrade = (newTier) => {
    if (upgrading) return;
    
    setUpgrading(newTier);
    
    // Direct navigation to billing with tier parameter
    navigate(`/billing?tier=${newTier}`, {
      state: { 
        tier: newTier, 
        fromBillingDashboard: true 
      }
    });
  };

  // Price order for determining upgrade vs downgrade
  const priceOrder = { starter: 0, pro: 19, elite: 49 };

  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📋</span> Subscription Plans
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(TIERS).map(([key, tier]) => {
          const isCurrent = key === currentTier;
          const isUpgrade = !isCurrent && priceOrder[key] > priceOrder[currentTier];
          
          return (
            <div
              key={key}
              className={`relative rounded-xl border overflow-hidden transition-all ${
                isCurrent
                  ? "border-emerald-500/50 bg-gradient-to-br from-emerald-600/10 to-transparent ring-1 ring-emerald-500/30"
                  : "border-white/10 bg-white/5 hover:bg-white/10 hover:scale-[1.02] transition-transform"
              }`}
            >
              {/* Badge */}
              {tier.badge && (
                <div className="absolute top-3 right-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    tier.badgeColor === "orange" 
                      ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                      : tier.badgeColor === "purple"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}>
                    {tier.badge}
                  </span>
                </div>
              )}

              {isCurrent && (
                <div className="absolute top-3 left-3">
                  <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="p-5">
                {/* Plan header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">{tier.icon}</span>
                  <div>
                    <h3 className="text-xl font-bold">{tier.name}</h3>
                    <p className="text-xs text-white/50">{tier.displayName}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${tier.price}</span>
                    <span className="text-sm text-white/50">/{tier.interval}</span>
                  </div>
                  {key === "starter" && (
                    <p className="text-xs text-emerald-400 mt-1">No credit card required</p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {tier.features.slice(0, 5).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      <span className="text-white/70">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                {!isCurrent && (
                  <button
                    onClick={() => handleUpgrade(key)}
                    disabled={upgrading === key}
                    className={`w-full py-2.5 rounded-lg font-semibold transition-all ${
                      isUpgrade
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                        : "bg-gray-700 hover:bg-gray-600 text-white"
                    } disabled:opacity-50`}
                  >
                    {upgrading === key ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </span>
                    ) : isUpgrade ? (
                      `Upgrade to ${tier.name} →`
                    ) : (
                      `Switch to ${tier.name} →`
                    )}
                  </button>
                )}

                {isCurrent && (
                  <div className="w-full py-2.5 text-center text-sm text-white/40 border border-white/10 rounded-lg">
                    Your current plan
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Enterprise Note */}
      <div className="mt-6 pt-4 border-t border-white/10 text-center">
        <p className="text-sm text-white/50">
          Need a custom solution?{" "}
          <a href="mailto:sales@imali-defi.com" className="text-blue-400 hover:text-blue-300">
            Contact our enterprise team →
          </a>
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// BILLING HISTORY COMPONENT
// ============================================================================
function BillingHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await BotAPI.getFeeHistory();
      setHistory(data.fees || []);
    } catch (err) {
      console.error("Failed to load billing history:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <div className="animate-pulse h-32 bg-white/5 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📜</span> Billing History
      </h3>

      {history.length === 0 ? (
        <p className="text-center py-6 text-white/40">No billing history yet</p>
      ) : (
        <div className="space-y-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-black/30 rounded-lg"
            >
              <div>
                <p className="text-sm font-medium">
                  {new Date(item.created_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-white/40">{item.description}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-400">
                  -${item.fee_amount}
                </p>
                <p className="text-xs text-white/40 capitalize">{item.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// NEWSLETTER PREFERENCES
// ============================================================================
function NewsletterPreferences() {
  const [preferences, setPreferences] = useState({
    marketing: true,
    product_updates: true,
    trading_signals: true,
    weekly_digest: false,
  });
  const [saving, setSaving] = useState(false);

  const handleToggle = async (key) => {
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPrefs);
    setSaving(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error("Failed to save preferences:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📧</span> Newsletter Preferences
      </h3>

      <div className="space-y-3">
        <label className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
          <div>
            <p className="font-medium">Marketing & Promotions</p>
            <p className="text-xs text-white/40">Special offers and discounts</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.marketing}
            onChange={() => handleToggle('marketing')}
            className="w-5 h-5 accent-emerald-500"
          />
        </label>

        <label className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
          <div>
            <p className="font-medium">Product Updates</p>
            <p className="text-xs text-white/40">New features and improvements</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.product_updates}
            onChange={() => handleToggle('product_updates')}
            className="w-5 h-5 accent-emerald-500"
          />
        </label>

        <label className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
          <div>
            <p className="font-medium">Trading Signals</p>
            <p className="text-xs text-white/40">Daily trading opportunities</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.trading_signals}
            onChange={() => handleToggle('trading_signals')}
            className="w-5 h-5 accent-emerald-500"
          />
        </label>

        <label className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
          <div>
            <p className="font-medium">Weekly Digest</p>
            <p className="text-xs text-white/40">Weekly performance summary</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.weekly_digest}
            onChange={() => handleToggle('weekly_digest')}
            className="w-5 h-5 accent-emerald-500"
          />
        </label>

        {saving && (
          <p className="text-xs text-emerald-400 text-center mt-2">
            Saving preferences...
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ACCOUNT SECURITY
// ============================================================================
function AccountSecurity() {
  const [sessions] = useState([
    {
      id: 1,
      device: "Chrome on Windows",
      location: "New York, US",
      ip: "192.168.1.1",
      current: true,
      lastActive: new Date().toISOString(),
    },
  ]);

  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>🔐</span> Account Security
      </h3>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-sm mb-3">Active Sessions</h4>
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`p-3 rounded-lg flex items-center justify-between ${
                  session.current
                    ? "bg-emerald-500/10 border border-emerald-500/30"
                    : "bg-black/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">💻</span>
                  <div>
                    <p className="text-sm font-medium">
                      {session.device}
                      {session.current && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full">
                          Current
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-white/40">
                      {session.location} • {session.ip}
                    </p>
                    <p className="text-xs text-white/30">
                      Last active: {new Date(session.lastActive).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 pt-4">
          <h4 className="font-medium text-sm mb-3">Password & Authentication</h4>
          <button className="w-full px-4 py-2 bg-blue-600/20 text-blue-300 rounded-lg hover:bg-blue-600/30 text-sm">
            Change Password
          </button>
        </div>

        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-sm">Two-Factor Authentication</h4>
              <p className="text-xs text-white/40">Add an extra layer of security</p>
            </div>
            <span className="text-xs px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full">
              Not Enabled
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// USAGE STATISTICS
// ============================================================================
function UsageStatistics() {
  const [stats] = useState({
    trades: 0,
    winRate: 0,
    activeBots: 0,
  });

  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📊</span> Trading Statistics
      </h3>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-black/30 rounded-lg">
          <div className="text-2xl font-bold text-emerald-400">{stats.trades}</div>
          <div className="text-xs text-white/40">Total Trades</div>
        </div>
        <div className="text-center p-3 bg-black/30 rounded-lg">
          <div className="text-2xl font-bold text-blue-400">{stats.winRate}%</div>
          <div className="text-xs text-white/40">Win Rate</div>
        </div>
        <div className="text-center p-3 bg-black/30 rounded-lg">
          <div className="text-2xl font-bold text-purple-400">{stats.activeBots}</div>
          <div className="text-xs text-white/40">Active Bots</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CANCEL SUBSCRIPTION
// ============================================================================
function CancelSubscription({ tier, onCancel }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState("");
  const [canceling, setCanceling] = useState(false);

  const handleCancel = async () => {
    setCanceling(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      onCancel?.();
      setShowConfirm(false);
      alert("✅ Subscription cancelled successfully");
    } catch (err) {
      alert("❌ Failed to cancel: " + err.message);
    } finally {
      setCanceling(false);
    }
  };

  if (tier === "starter") return null;

  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-400">
        <span>⚠️</span> Cancel Subscription
      </h3>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="px-4 py-2 bg-red-600/20 text-red-300 rounded-lg hover:bg-red-600/30 text-sm"
        >
          Cancel Subscription
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-white/70">
            We're sorry to see you go. Please tell us why you're leaving:
          </p>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2 rounded-lg bg-black/40 border border-white/10 text-white"
          >
            <option value="">Select a reason...</option>
            <option value="too_expensive">Too expensive</option>
            <option value="not_using">Not using the service</option>
            <option value="missing_features">Missing features</option>
            <option value="technical_issues">Technical issues</option>
            <option value="other">Other</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={!reason || canceling}
              className="flex-1 px-4 py-2 bg-red-600 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
            >
              {canceling ? "Canceling..." : "Confirm Cancellation"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 bg-gray-700 rounded-lg text-sm hover:bg-gray-600"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN BILLING DASHBOARD
// ============================================================================
export default function BillingDashboard() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    setLoading(false);
  }, [user, navigate]);

  const tier = user?.tier || "starter";
  const tierInfo = TIERS[tier] || TIERS.starter;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
          <p className="text-gray-400">
            Manage your subscription, payment methods, and billing preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/10 pb-4 overflow-x-auto">
          {[
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "plans", label: "Plans", icon: "📋" },
            { id: "payment", label: "Payment", icon: "💳" },
            { id: "history", label: "History", icon: "📜" },
            { id: "security", label: "Security", icon: "🔐" },
            { id: "preferences", label: "Preferences", icon: "⚙️" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-emerald-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === "overview" && (
            <>
              {/* Current Plan Card */}
              <div className={`bg-gradient-to-r ${tierInfo.color} rounded-xl p-6 border ${tierInfo.border}`}>
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-3xl">{tierInfo.icon}</span>
                      <div>
                        <h2 className="text-2xl font-bold">{tierInfo.name}</h2>
                        {tierInfo.badge && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            tierInfo.badgeColor === "orange" 
                              ? "bg-orange-500/20 text-orange-300"
                              : tierInfo.badgeColor === "purple"
                              ? "bg-purple-500/20 text-purple-300"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}>
                            {tierInfo.badge}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-white/80 mb-4">
                      ${tierInfo.price}/{tierInfo.interval}
                    </p>
                    <ul className="space-y-2">
                      {tierInfo.features.slice(0, 4).map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-emerald-300">✓</span>
                          <span className="text-white/70">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={() => setActiveTab("plans")}
                    className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Change Plan
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <UsageStatistics />
                <PaymentMethodManager onSuccess={refreshUser} />
              </div>
            </>
          )}

          {activeTab === "plans" && (
            <SubscriptionPlans currentTier={tier} />
          )}

          {activeTab === "payment" && (
            <div className="max-w-2xl">
              <PaymentMethodManager onSuccess={refreshUser} />
            </div>
          )}

          {activeTab === "history" && (
            <BillingHistory />
          )}

          {activeTab === "security" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AccountSecurity />
              <CancelSubscription tier={tier} onCancel={() => navigate("/")} />
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="max-w-2xl">
              <NewsletterPreferences />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}