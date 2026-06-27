// src/pages/BillingDashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import CardUpdateForm from "./CardUpdateForm";

const TIERS = {
  starter: {
    label: "Starter",
    icon: "🌱",
    price: "Free",
    description: "Paper trading and beginner tools. No credit card required.",
  },
  pro: {
    label: "Pro",
    icon: "⭐",
    price: "\$19/mo",
    description: "Live crypto, live stocks, AI strategies, and analytics.",
  },
  elite: {
    label: "Elite",
    icon: "👑",
    price: "\$49/mo",
    description: "Crypto, DEX, futures, wallet tools, and advanced automation.",
  },
  enterprise: {
    label: "Enterprise",
    icon: "🏢",
    price: "Custom",
    description: "Team management, white-label tools, and dedicated support.",
  },
};

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
  const activationStatus = activation?.status || activation || {};

  const hasCard =
    cardStatus?.hasCard === true ||
    cardStatus?.has_card === true ||
    cardStatus?.has_card_on_file === true ||
    user?.has_card_on_file === true ||
    activationStatus?.has_card_on_file === true;

  const billingComplete = hasCard;

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

  return (
    <div className="space-y-6">
      {/* Payment Method */}
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black">💳 Payment Method</h2>
          <span className={`h-3 w-3 rounded-full ${hasCard ? "bg-emerald-400" : "bg-gray-500"}`} />
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-5 mb-5">
          <div className="flex items-center gap-3 mb-3">
            <span className={`h-3 w-3 rounded-full ${hasCard ? "bg-emerald-400" : "bg-gray-500"}`} />
            <h3 className="font-black">{cardLabel}</h3>
          </div>
          <p className="text-white/50 text-sm">
            {hasCard
              ? "Your payment method is saved securely through Stripe."
              : "Add a card to activate paid access."}
          </p>
          {cardStatus?.exp_month && cardStatus?.exp_year && (
            <p className="text-white/40 text-sm mt-2">
              Expires {cardStatus.exp_month}/{cardStatus.exp_year}
            </p>
          )}
        </div>

        {canManageCard && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={onUpdateCard}
              disabled={!!busy || showCardForm}
              className="rounded-2xl bg-blue-600 hover:bg-blue-500 px-5 py-4 font-black text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {showCardForm ? "Card Form Open" : hasCard ? "Update Card" : "Add Card"}
            </button>
            {hasCard && (
              <button
                onClick={onRemoveCard}
                disabled={busy === "remove"}
                className="rounded-2xl bg-red-900/70 hover:bg-red-800/70 border border-red-700/60 px-5 py-4 font-black text-red-100 transition disabled:opacity-50"
              >
                {busy === "remove" ? "Removing..." : "Remove Card"}
              </button>
            )}
          </div>
        )}

        {/* ⭐ Card Form - appears under Add Card button */}
        {canManageCard && showCardForm && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <CardUpdateForm
              tier={pendingTier || currentTier}
              onSuccess={onCardSuccess}
              onCancel={onCancelCardForm}
            />
          </div>
        )}
      </section>

      {/* Subscription */}
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black">📄 Subscription</h2>
          <span className="text-3xl">📋</span>
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

      {/* Setup Progress */}
      {currentTier !== "starter" && (
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-xl">
          <h2 className="text-2xl font-black mb-5">⚙️ Setup Progress</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Step
              done={billingComplete}
              number="1"
              title="Billing"
              text={billingComplete ? "Payment method saved" : "Add payment method"}
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
              onClick={() => navigate("/dashboard")}
              className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 px-5 py-4 font-black text-white transition"
            >
              Go to Dashboard
            </button>
            {hasCard && (
              <button
                onClick={() => navigate("/activation", { state: { tier: currentTier } })}
                className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-5 py-4 font-black text-white transition"
              >
                Continue to Setup →
              </button>
            )}
          </div>
        </section>
      )}
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
