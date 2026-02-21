// src/pages/BillingDashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
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
// TIER CONFIGURATION
// ============================================================================
const TIERS = {
  starter: {
    name: "Starter",
    price: 0,
    interval: "month",
    features: [
      "Basic trading signals",
      "Paper trading",
      "Community support",
      "Basic analytics",
    ],
    color: "from-gray-600 to-gray-700",
    border: "border-gray-500/30",
    icon: "🌱",
  },
  pro: {
    name: "Pro",
    price: 19,
    interval: "month",
    features: [
      "Advanced trading signals",
      "CEX movers",
      "Real-time alerts",
      "Priority support",
      "Advanced analytics",
      "API access",
    ],
    color: "from-blue-600 to-blue-700",
    border: "border-blue-500/30",
    icon: "⭐",
  },
  elite: {
    name: "Elite",
    price: 49,
    interval: "month",
    features: [
      "All Pro features",
      "DEX integration",
      "MEV protection",
      "Multi-chain support",
      "VIP support",
      "Custom strategies",
    ],
    color: "from-purple-600 to-purple-700",
    border: "border-purple-500/30",
    icon: "👑",
  },
  stock: {
    name: "Stocks",
    price: 99,
    interval: "month",
    features: [
      "Stock market data",
      "US equities",
      "Options trading",
      "Market analysis",
      "Economic calendars",
      "Earnings alerts",
    ],
    color: "from-emerald-600 to-emerald-700",
    border: "border-emerald-500/30",
    icon: "📈",
  },
  bundle: {
    name: "Bundle",
    price: 199,
    interval: "month",
    features: [
      "Everything included",
      "All strategies",
      "All exchanges",
      "Priority support",
      "Early access features",
      "Best value",
    ],
    color: "from-amber-600 to-amber-700",
    border: "border-amber-500/30",
    icon: "🧩",
  },
};

