// src/pages/BillingDashboard.jsx

import React from "react";
import { useNavigate } from "react-router-dom";

import {
  FaApple,
  FaBitcoin,
  FaCheckCircle,
  FaCreditCard,
  FaKey,
  FaLock,
  FaPlug,
  FaRobot,
  FaWallet,
  FaWater,
} from "react-icons/fa";

const TIER_CONFIG = {
  starter: {
    label: "Starter",
    icon: "🌱",
    price: "Free",
    description:
      "Paper trade first. No risk and no credit card required.",
    borderColor: "border-emerald-500/30",
    background:
      "from-emerald-600/20 to-teal-500/10",
    included: [
      "$1,000 paper trading demo",
      "Test all bots risk-free",
      "Stock and crypto preview",
      "No credit card required",
      "Instant access",
    ],
  },

  pro: {
    label: "Pro",
    icon: "⭐",
    price: "$19/mo",
    description:
      "Live trading and advanced strategy signals.",
    borderColor: "border-blue-500/30",
    background:
      "from-blue-600/20 to-indigo-500/10",
    included: [
      "Live stock trading with Alpaca",
      "Live crypto spot trading with OKX",
      "AI-assisted strategies",
      "Take-profit and stop-loss controls",
      "Performance dashboard",
      "Trade history",
      "Trading automation",
    ],
  },

  elite: {
    label: "Elite",
    icon: "👑",
    price: "$49/mo",
    description:
      "Full trading, DeFi, wallet, and advanced automation access.",
    borderColor: "border-purple-500/30",
    background:
      "from-purple-600/20 to-pink-500/10",
    included: [
      "Everything included in Pro",
      "DEX sniper tools",
      "Uniswap and QuickSwap access",
      "Futures trading",
      "Staking and lending",
      "NFT membership benefits",
      "IMALI token discounts",
      "Advanced wallet automation",
    ],
  },

  enterprise: {
    label: "Enterprise",
    icon: "🏢",
    price: "Custom",
    description:
      "White-label, team, treasury, and organization tools.",
    borderColor: "border-indigo-500/30",
    background:
      "from-indigo-600/20 to-cyan-500/10",
    included: [
      "Team and organization management",
      "White-label capabilities",
      "Treasury tools",
      "DAO governance",
      "Dedicated support",
    ],
  },
};

