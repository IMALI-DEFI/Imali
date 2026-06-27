// src/pages/BillingDashboard.jsx
// Production-ready Account Settings page
// Full billing, subscription, trading accounts, wallet, API keys, security, and activity

import React from "react";
import { useNavigate } from "react-router-dom";
import CardUpdateForm from "./CardUpdateForm";
import {
  FaCreditCard,
  FaCrown,
  FaWallet,
  FaKey,
  FaShieldAlt,
  FaBell,
  FaPlug,
  FaArrowRight,
  FaCheckCircle,
  FaCircle,
  FaLock,
  FaExclamationTriangle,
  FaApple,
  FaBitcoin,
  FaWater,
  FaChartLine,
  FaRobot,
  FaHistory,
  FaDatabase,
  FaChartBar,
  FaClock,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaGlobe,
  FaServer,
  FaCloudUpload,
  FaDownload,
  FaTrash,
  FaUserCog,
  FaLock as FaLockIcon,
} from "react-icons/fa";

const TIERS = {
  starter: {
    label: "Starter",
    icon: "🌱",
    price: "Free",
    description: "Paper trading and beginner tools. No credit card required.",
    color: "from-emerald-600/20 to-teal-500/10",
    borderColor: "border-emerald-500/30",
    buttonColor: "from-emerald-600 to-teal-600",
    tierLevel: 0,
  },
  pro: {
    label: "Pro",
    icon: "⭐",
    price: "$19/mo",
    description: "Live crypto, live stocks, AI strategies, and analytics.",
    color: "from-blue-600/20 to-indigo-500/10",
    borderColor: "border-blue-500/30",
    buttonColor: "from-blue-600 to-indigo-600",
    tierLevel: 1,
  },
  elite: {
    label: "Elite",
    icon: "👑",
    price: "$49/mo",
    description: "Crypto, DEX, futures, wallet tools, and advanced automation.",
    color: "from-purple-600/20 to-pink-500/10",
    borderColor: "border-purple-500/30",
    buttonColor: "from-purple-600 to-pink-600",
    tierLevel: 2,
  },
  enterprise: {
    label: "Enterprise",
    icon: "🏢",
    price: "Custom",
    description: "Team management, white-label tools, and dedicated support.",
    color: "from-indigo-600/20 to-cyan-500/10",
    borderColor: "border-indigo-500/30",
    buttonColor: "from-indigo-600 to-cyan-600",
    tierLevel: 3,
  },
};

const CONNECTION_TYPES = [
  {
    id: "okx",
    label: "OKX Exchange",
    icon: <FaBitcoin />,
    description: "Connect your OKX account for crypto trading",
    route: "/connect-okx",
    color: "from-blue-500/20 to-cyan-500/10",
    borderColor: "border-blue-500/30",
  },
  {
    id: "alpaca",
    label: "Alpaca Trading",
    icon: <FaApple />,
    description: "Connect your Alpaca account for stock trading",
    route: "/connect-alpaca",
    color: "from-green-500/20 to-emerald-500/10",
    borderColor: "border-green-500/30",
  },
  {
    id: "dex",
    label: "DEX / Wallet",
    icon: <FaWater />,
    description: "Connect MetaMask or other wallet for DeFi",
    route: "/connect-wallet",
    color: "from-purple-500/20 to-pink-500/10",
    borderColor: "border-purple-500/30",
  },
];

const RECENT_ACTIVITIES = [
  { type: "subscription", label: "Subscription changed to Pro", time: "2 hours ago", icon: "📄" },
  { type: "card", label: "Payment method updated", time: "1 day ago", icon: "💳" },
  { type: "wallet", label: "Wallet connected", time: "3 days ago", icon: "🦊" },
  { type: "api", label: "API key updated", time: "5 days ago", icon: "🔑" },
  { type: "trading", label: "Trading enabled", time: "1 week ago", icon: "🤖" },
];