// ============================================================================
// PAYMENT METHOD COMPONENT
// ============================================================================
function PaymentMethodManager({ onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [showAddCard, setShowAddCard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [defaultMethod, setDefaultMethod] = useState(null);
  const { user } = useAuth();

  // Load payment methods
  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const res = await BotAPI.getCardStatus();
      if (res?.payment_method) {
        setDefaultMethod(res.payment_method);
        setPaymentMethods([res.payment_method]); // In real app, you'd list all
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

  const handleConfirmCard = async () => {
    if (!stripe || !elements) return;

    setBusy(true);
    setError("");

    try {
      const { error: stripeError } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/billing`,
        },
        redirect: "if_required",
      });

      if (stripeError) throw stripeError;

      // Confirm with backend
      await BotAPI.confirmCard();
      
      // Reload payment methods
      await loadPaymentMethods();
      setShowAddCard(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || "Failed to save card");
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveCard = async (methodId) => {
    // Note: This endpoint would need to be added to your backend
    if (!window.confirm("Are you sure you want to remove this card?")) return;
    
    try {
      // await BotAPI.removePaymentMethod(methodId);
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

      {/* Existing cards */}
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
                  <span className="text-2xl">
                    {method.brand === "visa" && "💳"}
                    {method.brand === "mastercard" && "💳"}
                    {method.brand === "amex" && "💳"}
                  </span>
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

      {/* Add card form */}
      {showAddCard && clientSecret ? (
        <div className="mt-4 p-4 bg-black/30 rounded-lg">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "night",
                variables: {
                  colorPrimary: "#10b981",
                  colorBackground: "#1f2937",
                  colorText: "#ffffff",
                  colorDanger: "#ef4444",
                },
              },
            }}
          >
            <PaymentElement />
            <button
              onClick={handleConfirmCard}
              disabled={busy}
              className="w-full mt-4 px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? "Saving..." : "Save Card"}
            </button>
          </Elements>
        </div>
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
// SUBSCRIPTION PLANS COMPONENT
// ============================================================================
function SubscriptionPlans({ currentTier, onUpgrade }) {
  const [selectedTier, setSelectedTier] = useState(currentTier);

  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📋</span> Subscription Plans
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(TIERS).map(([key, tier]) => (
          <div
            key={key}
            className={`relative rounded-xl border overflow-hidden ${
              key === currentTier
                ? "border-emerald-500/50 bg-gradient-to-br from-emerald-600/10 to-transparent"
                : "border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            }`}
          >
            {key === currentTier && (
              <div className="absolute top-2 right-2">
                <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full">
                  Current
                </span>
              </div>
            )}

            <div className={`p-4 bg-gradient-to-r ${tier.color} bg-opacity-20`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{tier.icon}</span>
                <h4 className="text-lg font-bold">{tier.name}</h4>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">${tier.price}</span>
                <span className="text-sm text-white/50">/{tier.interval}</span>
              </div>
            </div>

            <div className="p-4">
              <ul className="space-y-2 text-sm">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span className="text-white/70">{feature}</span>
                  </li>
                ))}
              </ul>

              {key !== currentTier && (
                <button
                  onClick={() => onUpgrade(key)}
                  className="w-full mt-4 px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-sm font-semibold hover:opacity-90"
                >
                  {parseInt(tier.price) > parseInt(TIERS[currentTier].price)
                    ? "Upgrade"
                    : "Downgrade"}
                </button>
              )}
            </div>
          </div>
        ))}
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
      // This endpoint would need to be added to your backend
      // await BotAPI.updateNewsletterPrefs(newPrefs);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
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
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      // This endpoint would need to be added to your backend
      // const data = await BotAPI.getActiveSessions();
      // setSessions(data.sessions || []);
      
      // Mock data for now
      setSessions([
        {
          id: 1,
          device: "Chrome on Windows",
          location: "New York, US",
          ip: "192.168.1.1",
          current: true,
          lastActive: new Date().toISOString(),
        },
        {
          id: 2,
          device: "Safari on iPhone",
          location: "New York, US",
          ip: "192.168.1.2",
          current: false,
          lastActive: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm("Log out this device?")) return;
    try {
      // await BotAPI.revokeSession(sessionId);
      await loadSessions();
    } catch (err) {
      console.error("Failed to revoke session:", err);
    }
  };

  const handleRevokeAll = async () => {
    if (!window.confirm("Log out all other devices?")) return;
    try {
      // await BotAPI.revokeAllSessions();
      await loadSessions();
    } catch (err) {
      console.error("Failed to revoke sessions:", err);
    }
  };

  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>🔐</span> Account Security
      </h3>

      <div className="space-y-4">
        {/* Active Sessions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">Active Sessions</h4>
            {sessions.length > 1 && (
              <button
                onClick={handleRevokeAll}
                className="text-xs px-3 py-1 bg-red-600/20 text-red-300 rounded hover:bg-red-600/30"
              >
                Log Out Others
              </button>
            )}
          </div>

          {loading ? (
            <div className="animate-pulse h-20 bg-white/5 rounded" />
          ) : (
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
                    <span className="text-xl">
                      {session.device.includes("iPhone") ? "📱" : "💻"}
                    </span>
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
                  {!session.current && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="text-xs px-3 py-1 bg-red-600/20 text-red-300 rounded hover:bg-red-600/30"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Password Change */}
        <div className="border-t border-white/10 pt-4">
          <h4 className="font-medium text-sm mb-3">Password & Authentication</h4>
          <button className="w-full px-4 py-2 bg-blue-600/20 text-blue-300 rounded-lg hover:bg-blue-600/30 text-sm">
            Change Password
          </button>
        </div>

        {/* 2FA Status */}
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
function UsageStatistics({ user, activation }) {
  const [stats, setStats] = useState({
    apiCalls: 0,
    trades: 0,
    storage: 0,
  });

  useEffect(() => {
    // Mock data - replace with real API calls
    setStats({
      apiCalls: 1234,
      trades: 56,
      storage: 2.3,
    });
  }, []);

  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📊</span> Usage Statistics
      </h3>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-black/30 rounded-lg">
          <div className="text-2xl font-bold text-emerald-400">{stats.apiCalls}</div>
          <div className="text-xs text-white/40">API Calls</div>
          <div className="text-[10px] text-white/30">/ 10k monthly</div>
        </div>
        <div className="text-center p-3 bg-black/30 rounded-lg">
          <div className="text-2xl font-bold text-blue-400">{stats.trades}</div>
          <div className="text-xs text-white/40">Trades</div>
          <div className="text-[10px] text-white/30">this month</div>
        </div>
        <div className="text-center p-3 bg-black/30 rounded-lg">
          <div className="text-2xl font-bold text-purple-400">{stats.storage}GB</div>
          <div className="text-xs text-white/40">Storage</div>
          <div className="text-[10px] text-white/30">/ 10GB</div>
        </div>
      </div>

      {/* Progress bars */}
      <div className="mt-4 space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white/60">API Usage</span>
            <span className="text-white/40">{Math.round((stats.apiCalls/10000)*100)}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${Math.min((stats.apiCalls/10000)*100, 100)}%` }}
            />
          </div>
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
      // This endpoint would need to be added
      // await BotAPI.cancelSubscription({ reason });
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
  const { user, activation, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    setLoading(false);
  }, [user, navigate]);

  const handleUpgrade = async (newTier) => {
    // Navigate to checkout or show upgrade flow
    navigate(`/checkout?tier=${newTier}`);
  };

  const tier = user?.tier || "starter";
  const tierInfo = TIERS[tier];

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
        <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-3xl">{tierInfo.icon}</span>
                      <h2 className="text-2xl font-bold">{tierInfo.name} Plan</h2>
                    </div>
                    <p className="text-white/80 mb-4">
                      ${tierInfo.price}/{tierInfo.interval}
                    </p>
                    <ul className="space-y-2">
                      {tierInfo.features.slice(0, 4).map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-emerald-300">✓</span>
                          {feature}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <UsageStatistics user={user} activation={activation} />
                <PaymentMethodManager onSuccess={refreshUser} />
                <NewsletterPreferences />
              </div>
            </>
          )}

          {activeTab === "plans" && (
            <SubscriptionPlans currentTier={tier} onUpgrade={handleUpgrade} />
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