function normalizeTier(value) {
  const tier = String(value || "starter")
    .toLowerCase()
    .trim();

  return TIER_CONFIG[tier]
    ? tier
    : "starter";
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
  billingReady = false,
  busy = "",
  onAddCard,
  onRemoveCard,
  onCancelSubscription,
}) {
  const navigate = useNavigate();

  const currentTier = normalizeTier(
    tier || user?.tier
  );

  const tierConfig =
    TIER_CONFIG[currentTier];

  const activationStatus =
    unwrapActivation(activation);

  const hasCard = Boolean(
    cardStatus?.hasCard ||
      cardStatus?.has_card ||
      cardStatus?.has_card_on_file ||
      cardStatus?.billing_complete ||
      activationStatus?.has_card_on_file ||
      activationStatus?.billing_complete ||
      user?.has_card_on_file ||
      user?.billing_complete
  );

  const isStarter =
    currentTier === "starter";

  const isPro =
    currentTier === "pro";

  const isElite =
    currentTier === "elite";

  const isEnterprise =
    currentTier === "enterprise";

  const isPaidTier =
    isPro || isElite;

  const canUseLiveTrading =
    billingReady && (isPro || isElite);

  const canUseOKX =
    canUseLiveTrading;

  const canUseAlpaca =
    canUseLiveTrading;

  const canUseWallet =
    billingReady && isElite;

  const canUseDEX =
    billingReady && isElite;

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

  const subscriptionStatus =
    subscription?.status ||
    subscription?.subscription_status ||
    user?.subscription_status ||
    (isStarter
      ? "free"
      : hasCard
        ? "active"
        : "payment required");

  const cardLabel =
    cardStatus?.brand &&
    cardStatus?.last4
      ? `${String(
          cardStatus.brand
        ).toUpperCase()} •••• ${cardStatus.last4}`
      : hasCard
        ? "Payment method saved"
        : "No payment method";

  return (
    <div className="space-y-6">
      <section
        className={`rounded-[2rem] border ${tierConfig.borderColor} bg-gradient-to-br ${tierConfig.background} p-5 shadow-xl md:p-6`}
      >
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div className="flex items-start gap-4">
            <div className="text-5xl">
              {tierConfig.icon}
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white/40">
                Current Plan
              </p>

              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-black">
                  {tierConfig.label}
                </h2>

                <span className="font-black text-emerald-300">
                  {tierConfig.price}
                </span>
              </div>

              <p className="mt-2 max-w-2xl text-white/60">
                {tierConfig.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge
                  label={subscriptionStatus}
                  active={
                    isStarter ||
                    hasCard
                  }
                />

                {!isStarter && (
                  <StatusBadge
                    label={
                      hasCard
                        ? "Payment Active"
                        : "Payment Required"
                    }
                    active={hasCard}
                  />
                )}

                {canUseLiveTrading && (
                  <StatusBadge
                    label={
                      isBotRunning
                        ? "Bot Running"
                        : "Bot Ready"
                    }
                    active={isBotRunning}
                  />
                )}
              </div>
            </div>
          </div>

          {!isElite &&
            !isEnterprise && (
              <button
                type="button"
                onClick={() =>
                  navigate("/pricing")
                }
                className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 font-black text-white hover:from-amber-600 hover:to-orange-600"
              >
                {isStarter
                  ? "Upgrade Plan"
                  : "Upgrade to Elite"}
              </button>
            )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl md:p-6">
        <h2 className="text-xl font-black">
          Included With {tierConfig.label}
        </h2>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {tierConfig.included.map(
            (feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4"
              >
                <FaCheckCircle className="shrink-0 text-emerald-400" />

                <span className="text-sm text-white/80">
                  {feature}
                </span>
              </div>
            )
          )}
        </div>
      </section>

      {isStarter && (
        <StarterAccess
          onUpgrade={() =>
            navigate("/pricing")
          }
        />
      )}

      {isPaidTier && !billingReady && (
        <PaymentRequired
          tierConfig={tierConfig}
          busy={busy}
          onAddCard={onAddCard}
        />
      )}

      {isPaidTier && billingReady && (
        <>
          <PaymentMethod
            cardLabel={cardLabel}
            cardStatus={cardStatus}
            hasCard={hasCard}
            busy={busy}
            onAddCard={onAddCard}
            onRemoveCard={onRemoveCard}
          />

          <SubscriptionSection
            tierConfig={tierConfig}
            subscriptionStatus={
              subscriptionStatus
            }
            subscription={subscription}
            busy={busy}
            onCancelSubscription={
              onCancelSubscription
            }
          />

          <BotStatus
            activationStatus={
              activationStatus
            }
            isBotRunning={isBotRunning}
            isOKXConnected={
              isOKXConnected
            }
            isAlpacaConnected={
              isAlpacaConnected
            }
          />

          <TradingConnections
            showOKX={canUseOKX}
            showAlpaca={canUseAlpaca}
            showWallet={canUseWallet}
            isOKXConnected={
              isOKXConnected
            }
            isAlpacaConnected={
              isAlpacaConnected
            }
            isWalletConnected={
              isWalletConnected
            }
            navigate={navigate}
          />

          <ApiKeyManagement
            showOKX={canUseOKX}
            showAlpaca={canUseAlpaca}
            showWallet={canUseWallet}
            isOKXConnected={
              isOKXConnected
            }
            isAlpacaConnected={
              isAlpacaConnected
            }
            isWalletConnected={
              isWalletConnected
            }
            navigate={navigate}
          />

          {canUseDEX && (
            <EliteWalletSection
              connected={
                isWalletConnected
              }
              walletAddress={
                activationStatus
                  ?.wallet_address_masked
              }
              navigate={navigate}
            />
          )}

          <SetupProgress
            tier={currentTier}
            billingReady={billingReady}
            accountConnected={
              isOKXConnected ||
              isAlpacaConnected ||
              (isElite &&
                isWalletConnected)
            }
            tradingEnabled={
              isBotRunning
            }
            navigate={navigate}
          />
        </>
      )}

      {isEnterprise && (
        <section className="rounded-[2rem] border border-indigo-500/30 bg-indigo-500/10 p-6 shadow-xl">
          <h2 className="text-2xl font-black">
            Enterprise Account
          </h2>

          <p className="mt-2 text-white/60">
            Enterprise billing, organizations, white-label configuration, DAO, and treasury tools are managed through the enterprise dashboard.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/admin/dashboard")
            }
            className="mt-5 rounded-2xl bg-indigo-600 px-5 py-4 font-black hover:bg-indigo-500"
          >
            Open Enterprise Dashboard
          </button>
        </section>
      )}
    </div>
  );
}

function StarterAccess({ onUpgrade }) {
  return (
    <section className="rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 p-5 shadow-xl md:p-6">
      <div className="flex items-center gap-3">
        <FaRobot className="text-2xl text-emerald-400" />

        <h2 className="text-xl font-black">
          Paper Trading Access
        </h2>
      </div>

      <p className="mt-3 text-white/60">
        Your Starter account includes risk-free paper trading. Live exchange, API-key, wallet, and DEX sections remain hidden until you upgrade.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() =>
            window.location.assign(
              "/dashboard"
            )
          }
          className="rounded-2xl bg-emerald-600 px-5 py-4 font-black hover:bg-emerald-500"
        >
          Open Paper Dashboard
        </button>

        <button
          type="button"
          onClick={onUpgrade}
          className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 font-black hover:bg-white/20"
        >
          View Paid Plans
        </button>
      </div>
    </section>
  );
}

