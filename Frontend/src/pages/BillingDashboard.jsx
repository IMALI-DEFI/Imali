// src/pages/BillingDashboard.jsx

import React from "react";
import { useNavigate } from "react-router-dom";

import {
  FaApple,
  FaBitcoin,
  FaCheckCircle,
  FaCrown,
  FaCreditCard,
  FaHistory,
  FaKey,
  FaLock,
  FaPlug,
  FaRobot,
  FaServer,
  FaShieldAlt,
  FaTrash,
  FaUserCog,
  FaWallet,
  FaWater,
} from "react-icons/fa";

const TIERS = {
  starter: {
    label: "Starter",
    icon: "🌱",
    price: "Free",
    description:
      "Paper trading and beginner tools. No credit card required.",
    color: "from-emerald-600/20 to-teal-500/10",
    borderColor: "border-emerald-500/30",
    tierLevel: 0,
  },

  pro: {
    label: "Pro",
    icon: "⭐",
    price: "$19/mo",
    description:
      "Live crypto, stocks, AI strategies, and analytics.",
    color: "from-blue-600/20 to-indigo-500/10",
    borderColor: "border-blue-500/30",
    tierLevel: 1,
  },

  elite: {
    label: "Elite",
    icon: "👑",
    price: "$49/mo",
    description:
      "Crypto, DEX, futures, wallet tools, and advanced automation.",
    color: "from-purple-600/20 to-pink-500/10",
    borderColor: "border-purple-500/30",
    tierLevel: 2,
  },

  enterprise: {
    label: "Enterprise",
    icon: "🏢",
    price: "Custom",
    description:
      "Team management, white-label tools, and dedicated support.",
    color: "from-indigo-600/20 to-cyan-500/10",
    borderColor: "border-indigo-500/30",
    tierLevel: 3,
  },
};

const CONNECTION_TYPES = [
  {
    id: "okx",
    label: "OKX Exchange",
    icon: <FaBitcoin />,
    description:
      "Connect your OKX account for crypto trading.",
    route: "/connect-okx",
    color: "from-blue-500/20 to-cyan-500/10",
    borderColor: "border-blue-500/30",
  },

  {
    id: "alpaca",
    label: "Alpaca Trading",
    icon: <FaApple />,
    description:
      "Connect your Alpaca account for stock trading.",
    route: "/connect-alpaca",
    color: "from-green-500/20 to-emerald-500/10",
    borderColor: "border-green-500/30",
  },

  {
    id: "dex",
    label: "DEX / Wallet",
    icon: <FaWater />,
    description:
      "Connect MetaMask or another wallet for DeFi.",
    route: "/connect-wallet",
    color: "from-purple-500/20 to-pink-500/10",
    borderColor: "border-purple-500/30",
  },
];

function normalizeTier(value) {
  const tier = String(value || "starter")
    .toLowerCase()
    .trim();

  return TIERS[tier]
    ? tier
    : "starter";
}

