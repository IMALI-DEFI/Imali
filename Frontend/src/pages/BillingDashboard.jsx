// imali/Frontend/src/pages/BillingDashboard.jsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const TIERS = {
  starter: {
    label: "Starter",
    icon: "🌱",
    price: "Free",
    description: "Paper trading and beginner tools.",
  },
  pro: {
    label: "Pro",
    icon: "⭐",
    price: "$19/mo",
    description: "Live crypto and stock trading.",
  },
  elite: {
    label: "Elite",
    icon: "👑",
    price: "$49/mo",
    description: "Crypto, DEX, futures, wallet tools, and advanced automation.",
  },
  enterprise: {
    label: "Enterprise",
    icon: "🏢",
    price: "Custom",
    description: "Team, white-label, and custom billing.",
  },
};

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

  const currentTier = String(tier || user?.tier || "starter").toLowerCase();
  const meta = TIERS[currentTier] || TIERS.starter;

  const activationStatus = activation?.status || activation || {};

  const hasCard =
    cardStatus?.hasCard === true ||
    cardStatus?.has_card === true ||
    cardStatus?.has_card_on_file === true ||
    activationStatus?.has_card_on_file === true ||
    user?.has_card_on_file === true;

  const billingComplete =
    hasCard ||
    cardStatus?.billingComplete === true ||
    cardStatus?.billing_complete === true ||
    activationStatus?.billing_complete === true ||
    user?.billing_complete === true;

  const subscriptionStatus = useMemo(() => {
    return (
      subscription?.status ||
      user?.subscription_status ||
      (currentTier === "starter" ? "free" : hasCard ? "active" : "incomplete")
    );
  }, [subscription, user, currentTier, hasCard]);

  const canManageCard = currentTier === "pro" || currentTier === "elite";
  const canCancel = canManageCard && subscriptionStatus !== "canceled";

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm text-emerald-300 font-black tracking-wide">
            IMALI BILLING
          </p>
          <h1 className="text-3xl md:text-4xl font-black mt-1">
            Billing & Subscription
          </h1>
          <p className="text-white/50 mt-2">
            Manage your plan, card, subscription, and activation status.
          </p>
        </div>

        <button
          onClick={() => navigate("/dashboard")}
          className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 font-black"
        >
          Back to Dashboard
        </button>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <div className="text-5xl mb-4">{meta.icon}</div>
          <p className="text-white/40 text-sm">Current Plan</p>
          <h2 className="text-3xl font-black mt-1">{meta.label}</h2>
          <p className="text-emerald-300 font-black mt-2">{meta.price}</p>
          <p className="text-white/50 mt-3">{meta.description}</p>

          <button
            onClick={() => navigate("/pricing", { state: { tier: currentTier } })}
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-4 font-black"
          >
            Change Plan
          </button>
        </Card>

        <Card>
          <div className="text-5xl mb-4">💳</div>
          <p className="text-white/40 text-sm">Payment Method</p>
          <h2 className="text-2xl font-black mt-1">
            {hasCard ? "Card On File" : "No Card Saved"}
          </h2>
          <p className="text-white/50 mt-3">
            {hasCard
              ? "Your card is ready for subscription billing."
              : currentTier === "starter"
              ? "Starter does not require a payment method."
              : "Add a card to activate paid access."}
          </p>

          {canManageCard && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={onUpdateCard}
                disabled={!!busy}
                className="rounded-2xl bg-blue-600 hover:bg-blue-500 px-4 py-4 font-black disabled:opacity-50"
              >
                {hasCard ? "Update Card" : "Add Card"}
              </button>

              {hasCard && (
                <button
                  onClick={onRemoveCard}
                  disabled={busy === "remove"}
                  className="rounded-2xl bg-red-900/70 hover:bg-red-800/70 border border-red-700/60 px-4 py-4 font-black text-red-100 disabled:opacity-50"
                >
                  {busy === "remove" ? "Removing..." : "Remove Card"}
                </button>
              )}
            </div>
          )}
        </Card>

        <Card>
          <div className="text-5xl mb-4">📄</div>
          <p className="text-white/40 text-sm">Subscription</p>
          <h2 className="text-2xl font-black mt-1 capitalize">
            {String(subscriptionStatus).replace("_", " ")}
          </h2>

          {subscription?.amount ? (
            <p className="text-emerald-300 font-black mt-2">
              {(subscription.currency || "usd").toUpperCase()} $
              {(subscription.amount / 100).toFixed(2)} /{" "}
              {subscription.interval || "month"}
            </p>
          ) : (
            <p className="text-white/50 mt-3">
              {currentTier === "starter"
                ? "Free plan active."
                : "Subscription details will appear here after billing sync."}
            </p>
          )}

          {canCancel && (
            <button
              onClick={onCancelSubscription}
              disabled={busy === "cancel"}
              className="mt-6 w-full rounded-2xl bg-red-900/70 hover:bg-red-800/70 border border-red-700/60 px-5 py-4 font-black text-red-100 disabled:opacity-50"
            >
              {busy === "cancel" ? "Canceling..." : "Cancel Subscription"}
            </button>
          )}
        </Card>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6">
        <h2 className="text-2xl font-black mb-5">Setup Progress</h2>

        <div className="grid gap-4 md:grid-cols-3">
          <Step
            done={billingComplete || currentTier === "starter"}
            number="1"
            title="Billing"
            text={
              currentTier === "starter"
                ? "No card required"
                : billingComplete
                ? "Payment method saved"
                : "Add payment method"
            }
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

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate("/activation", { state: { tier: currentTier } })}
            className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-5 py-4 font-black"
          >
            Continue Activation
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 px-5 py-4 font-black"
          >
            Go to Dashboard
          </button>
        </div>
      </section>
    </div>
  );
}

function Card({ children }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-xl">
      {children}
    </section>
  );
}

function Step({ done, number, title, text }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        done
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-white/10 bg-black/30"
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