function PaymentRequired({
  tierConfig,
  busy,
  onAddCard,
}) {
  return (
    <section className="rounded-[2rem] border border-amber-500/30 bg-amber-500/10 p-5 shadow-xl md:p-6">
      <div className="flex items-center gap-3">
        <FaLock className="text-2xl text-amber-300" />

        <h2 className="text-xl font-black">
          Activate {tierConfig.label}
        </h2>
      </div>

      <p className="mt-3 text-white/70">
        Add a payment method before connecting exchange API keys or using live trading features.
      </p>

      <button
        type="button"
        onClick={onAddCard}
        disabled={busy === "card"}
        className="mt-5 rounded-2xl bg-blue-600 px-5 py-4 font-black hover:bg-blue-500 disabled:opacity-50"
      >
        {busy === "card"
          ? "Preparing Secure Form..."
          : "Add Credit Card"}
      </button>
    </section>
  );
}

function PaymentMethod({
  cardLabel,
  cardStatus,
  hasCard,
  busy,
  onAddCard,
  onRemoveCard,
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl md:p-6">
      <div className="flex items-center gap-3">
        <FaCreditCard className="text-2xl text-emerald-400" />

        <h2 className="text-xl font-black">
          Payment Method
        </h2>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/30 p-5">
        <p className="font-black">
          {cardLabel}
        </p>

        {cardStatus?.exp_month &&
          cardStatus?.exp_year && (
            <p className="mt-1 text-sm text-white/50">
              Expires{" "}
              {cardStatus.exp_month}/
              {cardStatus.exp_year}
            </p>
          )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onAddCard}
          className="rounded-2xl bg-blue-600 px-5 py-4 font-black hover:bg-blue-500"
        >
          Update Card
        </button>

        {hasCard && (
          <button
            type="button"
            onClick={onRemoveCard}
            disabled={busy === "remove"}
            className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 font-black text-red-200 hover:bg-red-500/20 disabled:opacity-50"
          >
            {busy === "remove"
              ? "Removing..."
              : "Remove Card"}
          </button>
        )}
      </div>
    </section>
  );
}