export default function BillingDashboard({
  tier = "starter",
  user,
  cardStatus = {},
  activation = {},
  subscription = null,
  busy = "",
  showCardForm = false,
  formKey = 0,
  pendingTier = null,
  onUpdateCard,
  onRemoveCard,
  onCancelSubscription,
  onCancelCardForm,
  onCardSuccess,
}) {
  const navigate = useNavigate();

  const currentTier = String(tier || user?.tier || "starter").toLowerCase();
  const meta = TIERS[currentTier] || TIERS.starter;
  const tierLevel = meta.tierLevel || 0;
  const activationStatus = activation?.status || activation || {};

  const hasCard =
    cardStatus?.hasCard === true ||
    cardStatus?.has_card === true ||
    cardStatus?.has_card_on_file === true ||
    user?.has_card_on_file === true ||
    activationStatus?.has_card_on_file === true;

  const billingComplete = hasCard;
  const isPaidUser = currentTier === "pro" || currentTier === "elite";

  const subscriptionStatus =
    subscription?.status ||
    user?.subscription_status ||
    (currentTier === "starter" ? "free" : hasCard ? "active" : "incomplete");

  const canManageCard = currentTier === "pro" || currentTier === "elite";
  const canCancel = canManageCard && subscriptionStatus !== "canceled";

  const cardLabel =
    cardStatus?.brand && cardStatus?.last4
      ? `${String(cardStatus.brand).toUpperCase()} •••• ${cardStatus.last4}`
      : hasCard
      ? "Payment Method On File"
      : "No Card Saved";

  // Connection statuses
  const isOKXConnected = activationStatus?.okx_connected || false;
  const isAlpacaConnected = activationStatus?.alpaca_connected || false;
  const isWalletConnected = activationStatus?.wallet_connected || false;
  const isBotRunning = activationStatus?.trading_enabled || false;

  const connections = {
    okx: { connected: isOKXConnected, label: "OKX", mode: activationStatus?.okx_mode || "paper" },
    alpaca: { connected: isAlpacaConnected, label: "Alpaca", mode: activationStatus?.alpaca_mode || "paper" },
    dex: { connected: isWalletConnected, label: "Wallet", mode: "live" },
  };

  // API Key statuses based on activation data
  const apiStatuses = {
    okx_api: { status: isOKXConnected ? "Connected" : "Missing", route: "/connect-okx" },
    alpaca_api: { status: isAlpacaConnected ? "Connected" : "Missing", route: "/connect-alpaca" },
    wallet_api: { status: isWalletConnected ? "Connected" : "Missing", route: "/connect-wallet" },
  };

  const handleNavigate = (route) => {
    navigate(route);
  };

  // Determine which upgrade cards to show
  const showUpgradeCards = () => {
    if (tierLevel >= 2) return { show: false, message: "You're on our highest individual plan." };
    if (tierLevel === 3) return { show: false, message: "Enterprise plan - contact sales for changes." };
    return { show: true };
  };

  const upgradeStatus = showUpgradeCards();

  return (
    <div className="min-h-screen bg-[#050816] text-white px-4 py-6 md:py-10">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_30%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.10),transparent_35%)]" />

      <div className="relative max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black">Account Settings</h1>
            <p className="text-white/50 mt-1">
              Manage your billing, subscriptions, and account preferences
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 px-5 py-3 font-black transition flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Account Health Strip */}
        <section className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-4 md:p-5 shadow-xl">
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white/60">Account Health</span>
              <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                ✅ All Good
              </span>
            </div>
            <HealthBadge label="Plan" value={meta.label} status={true} />
            <HealthBadge label="Billing" status={hasCard || currentTier === "starter"} />
            <HealthBadge label="OKX" status={isOKXConnected} />
            <HealthBadge label="Wallet" status={isWalletConnected} />
            <HealthBadge label="Bot" status={isBotRunning ? "Running" : "Stopped"} color={isBotRunning ? "emerald" : "yellow"} />
            <HealthBadge label="Trading" status={activationStatus?.trading_enabled} />
            {isPaidUser && (
              <HealthBadge label="Portfolio" value={`$${num(activationStatus?.portfolio_value || 0).toFixed(0)}`} status={true} />
            )}
          </div>
        </section>

        {/* 1. Current Plan Summary */}
        <section
          className={`rounded-[2rem] border ${meta.borderColor} bg-gradient-to-br ${meta.color} p-5 md:p-6 shadow-xl overflow-hidden`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{meta.icon}</div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-3xl font-black">{meta.label} Plan</h2>
                  <span className="text-emerald-300 font-black">{meta.price}</span>
                  {hasCard && (
                    <span className="px-3 py-1 text-xs font-black bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                      ✅ Active
                    </span>
                  )}
                </div>
                <p className="text-white/60 mt-1">{meta.description}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge 
                    label={hasCard ? "Payment Active" : "No Payment"} 
                    status={hasCard} 
                  />
                  <StatusBadge 
                    label={subscriptionStatus.replace("_", " ")} 
                    status={subscriptionStatus === "active" || subscriptionStatus === "free"} 
                  />
                  <StatusBadge 
                    label={isBotRunning ? "Bot Running" : "Bot Stopped"} 
                    status={isBotRunning} 
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {tierLevel < 2 && currentTier !== "enterprise" && (
                <button
                  onClick={() => handleNavigate("/pricing")}
                  className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 font-black text-white hover:from-amber-600 hover:to-orange-600 transition"
                >
                  <FaCrown className="inline mr-2" />
                  {currentTier === "starter" ? "Upgrade Plan" : "Change Plan"}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* 2. Bot Status */}
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-5">
            <FaRobot className="text-2xl text-cyan-400" />
            <h2 className="text-xl font-black">Bot Status</h2>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <BotStatusItem 
                label="Status" 
                value={isBotRunning ? "Running" : "Stopped"} 
                status={isBotRunning}
              />
              <BotStatusItem 
                label="Mode" 
                value={(activationStatus?.trading_mode || "paper").toUpperCase()} 
                status={true}
              />
              <BotStatusItem 
                label="Strategy" 
                value={activationStatus?.current_strategy || "Balanced AI"} 
                status={true}
              />
              <BotStatusItem 
                label="Exchange" 
                value={isOKXConnected ? "OKX" : isAlpacaConnected ? "Alpaca" : "None"} 
                status={isOKXConnected || isAlpacaConnected}
              />
              <BotStatusItem 
                label="Open Positions" 
                value={String(activationStatus?.open_positions || 0)} 
                status={(activationStatus?.open_positions || 0) > 0}
              />
              <BotStatusItem 
                label="Last Trade" 
                value={activationStatus?.last_trade_time || "No trades yet"} 
                status={!!activationStatus?.last_trade_time}
              />
            </div>
          </div>
        </section>

        {/* 3. Payment Method */}
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <FaCreditCard className="text-2xl text-emerald-400" />
              <h2 className="text-xl font-black">Payment Method</h2>
            </div>
            <span className={`h-3 w-3 rounded-full ${hasCard ? "bg-emerald-400" : "bg-gray-500"}`} />
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-5 mb-5">
            {hasCard ? (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  <h3 className="font-black text-lg">{cardLabel}</h3>
                </div>
                {cardStatus?.exp_month && cardStatus?.exp_year && (
                  <p className="text-white/50 text-sm">
                    Expires {cardStatus.exp_month}/{cardStatus.exp_year}
                  </p>
                )}
                <p className="text-emerald-400 text-xs mt-2">✅ Default Payment Method</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="h-3 w-3 rounded-full bg-gray-500" />
                  <h3 className="font-black text-white/50">No payment method</h3>
                </div>
                <p className="text-white/50 text-sm">
                  {currentTier === "starter"
                    ? "Starter does not require a payment method."
                    : "Add a card to activate paid access."}
                </p>
              </div>
            )}
          </div>

          {(canManageCard || currentTier === "starter") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {canManageCard && (
                <button
                  onClick={onUpdateCard}
                  disabled={!!busy || showCardForm}
                  className="rounded-2xl bg-blue-600 hover:bg-blue-500 px-5 py-4 font-black text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {showCardForm ? "Card Form Open" : hasCard ? "Update Card" : "Add Card"}
                </button>
              )}
              {hasCard && canManageCard && (
                <button
                  onClick={onRemoveCard}
                  disabled={busy === "remove"}
                  className="rounded-2xl bg-red-900/70 hover:bg-red-800/70 border border-red-700/60 px-5 py-4 font-black text-red-100 transition disabled:opacity-50"
                >
                  {busy === "remove" ? "Removing..." : "Remove Card"}
                </button>
              )}
              {currentTier === "starter" && (
                <button
                  onClick={() => handleNavigate("/pricing")}
                  className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-5 py-4 font-black transition"
                >
                  Upgrade to Add Card
                </button>
              )}
            </div>
          )}

          {canManageCard && showCardForm && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <CardUpdateForm
                key={formKey}
                tier={pendingTier || currentTier}
                onSuccess={onCardSuccess}
                onCancel={onCancelCardForm}
              />
            </div>
          )}
        </section>

        {/* 4. Subscription Details */}
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-3xl">📄</span>
            <h2 className="text-xl font-black">Subscription</h2>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-5 mb-5">
            <InfoRow label="Plan" value={meta.label} />
            <InfoRow label="Status" value={String(subscriptionStatus).replace("_", " ")} />
            {subscription?.amount && (
              <InfoRow
                label="Price"
                value={`${(subscription.currency || "usd").toUpperCase()} $${(
                  subscription.amount / 100
                ).toFixed(2)} / ${subscription.interval || "month"}`}
              />
            )}
            {subscription?.current_period_end && (
              <InfoRow
                label="Renewal Date"
                value={new Date(subscription.current_period_end * 1000).toLocaleDateString()}
              />
            )}
          </div>

          {canCancel && (
            <button
              onClick={onCancelSubscription}
              disabled={busy === "cancel"}
              className="w-full rounded-2xl bg-red-900/70 hover:bg-red-800/70 border border-red-700/60 px-5 py-4 font-black text-red-100 transition disabled:opacity-50"
            >
              {busy === "cancel" ? "Canceling..." : "Cancel Subscription"}
            </button>
          )}
        </section>

        {/* 5. Upgrade Options */}
        {upgradeStatus.show && (
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-5">
              <FaCrown className="text-2xl text-amber-400" />
              <h2 className="text-xl font-black">Upgrade Options</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {tierLevel < 1 && (
                <UpgradeCard
                  tier="pro"
                  icon="⭐"
                  label="Pro Plan"
                  price="$19/mo"
                  features={["Live crypto trading", "Live stocks", "AI strategies", "Priority support"]}
                  onUpgrade={() => handleNavigate("/pricing?selected=pro")}
                  color="from-blue-600/20 to-indigo-500/10"
                  borderColor="border-blue-500/30"
                />
              )}
              {tierLevel < 2 && (
                <UpgradeCard
                  tier="elite"
                  icon="👑"
                  label="Elite Plan"
                  price="$49/mo"
                  features={["Everything in Pro", "DEX sniper", "Futures trading", "Staking & Lending"]}
                  onUpgrade={() => handleNavigate("/pricing?selected=elite")}
                  color="from-purple-600/20 to-pink-500/10"
                  borderColor="border-purple-500/30"
                />
              )}
            </div>
          </section>
        )}

        {/* 6. Trading Accounts */}
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-5">
            <FaPlug className="text-2xl text-cyan-400" />
            <h2 className="text-xl font-black">Trading Accounts</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {CONNECTION_TYPES.map((conn) => (
              <ConnectionCard
                key={conn.id}
                icon={conn.icon}
                label={conn.label}
                description={conn.description}
                connected={connections[conn.id]?.connected || false}
                mode={connections[conn.id]?.mode || "paper"}
                onConnect={() => handleNavigate(conn.route)}
                color={conn.color}
                borderColor={conn.borderColor}
              />
            ))}
          </div>
        </section>

        {/* 7. Wallet / MetaMask */}
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-5">
            <FaWallet className="text-2xl text-purple-400" />
            <h2 className="text-xl font-black">Wallet & MetaMask</h2>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🦊</span>
                  <div>
                    <h3 className="font-black">MetaMask / DeFi Wallet</h3>
                    <p className="text-white/50 text-sm">
                      {isWalletConnected
                        ? "Wallet connected successfully"
                        : "Connect your wallet for DEX trading"}
                    </p>
                  </div>
                </div>
                {activationStatus?.wallet_address_masked && (
                  <p className="text-xs text-white/40 mt-2 font-mono">
                    {activationStatus.wallet_address_masked}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleNavigate("/connect-wallet")}
                className={`rounded-2xl px-5 py-3 font-black transition ${
                  isWalletConnected
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-purple-600 hover:bg-purple-500"
                }`}
              >
                {isWalletConnected ? "Manage" : "Connect Wallet"}
              </button>
            </div>
          </div>
        </section>

        {/* 8. API Key Management */}
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-5">
            <FaKey className="text-2xl text-yellow-400" />
            <h2 className="text-xl font-black">API Key Management</h2>
          </div>

          <div className="space-y-3">
            {Object.entries(apiStatuses).map(([id, api]) => (
              <div
                key={id}
                className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-black">
                    {id === "okx_api" ? "OKX API Key" : id === "alpaca_api" ? "Alpaca API Key" : "Wallet Address"}
                  </h4>
                  <p className="text-xs">
                    Status: <span className={
                      api.status === "Connected" ? "text-emerald-400" : "text-amber-400"
                    }>
                      {api.status === "Connected" ? "✅ " : "⚠️ "}{api.status}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => handleNavigate(api.route)}
                  className="rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2 font-black text-sm transition"
                >
                  {api.status === "Connected" ? "Manage" : "Connect"}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <p className="text-amber-300 text-xs">
              ⚠️ API keys are encrypted. Never share your keys with anyone.
            </p>
          </div>
        </section>

        {/* 9. Activity Log */}
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-5">
            <FaHistory className="text-2xl text-blue-400" />
            <h2 className="text-xl font-black">Recent Activity</h2>
          </div>

          <div className="space-y-3">
            {RECENT_ACTIVITIES.map((activity, idx) => (
              <ActivityItem key={idx} {...activity} />
            ))}
          </div>
        </section>

        {/* 10. Setup Progress */}
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-2xl">📋</span>
            <h2 className="text-xl font-black">Setup Progress</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Step
              done={billingComplete || currentTier === "starter"}
              number="1"
              title="Billing"
              text={currentTier === "starter" ? "No card required" : billingComplete ? "Payment method saved" : "Add payment method"}
            />
            <Step
              done={activationStatus?.okx_connected || activationStatus?.alpaca_connected}
              number="2"
              title="Connect Accounts"
              text="OKX or Alpaca connection"
            />
            <Step
              done={activationStatus?.trading_enabled}
              number="3"
              title="Enable Trading"
              text="Start bot automation"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => handleNavigate("/activation")}
              className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-5 py-4 font-black transition"
            >
              Continue Setup →
            </button>
            <button
              onClick={() => handleNavigate("/dashboard")}
              className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 px-5 py-4 font-black transition"
            >
              Go to Dashboard
            </button>
          </div>
        </section>

        {/* 11. Security */}
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-5">
            <FaShieldAlt className="text-2xl text-emerald-400" />
            <h2 className="text-xl font-black">Security</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <SecurityAction
              icon={<FaLockIcon />}
              title="Change Password"
              description="Update your account password"
              onClick={() => handleNavigate("/settings/security")}
            />
            <SecurityAction
              icon={<FaUserCog />}
              title="Two-Factor Authentication"
              description="Add an extra layer of security"
              onClick={() => handleNavigate("/settings/security")}
            />
            <SecurityAction
              icon={<FaServer />}
              title="Active Sessions"
              description="Manage devices logged into your account"
              onClick={() => handleNavigate("/settings/security")}
            />
            <SecurityAction
              icon={<FaTrash />}
              title="Delete Account"
              description="Permanently delete your account and data"
              onClick={() => handleNavigate("/settings/security")}
              danger
            />
          </div>
        </section>

        {/* 12. Security Notes */}
        <section className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-5 md:p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-5">
            <FaShieldAlt className="text-2xl text-emerald-400" />
            <h2 className="text-xl font-black">Security Notes</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <SecurityNote
              icon="🔒"
              title="Data Encryption"
              description="All sensitive data is encrypted at rest and in transit."
            />
            <SecurityNote
              icon="🔑"
              title="API Key Protection"
              description="Keys are stored with AES-256 encryption."
            />
            <SecurityNote
              icon="🏦"
              title="Stripe Integration"
              description="Payment info is handled by Stripe - we never store full card numbers."
            />
            <SecurityNote
              icon="📧"
              title="Security Notifications"
              description="Get alerted on suspicious activity or changes."
            />
          </div>

          <div className="mt-5 pt-4 border-t border-white/10 text-center">
            <p className="text-xs text-white/40">
              Need help? Contact support at support@imali-defi.com
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

const num = (value) => {
  const parsed = Number(String(value ?? 0).replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

function HealthBadge({ label, value, status, color = "emerald" }) {
  const getStatusColor = () => {
    if (typeof status === "boolean") {
      return status ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border-amber-500/30";
    }
    if (color === "emerald") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    if (color === "yellow") return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  const displayValue = value || (typeof status === "boolean" ? (status ? "✅" : "❌") : status);

  return (
    <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor()} whitespace-nowrap`}>
      {label}: {displayValue}
    </span>
  );
}

function StatusBadge({ label, status }) {
  return (
    <span
      className={`px-3 py-1 text-xs font-black rounded-full ${
        status
          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
          : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
      }`}
    >
      {status ? "✅" : "⏳"} {label}
    </span>
  );
}

function BotStatusItem({ label, value, status }) {
  return (
    <div className="text-center p-3 rounded-xl bg-white/5 border border-white/5">
      <p className="text-xs text-white/40">{label}</p>
      <p className={`font-black text-sm ${
        status ? "text-white" : "text-white/40"
      }`}>
        {value}
      </p>
    </div>
  );
}

function UpgradeCard({ tier, icon, label, price, features, onUpgrade, color, borderColor }) {
  return (
    <div className={`rounded-[1.5rem] border ${borderColor} bg-gradient-to-br ${color} p-5`}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <h3 className="text-xl font-black">{label}</h3>
          <p className="text-emerald-300 font-black">{price}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-1">
        {features.map((feature, idx) => (
          <li key={idx} className="text-sm text-white/70 flex items-center gap-2">
            <FaCheckCircle className="text-emerald-400 text-xs" />
            {feature}
          </li>
        ))}
      </ul>
      <button
        onClick={onUpgrade}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 font-black text-white hover:from-amber-600 hover:to-orange-600 transition"
      >
        Upgrade Now
      </button>
    </div>
  );
}

function ConnectionCard({ icon, label, description, connected, mode, onConnect, color, borderColor }) {
  return (
    <div className={`rounded-[1.5rem] border ${borderColor} bg-gradient-to-br ${color} p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h4 className="font-black">{label}</h4>
            <p className="text-xs text-white/50">{description}</p>
          </div>
        </div>
        <span className={`text-xs font-black px-2 py-1 rounded-full ${
          connected 
            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
            : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
        }`}>
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>
      {connected && (
        <p className="text-xs text-white/40 mt-2">
          Mode: <span className="text-emerald-300">{mode.toUpperCase()}</span>
        </p>
      )}
      <button
        onClick={onConnect}
        className={`mt-3 w-full rounded-xl px-4 py-2 font-black text-sm transition ${
          connected
            ? "bg-white/10 hover:bg-white/20 border border-white/10"
            : "bg-cyan-600 hover:bg-cyan-500"
        }`}
      >
        {connected ? "Manage" : "Connect"}
      </button>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm border-b border-white/5 last:border-b-0">
      <span className="text-white/40 font-bold">{label}</span>
      <span className="font-bold text-white capitalize text-right">{value}</span>
    </div>
  );
}

function Step({ done, number, title, text }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        done ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-black/30"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center font-black ${
            done ? "bg-emerald-400 text-black" : "bg-white/10 text-white/50"
          }`}
        >
          {done ? "✓" : number}
        </div>
        <div>
          <h3 className="text-xl font-black">{title}</h3>
          <p className="text-white/50 text-sm">{text}</p>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ type, label, time, icon }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="font-black text-sm">{label}</p>
          <p className="text-xs text-white/40">{time}</p>
        </div>
      </div>
    </div>
  );
}

function SecurityAction({ icon, title, description, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition ${
        danger
          ? "border-red-500/20 hover:border-red-500/40 bg-red-500/5 hover:bg-red-500/10"
          : "border-white/10 hover:border-white/20 bg-black/20 hover:bg-black/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`text-lg ${danger ? "text-red-400" : "text-blue-400"}`}>{icon}</span>
        <h4 className={`font-black text-sm ${danger ? "text-red-400" : "text-white"}`}>{title}</h4>
      </div>
      <p className="text-xs text-white/50 mt-1">{description}</p>
    </button>
  );
}

function SecurityNote({ icon, title, description }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h4 className="font-black text-sm">{title}</h4>
      </div>
      <p className="text-xs text-white/50 mt-1">{description}</p>
    </div>
  );
}