function num(value) {
  const parsed = Number(
    String(value ?? 0).replace(/[$,]/g, "")
  );

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function unwrapActivation(value) {
  return value?.status || value || {};
}

export default function BillingDashboard({
  tier = "starter",
  user,
  cardStatus = {},
  activation = {},
  subscription = null,
  busy = "",
  onUpdateCard,
  onRemoveCard,
  onCancelSubscription,
}) {
  const navigate = useNavigate();

  const currentTier = normalizeTier(
    tier || user?.tier
  );

  const meta =
    TIERS[currentTier] ||
    TIERS.starter;

  const tierLevel =
    meta.tierLevel || 0;

  const activationStatus =
    unwrapActivation(activation);

  const hasCard = Boolean(
    cardStatus?.hasCard ||
      cardStatus?.has_card ||
      cardStatus?.has_card_on_file ||
      user?.has_card_on_file ||
      activationStatus?.has_card_on_file
  );

  const isPaidUser =
    currentTier === "pro" ||
    currentTier === "elite";

  const subscriptionStatus =
    subscription?.status ||
    subscription?.subscription_status ||
    user?.subscription_status ||
    (currentTier === "starter"
      ? "free"
      : hasCard
        ? "active"
        : "incomplete");

  const canManageCard =
    currentTier === "pro" ||
    currentTier === "elite";

  const canCancel =
    canManageCard &&
    subscriptionStatus !== "canceled" &&
    subscriptionStatus !== "cancelled";

  const cardLabel =
    cardStatus?.brand &&
    cardStatus?.last4
      ? `${String(
          cardStatus.brand
        ).toUpperCase()} •••• ${cardStatus.last4}`
      : hasCard
        ? "Payment Method On File"
        : "No Card Saved";

  const isOKXConnected = Boolean(
    activationStatus?.okx_connected
  );

  const isAlpacaConnected = Boolean(
    activationStatus?.alpaca_connected
  );

  const isWalletConnected = Boolean(
    activationStatus?.wallet_connected
  );

  const isBotRunning = Boolean(
    activationStatus?.trading_enabled ||
      activationStatus?.is_running
  );

  const connections = {
    okx: {
      connected: isOKXConnected,
      mode:
        activationStatus?.okx_mode ||
        "paper",
    },

    alpaca: {
      connected: isAlpacaConnected,
      mode:
        activationStatus?.alpaca_mode ||
        "paper",
    },

    dex: {
      connected: isWalletConnected,
      mode: "live",
    },
  };

  const apiStatuses = [
    {
      id: "okx",
      label: "OKX API Key",
      connected: isOKXConnected,
      route: "/connect-okx",
    },

    {
      id: "alpaca",
      label: "Alpaca API Key",
      connected: isAlpacaConnected,
      route: "/connect-alpaca",
    },

    {
      id: "wallet",
      label: "Wallet Address",
      connected: isWalletConnected,
      route: "/connect-wallet",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-xl md:p-5">
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white/60">
              Account Health
            </span>

            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">
              {hasCard || currentTier === "starter"
                ? "✅ Billing Ready"
                : "⚠️ Setup Needed"}
            </span>
          </div>

          <HealthBadge
            label="Plan"
            value={meta.label}
            status
          />

          <HealthBadge
            label="Billing"
            status={
              hasCard ||
              currentTier === "starter"
            }
          />

          <HealthBadge
            label="OKX"
            status={isOKXConnected}
          />

          <HealthBadge
            label="Wallet"
            status={isWalletConnected}
          />

          <HealthBadge
            label="Bot"
            value={
              isBotRunning
                ? "Running"
                : "Stopped"
            }
            status={isBotRunning}
          />

          <HealthBadge
            label="Trading"
            status={Boolean(
              activationStatus?.trading_enabled
            )}
          />

          {isPaidUser && (
            <HealthBadge
              label="Portfolio"
              value={`$${num(
                activationStatus?.portfolio_value
              ).toFixed(0)}`}
              status
            />
          )}
        </div>
      </section>

      <section
        className={`overflow-hidden rounded-[2rem] border ${meta.borderColor} bg-gradient-to-br ${meta.color} p-5 shadow-xl md:p-6`}
      >
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="text-5xl">
              {meta.icon}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-black">
                  {meta.label} Plan
                </h2>

                <span className="font-black text-emerald-300">
                  {meta.price}
                </span>

                {hasCard && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-300">
                    ✅ Active
                  </span>
                )}
              </div>

              <p className="mt-1 text-white/60">
                {meta.description}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge
                  label={
                    hasCard
                      ? "Payment Active"
                      : "No Payment"
                  }
                  status={hasCard}
                />

                <StatusBadge
                  label={String(
                    subscriptionStatus
                  ).replaceAll("_", " ")}
                  status={
                    subscriptionStatus ===
                      "active" ||
                    subscriptionStatus ===
                      "free" ||
                    subscriptionStatus ===
                      "trialing"
                  }
                />

                <StatusBadge
                  label={
                    isBotRunning
                      ? "Bot Running"
                      : "Bot Stopped"
                  }
                  status={isBotRunning}
                />
              </div>
            </div>
          </div>

          {tierLevel < 2 &&
            currentTier !== "enterprise" && (
              <button
                type="button"
                onClick={() =>
                  navigate("/pricing")
                }
                className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 font-black text-white transition hover:from-amber-600 hover:to-orange-600"
              >
                <FaCrown className="mr-2 inline" />

                {currentTier === "starter"
                  ? "Upgrade Plan"
                  : "Change Plan"}
              </button>
            )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl md:p-6">
        <div className="mb-5 flex items-center gap-3">
          <FaRobot className="text-2xl text-cyan-400" />

          <h2 className="text-xl font-black">
            Bot Status
          </h2>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <BotStatusItem
              label="Status"
              value={
                isBotRunning
                  ? "Running"
                  : "Stopped"
              }
              status={isBotRunning}
            />

            <BotStatusItem
              label="Mode"
              value={String(
                activationStatus?.trading_mode ||
                  "paper"
              ).toUpperCase()}
              status
            />

            <BotStatusItem
              label="Strategy"
              value={
                activationStatus?.current_strategy ||
                user?.strategy ||
                "Balanced AI"
              }
              status
            />

            <BotStatusItem
              label="Exchange"
              value={
                isOKXConnected
                  ? "OKX"
                  : isAlpacaConnected
                    ? "Alpaca"
                    : "None"
              }
              status={
                isOKXConnected ||
                isAlpacaConnected
              }
            />

            <BotStatusItem
              label="Open Positions"
              value={String(
                activationStatus?.open_positions ||
                  0
              )}
              status={
                num(
                  activationStatus?.open_positions
                ) > 0
              }
            />

            <BotStatusItem
              label="Last Trade"
              value={
                activationStatus?.last_trade_time ||
                "No trades yet"
              }
              status={Boolean(
                activationStatus?.last_trade_time
              )}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaCreditCard className="text-2xl text-emerald-400" />

            <h2 className="text-xl font-black">
              Payment Method
            </h2>
          </div>

          <span
            className={`h-3 w-3 rounded-full ${
              hasCard
                ? "bg-emerald-400"
                : "bg-gray-500"
            }`}
          />
        </div>

        <div className="mb-5 rounded-[1.5rem] border border-white/10 bg-black/30 p-5">
          {hasCard ? (
            <div>
              <div className="mb-2 flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-emerald-400" />

                <h3 className="text-lg font-black">
                  {cardLabel}
                </h3>
              </div>

              {cardStatus?.exp_month &&
                cardStatus?.exp_year && (
                  <p className="text-sm text-white/50">
                    Expires{" "}
                    {cardStatus.exp_month}/
                    {cardStatus.exp_year}
                  </p>
                )}

              <p className="mt-2 text-xs text-emerald-400">
                ✅ Default payment method
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-2 flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-gray-500" />

                <h3 className="font-black text-white/50">
                  No payment method
                </h3>
              </div>

              <p className="text-sm text-white/50">
                {currentTier === "starter"
                  ? "The Starter plan does not require a payment method."
                  : "Add a card to activate paid access."}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {canManageCard && (
            <button
              type="button"
              onClick={onUpdateCard}
              disabled={busy === "card"}
              className="rounded-2xl bg-blue-600 px-5 py-4 font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {hasCard
                ? "Update Card"
                : "Add Card"}
            </button>
          )}

          {hasCard && canManageCard && (
            <button
              type="button"
              onClick={onRemoveCard}
              disabled={busy === "remove"}
              className="rounded-2xl border border-red-700/60 bg-red-900/70 px-5 py-4 font-black text-red-100 transition hover:bg-red-800/70 disabled:opacity-50"
            >
              {busy === "remove"
                ? "Removing..."
                : "Remove Card"}
            </button>
          )}

          {currentTier === "starter" && (
            <button
              type="button"
              onClick={() =>
                navigate("/pricing")
              }
              className="rounded-2xl bg-emerald-600 px-5 py-4 font-black transition hover:bg-emerald-500"
            >
              Upgrade to Add Card
            </button>
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl md:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="text-3xl">
            📄
          </span>

          <h2 className="text-xl font-black">
            Subscription
          </h2>
        </div>

        <div className="mb-5 rounded-[1.5rem] border border-white/10 bg-black/30 p-5">
          <InfoRow
            label="Plan"
            value={meta.label}
          />

          <InfoRow
            label="Status"
            value={String(
              subscriptionStatus
            ).replaceAll("_", " ")}
          />

          {subscription?.amount && (
            <InfoRow
              label="Price"
              value={`${String(
                subscription.currency ||
                  "usd"
              ).toUpperCase()} $${(
                subscription.amount / 100
              ).toFixed(2)} / ${
                subscription.interval ||
                "month"
              }`}
            />
          )}

          {subscription?.current_period_end && (
            <InfoRow
              label="Renewal Date"
              value={new Date(
                subscription.current_period_end *
                  1000
              ).toLocaleDateString()}
            />
          )}
        </div>

        {canCancel && (
          <button
            type="button"
            onClick={onCancelSubscription}
            disabled={busy === "cancel"}
            className="w-full rounded-2xl border border-red-700/60 bg-red-900/70 px-5 py-4 font-black text-red-100 transition hover:bg-red-800/70 disabled:opacity-50"
          >
            {busy === "cancel"
              ? "Canceling..."
              : "Cancel Subscription"}
          </button>
        )}
      </section>

      {tierLevel < 2 && (
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <FaCrown className="text-2xl text-amber-400" />

            <h2 className="text-xl font-black">
              Upgrade Options
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {tierLevel < 1 && (
              <UpgradeCard
                icon="⭐"
                label="Pro Plan"
                price="$19/mo"
                features={[
                  "Live crypto trading",
                  "Live stock trading",
                  "AI strategies",
                  "Priority support",
                ]}
                onUpgrade={() =>
                  navigate(
                    "/pricing?selected=pro"
                  )
                }
                color="from-blue-600/20 to-indigo-500/10"
                borderColor="border-blue-500/30"
              />
            )}

            {tierLevel < 2 && (
              <UpgradeCard
                icon="👑"
                label="Elite Plan"
                price="$49/mo"
                features={[
                  "Everything in Pro",
                  "DEX tools",
                  "Futures trading",
                  "Wallet automation",
                ]}
                onUpgrade={() =>
                  navigate(
                    "/pricing?selected=elite"
                  )
                }
                color="from-purple-600/20 to-pink-500/10"
                borderColor="border-purple-500/30"
              />
            )}
          </div>
        </section>
      )}

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl md:p-6">
        <div className="mb-5 flex items-center gap-3">
          <FaPlug className="text-2xl text-cyan-400" />

          <h2 className="text-xl font-black">
            Trading Accounts
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {CONNECTION_TYPES.map(
            (connection) => (
              <ConnectionCard
                key={connection.id}
                icon={connection.icon}
                label={connection.label}
                description={
                  connection.description
                }
                connected={
                  connections[connection.id]
                    ?.connected || false
                }
                mode={
                  connections[connection.id]
                    ?.mode || "paper"
                }
                onConnect={() =>
                  navigate(connection.route)
                }
                color={connection.color}
                borderColor={
                  connection.borderColor
                }
              />
            )
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl md:p-6">
        <div className="mb-5 flex items-center gap-3">
          <FaWallet className="text-2xl text-purple-400" />

          <h2 className="text-xl font-black">
            Wallet & MetaMask
          </h2>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  🦊
                </span>

                <div>
                  <h3 className="font-black">
                    MetaMask / DeFi Wallet
                  </h3>

                  <p className="text-sm text-white/50">
                    {isWalletConnected
                      ? "Wallet connected successfully."
                      : "Connect your wallet for DEX trading."}
                  </p>
                </div>
              </div>

              {activationStatus?.wallet_address_masked && (
                <p className="mt-2 font-mono text-xs text-white/40">
                  {
                    activationStatus.wallet_address_masked
                  }
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/connect-wallet")
              }
              className={`rounded-2xl px-5 py-3 font-black transition ${
                isWalletConnected
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : "bg-purple-600 hover:bg-purple-500"
              }`}
            >
              {isWalletConnected
                ? "Manage"
                : "Connect Wallet"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl md:p-6">
        <div className="mb-5 flex items-center gap-3">
          <FaKey className="text-2xl text-yellow-400" />

          <h2 className="text-xl font-black">
            API Key Management
          </h2>
        </div>

        <div className="space-y-3">
          {apiStatuses.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-black/30 p-4"
            >
              <div>
                <h4 className="font-black">
                  {item.label}
                </h4>

                <p className="text-xs">
                  Status:{" "}
                  <span
                    className={
                      item.connected
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }
                  >
                    {item.connected
                      ? "✅ Connected"
                      : "⚠️ Missing"}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(item.route)
                }
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-black transition hover:bg-white/20"
              >
                {item.connected
                  ? "Manage"
                  : "Connect"}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-xs text-amber-300">
            ⚠️ API keys are encrypted. Never share your keys with anyone.
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl md:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="text-2xl">
            📋
          </span>

          <h2 className="text-xl font-black">
            Setup Progress
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Step
            done={
              hasCard ||
              currentTier === "starter"
            }
            number="1"
            title="Billing"
            text={
              currentTier === "starter"
                ? "No card required"
                : hasCard
                  ? "Payment method saved"
                  : "Add payment method"
            }
          />

          <Step
            done={
              isOKXConnected ||
              isAlpacaConnected
            }
            number="2"
            title="Connect Accounts"
            text="Connect OKX or Alpaca"
          />

          <Step
            done={Boolean(
              activationStatus?.trading_enabled
            )}
            number="3"
            title="Enable Trading"
            text="Start bot automation"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              navigate("/activation")
            }
            className="rounded-2xl bg-emerald-600 px-5 py-4 font-black transition hover:bg-emerald-500"
          >
            Continue Setup →
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/dashboard")
            }
            className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 font-black transition hover:bg-white/15"
          >
            Go to Dashboard
          </button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl md:p-6">
        <div className="mb-5 flex items-center gap-3">
          <FaShieldAlt className="text-2xl text-emerald-400" />

          <h2 className="text-xl font-black">
            Security
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <SecurityAction
            icon={<FaLock />}
            title="Change Password"
            description="Update your account password."
            onClick={() =>
              navigate("/settings/security")
            }
          />

          <SecurityAction
            icon={<FaUserCog />}
            title="Two-Factor Authentication"
            description="Add an extra layer of security."
            onClick={() =>
              navigate("/settings/security")
            }
          />

          <SecurityAction
            icon={<FaServer />}
            title="Active Sessions"
            description="Manage devices logged into your account."
            onClick={() =>
              navigate("/settings/security")
            }
          />

          <SecurityAction
            icon={<FaTrash />}
            title="Delete Account"
            description="Permanently delete your account and data."
            onClick={() =>
              navigate("/settings/security")
            }
            danger
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-xl md:p-6">
        <div className="mb-5 flex items-center gap-3">
          <FaShieldAlt className="text-2xl text-emerald-400" />

          <h2 className="text-xl font-black">
            Security Notes
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <SecurityNote
            icon="🔒"
            title="Data Encryption"
            description="Sensitive data is encrypted at rest and in transit."
          />

          <SecurityNote
            icon="🔑"
            title="API Key Protection"
            description="Connected API credentials are encrypted before storage."
          />

          <SecurityNote
            icon="🏦"
            title="Stripe Integration"
            description="Stripe handles card information. IMALI does not store full card numbers."
          />

          <SecurityNote
            icon="📧"
            title="Security Notifications"
            description="Account changes can trigger security notifications."
          />
        </div>

        <div className="mt-5 border-t border-white/10 pt-4 text-center">
          <p className="text-xs text-white/40">
            Need help? Contact support at support@imali-defi.com.
          </p>
        </div>
      </section>
    </div>
  );
}

function HealthBadge({
  label,
  value,
  status,
}) {
  const successful =
    status === true;

  const displayValue =
    value ||
    (successful ? "✅" : "❌");

  return (
    <span
      className={`whitespace-nowrap rounded-full border px-2 py-1 text-xs ${
        successful
          ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
          : "border-amber-500/30 bg-amber-500/20 text-amber-300"
      }`}
    >
      {label}: {displayValue}
    </span>
  );
}

function StatusBadge({
  label,
  status,
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black ${
        status
          ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
          : "border-white/10 bg-gray-500/20 text-gray-400"
      }`}
    >
      {status ? "✅" : "⏳"} {label}
    </span>
  );
}

function BotStatusItem({
  label,
  value,
  status,
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
      <p className="text-xs text-white/40">
        {label}
      </p>

      <p
        className={`text-sm font-black ${
          status
            ? "text-white"
            : "text-white/40"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function UpgradeCard({
  icon,
  label,
  price,
  features,
  onUpgrade,
  color,
  borderColor,
}) {
  return (
    <div
      className={`rounded-[1.5rem] border ${borderColor} bg-gradient-to-br ${color} p-5`}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl">
          {icon}
        </span>

        <div>
          <h3 className="text-xl font-black">
            {label}
          </h3>

          <p className="font-black text-emerald-300">
            {price}
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-1">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-center gap-2 text-sm text-white/70"
          >
            <FaCheckCircle className="text-xs text-emerald-400" />

            {feature}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onUpgrade}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 font-black text-white transition hover:from-amber-600 hover:to-orange-600"
      >
        Upgrade Now
      </button>
    </div>
  );
}

function ConnectionCard({
  icon,
  label,
  description,
  connected,
  mode,
  onConnect,
  color,
  borderColor,
}) {
  return (
    <div
      className={`rounded-[1.5rem] border ${borderColor} bg-gradient-to-br ${color} p-4`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">
            {icon}
          </span>

          <div>
            <h4 className="font-black">
              {label}
            </h4>

            <p className="text-xs text-white/50">
              {description}
            </p>
          </div>
        </div>

        <span
          className={`rounded-full border px-2 py-1 text-xs font-black ${
            connected
              ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
              : "border-white/10 bg-gray-500/20 text-gray-400"
          }`}
        >
          {connected
            ? "Connected"
            : "Disconnected"}
        </span>
      </div>

      {connected && (
        <p className="mt-2 text-xs text-white/40">
          Mode:{" "}
          <span className="text-emerald-300">
            {String(mode).toUpperCase()}
          </span>
        </p>
      )}

      <button
        type="button"
        onClick={onConnect}
        className={`mt-3 w-full rounded-xl px-4 py-2 text-sm font-black transition ${
          connected
            ? "border border-white/10 bg-white/10 hover:bg-white/20"
            : "bg-cyan-600 hover:bg-cyan-500"
        }`}
      >
        {connected
          ? "Manage"
          : "Connect"}
      </button>
    </div>
  );
}

function InfoRow({
  label,
  value,
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 py-2 text-sm last:border-b-0">
      <span className="font-bold text-white/40">
        {label}
      </span>

      <span className="text-right font-bold capitalize text-white">
        {value}
      </span>
    </div>
  );
}

function Step({
  done,
  number,
  title,
  text,
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        done
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-white/10 bg-black/30"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full font-black ${
            done
              ? "bg-emerald-400 text-black"
              : "bg-white/10 text-white/50"
          }`}
        >
          {done ? "✓" : number}
        </div>

        <div>
          <h3 className="text-xl font-black">
            {title}
          </h3>

          <p className="text-sm text-white/50">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

function SecurityAction({
  icon,
  title,
  description,
  onClick,
  danger = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        danger
          ? "border-red-500/20 bg-red-500/5 hover:border-red-500/40 hover:bg-red-500/10"
          : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`text-lg ${
            danger
              ? "text-red-400"
              : "text-blue-400"
          }`}
        >
          {icon}
        </span>

        <h4
          className={`text-sm font-black ${
            danger
              ? "text-red-400"
              : "text-white"
          }`}
        >
          {title}
        </h4>
      </div>

      <p className="mt-1 text-xs text-white/50">
        {description}
      </p>
    </button>
  );
}

function SecurityNote({
  icon,
  title,
  description,
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">
          {icon}
        </span>

        <h4 className="text-sm font-black">
          {title}
        </h4>
      </div>

      <p className="mt-1 text-xs text-white/50">
        {description}
      </p>
    </div>
  );
}