function SubscriptionSection({
  tierConfig,
  subscriptionStatus,
  subscription,
  busy,
  onCancelSubscription,
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl md:p-6">
      <h2 className="text-xl font-black">
        Subscription
      </h2>

      <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/30 p-5">
        <InfoRow
          label="Plan"
          value={tierConfig.label}
        />

        <InfoRow
          label="Price"
          value={tierConfig.price}
        />

        <InfoRow
          label="Status"
          value={String(
            subscriptionStatus
          ).replaceAll("_", " ")}
        />

        {subscription?.current_period_end && (
          <InfoRow
            label="Renewal"
            value={new Date(
              subscription.current_period_end *
                1000
            ).toLocaleDateString()}
          />
        )}
      </div>

      <button
        type="button"
        onClick={onCancelSubscription}
        disabled={busy === "cancel"}
        className="mt-4 w-full rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 font-black text-red-200 hover:bg-red-500/20 disabled:opacity-50"
      >
        {busy === "cancel"
          ? "Canceling..."
          : "Cancel Subscription"}
      </button>
    </section>
  );
}

function BotStatus({
  activationStatus,
  isBotRunning,
  isOKXConnected,
  isAlpacaConnected,
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl md:p-6">
      <div className="flex items-center gap-3">
        <FaRobot className="text-2xl text-cyan-400" />

        <h2 className="text-xl font-black">
          Trading Bot
        </h2>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatusItem
          label="Status"
          value={
            isBotRunning
              ? "Running"
              : "Stopped"
          }
        />

        <StatusItem
          label="Mode"
          value={String(
            activationStatus?.trading_mode ||
              "paper"
          ).toUpperCase()}
        />

        <StatusItem
          label="Strategy"
          value={
            activationStatus?.current_strategy ||
            "Balanced AI"
          }
        />

        <StatusItem
          label="Exchange"
          value={
            isOKXConnected
              ? "OKX"
              : isAlpacaConnected
                ? "Alpaca"
                : "Not Connected"
          }
        />
      </div>
    </section>
  );
}

function TradingConnections({
  showOKX,
  showAlpaca,
  showWallet,
  isOKXConnected,
  isAlpacaConnected,
  isWalletConnected,
  navigate,
}) {
  const connections = [];

  if (showOKX) {
    connections.push({
      id: "okx",
      label: "OKX Exchange",
      description:
        "Connect OKX for live crypto spot trading.",
      icon: <FaBitcoin />,
      connected: isOKXConnected,
      route: "/connect-okx",
    });
  }

  if (showAlpaca) {
    connections.push({
      id: "alpaca",
      label: "Alpaca Trading",
      description:
        "Connect Alpaca for live stock trading.",
      icon: <FaApple />,
      connected: isAlpacaConnected,
      route: "/connect-alpaca",
    });
  }

  if (showWallet) {
    connections.push({
      id: "wallet",
      label: "DEX Wallet",
      description:
        "Connect MetaMask for Elite DEX and DeFi tools.",
      icon: <FaWater />,
      connected: isWalletConnected,
      route: "/connect-wallet",
    });
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl md:p-6">
      <div className="flex items-center gap-3">
        <FaPlug className="text-2xl text-cyan-400" />

        <h2 className="text-xl font-black">
          Trading Connections
        </h2>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {connections.map(
          (connection) => (
            <ConnectionCard
              key={connection.id}
              {...connection}
              onConnect={() =>
                navigate(connection.route)
              }
            />
          )
        )}
      </div>
    </section>
  );
}

function ApiKeyManagement({
  showOKX,
  showAlpaca,
  showWallet,
  isOKXConnected,
  isAlpacaConnected,
  isWalletConnected,
  navigate,
}) {
  const items = [];

  if (showOKX) {
    items.push({
      id: "okx",
      label: "OKX API Key",
      connected: isOKXConnected,
      route: "/connect-okx",
    });
  }

  if (showAlpaca) {
    items.push({
      id: "alpaca",
      label: "Alpaca API Key",
      connected: isAlpacaConnected,
      route: "/connect-alpaca",
    });
  }

  if (showWallet) {
    items.push({
      id: "wallet",
      label: "Wallet Address",
      connected: isWalletConnected,
      route: "/connect-wallet",
    });
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl md:p-6">
      <div className="flex items-center gap-3">
        <FaKey className="text-2xl text-yellow-400" />

        <h2 className="text-xl font-black">
          API Key Management
        </h2>
      </div>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-black/30 p-4"
          >
            <div>
              <h3 className="font-black">
                {item.label}
              </h3>

              <p
                className={`text-xs ${
                  item.connected
                    ? "text-emerald-400"
                    : "text-amber-300"
                }`}
              >
                {item.connected
                  ? "✅ Connected"
                  : "⚠️ Not connected"}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(item.route)
              }
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-black hover:bg-white/20"
            >
              {item.connected
                ? "Manage"
                : "Connect"}
            </button>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-white/40">
        API keys are encrypted before storage. Never share your exchange credentials.
      </p>
    </section>
  );
}

function EliteWalletSection({
  connected,
  walletAddress,
  navigate,
}) {
  return (
    <section className="rounded-[2rem] border border-purple-500/30 bg-purple-500/10 p-5 shadow-xl md:p-6">
      <div className="flex items-center gap-3">
        <FaWallet className="text-2xl text-purple-300" />

        <h2 className="text-xl font-black">
          Elite Wallet & DEX Tools
        </h2>
      </div>

      <p className="mt-3 text-white/60">
        Connect MetaMask to access DEX sniper, staking, lending, and wallet-based tools.
      </p>

      {walletAddress && (
        <p className="mt-3 font-mono text-xs text-white/40">
          {walletAddress}
        </p>
      )}

      <button
        type="button"
        onClick={() =>
          navigate("/connect-wallet")
        }
        className="mt-5 rounded-2xl bg-purple-600 px-5 py-4 font-black hover:bg-purple-500"
      >
        {connected
          ? "Manage Wallet"
          : "Connect Wallet"}
      </button>
    </section>
  );
}

function SetupProgress({
  tier,
  billingReady,
  accountConnected,
  tradingEnabled,
  navigate,
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl md:p-6">
      <h2 className="text-xl font-black">
        Setup Progress
      </h2>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Step
          number="1"
          title="Billing"
          text={`${tier} payment method`}
          done={billingReady}
        />

        <Step
          number="2"
          title="Connect Account"
          text={
            tier === "elite"
              ? "OKX, Alpaca, or wallet"
              : "OKX or Alpaca"
          }
          done={accountConnected}
        />

        <Step
          number="3"
          title="Enable Trading"
          text="Start automation"
          done={tradingEnabled}
        />
      </div>

      <button
        type="button"
        onClick={() =>
          navigate("/activation")
        }
        className="mt-5 rounded-2xl bg-emerald-600 px-5 py-4 font-black hover:bg-emerald-500"
      >
        Continue Setup →
      </button>
    </section>
  );
}

function ConnectionCard({
  icon,
  label,
  description,
  connected,
  onConnect,
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-2xl">
          {icon}
        </span>

        <span
          className={`rounded-full px-2 py-1 text-xs font-black ${
            connected
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-white/10 text-white/40"
          }`}
        >
          {connected
            ? "Connected"
            : "Disconnected"}
        </span>
      </div>

      <h3 className="mt-4 font-black">
        {label}
      </h3>

      <p className="mt-1 text-sm text-white/50">
        {description}
      </p>

      <button
        type="button"
        onClick={onConnect}
        className="mt-4 w-full rounded-xl bg-cyan-600 px-4 py-3 font-black hover:bg-cyan-500"
      >
        {connected
          ? "Manage"
          : "Connect"}
      </button>
    </div>
  );
}

function StatusBadge({
  label,
  active,
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black capitalize ${
        active
          ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
          : "border-amber-500/30 bg-amber-500/20 text-amber-200"
      }`}
    >
      {active ? "✅" : "⏳"} {label}
    </span>
  );
}

function StatusItem({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 p-4 text-center">
      <p className="text-xs text-white/40">
        {label}
      </p>

      <p className="mt-1 text-sm font-black">
        {value}
      </p>
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

      <span className="text-right font-bold capitalize">
        {value}
      </span>
    </div>
  );
}

function Step({
  number,
  title,
  text,
  done,
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
          <h3 className="font-black">
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
