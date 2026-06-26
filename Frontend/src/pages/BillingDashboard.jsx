// src/pages/BillingDashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

import nftStarter from "../assets/images/nfts/nft-starter.png";
import nftPro from "../assets/images/nfts/nft-pro.png";
import nftElite from "../assets/images/nfts/nft-elite.png";

const ENTERPRISE_IMAGE = "/enterprise.PNG";

const TIERS = {
  starter: {
    label: "Starter",
    icon: "🌱",
    image: nftStarter,
    price: "Free",
    description: "Paper trading, demo balance, and beginner-friendly tools.",
    gradient: "from-emerald-600/20 to-teal-500/10",
    border: "border-emerald-500/30",
  },
  pro: {
    label: "Pro",
    icon: "⭐",
    image: nftPro,
    price: "$19/mo",
    description: "Live crypto, live stocks, AI strategies, and analytics.",
    gradient: "from-blue-600/20 to-indigo-500/10",
    border: "border-blue-500/30",
  },
  elite: {
    label: "Elite",
    icon: "👑",
    image: nftElite,
    price: "$49/mo",
    description: "Crypto, DEX, futures, wallet tools, and advanced automation.",
    gradient: "from-purple-600/20 to-pink-500/10",
    border: "border-purple-500/30",
  },
  enterprise: {
    label: "Enterprise",
    icon: "🏢",
    image: ENTERPRISE_IMAGE,
    price: "Custom",
    description: "Team management, white-label tools, and dedicated support.",
    gradient: "from-indigo-600/20 to-cyan-500/10",
    border: "border-indigo-500/30",
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
  onUpdateCard,
  onRemoveCard,
  onCancelSubscription,
}) {
  const navigate = useNavigate();

  const currentTier = String(tier || user?.tier || "starter").toLowerCase();
  const meta = TIERS[currentTier] || TIERS.starter;
  const activationStatus = activation?.status || activation || {};

  // ✅ FIX: Only check has_card_on_file – never billing_complete
  const hasCard =
    cardStatus?.hasCard === true ||
    cardStatus?.has_card === true ||
    cardStatus?.has_card_on_file === true ||
    user?.has_card_on_file === true ||
    activationStatus?.has_card_on_file === true;

  // ✅ billingComplete is now simply hasCard (no billing_complete anywhere)
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

  const upgradeTo = (nextTier) => {
    localStorage.setItem("IMALI_SELECTED_TIER", nextTier);
    navigate(`/billing?tier=${nextTier}`, {
      replace: false,
      state: {
        tier: nextTier,
        updateCard: true,
      },
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm text-emerald-300 font-black tracking-wide">IMALI BILLING</p>
          <h1 className="text-3xl md:text-4xl font-black mt-1">Billing & Subscription</h1>
          <p className="text-white/50 mt-2">Manage your plan, payment method, subscription, and setup.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => navigate("/dashboard")} className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 font-black">
            Go to Dashboard
          </button>
          <button onClick={() => navigate("/pricing", { state: { tier: currentTier } })} className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-black">
            View Pricing
          </button>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className={`rounded-[2rem] border ${meta.border} bg-gradient-to-br ${meta.gradient} p-5 md:p-6 shadow-xl overflow-hidden`}>
          <div className="aspect-square rounded-[1.5rem] bg-black/30 border border-white/10 overflow-hidden flex items-center justify-center mb-5">
            <img src={meta.image} alt={`${meta.label} plan`} className="w-full h-full object-cover" />
          </div>
          <p className="text-white/40 text-sm">Current Plan</p>
          <h2 className="text-3xl font-black mt-1">{meta.label} Plan</h2>
          <p className="text-emerald-300 font-black mt-2">{meta.price}</p>
          <p className="text-white/60 mt-3">{meta.description}</p>

          {currentTier === "starter" ? (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => upgradeTo("pro")} className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 font-black">
                Upgrade to Pro
              </button>
              <button onClick={() => upgradeTo("elite")} className="rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-4 font-black">
                Upgrade to Elite
              </button>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => navigate("/pricing", { state: { tier: currentTier } })} className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 px-5 py-4 font-black">
                Change Plan
              </button>
              <button onClick={() => navigate("/activation", { state: { tier: currentTier } })} className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-5 py-4 font-black">
                Continue Setup
              </button>
            </div>
          )}
        </section>

        <section className="space-y-6">
          <Panel title="Payment Method" icon="💳">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${hasCard ? "bg-emerald-400" : "bg-gray-500"}`} />
                <h3 className="font-black">{cardLabel}</h3>
              </div>
              <p className="text-white/50 text-sm mt-3">
                {hasCard
                  ? "Your payment method is saved securely through Stripe."
                  : currentTier === "starter"
                  ? "Starter does not require a card. Upgrade when ready."
                  : "Add a card to activate paid access."}
              </p>
              {cardStatus?.exp_month && cardStatus?.exp_year && (
                <p className="text-white/40 text-sm mt-2">Expires {cardStatus.exp_month}/{cardStatus.exp_year}</p>
              )}
            </div>

            {currentTier === "starter" ? (
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={() => upgradeTo("pro")} className="rounded-2xl bg-blue-600 hover:bg-blue-500 px-5 py-4 font-black">
                  Add Card for Pro
                </button>
                <button onClick={() => upgradeTo("elite")} className="rounded-2xl bg-purple-600 hover:bg-purple-500 px-5 py-4 font-black">
                  Add Card for Elite
                </button>
              </div>
            ) : (
              canManageCard && (
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={onUpdateCard}
                    disabled={!!busy || showCardForm}
                    className="rounded-2xl bg-blue-600 hover:bg-blue-500 px-5 py-4 font-black disabled:opacity-50"
                  >
                    {showCardForm ? "Card Form Open" : hasCard ? "Update Card" : "Add Card"}
                  </button>
                  {hasCard && (
                    <button
                      onClick={onRemoveCard}
                      disabled={busy === "remove"}
                      className="rounded-2xl bg-red-900/70 hover:bg-red-800/70 border border-red-700/60 px-5 py-4 font-black text-red-100 disabled:opacity-50"
                    >
                      {busy === "remove" ? "Removing..." : "Remove Card"}
                    </button>
                  )}
                </div>
              )
            )}
          </Panel>

          <Panel title="Subscription" icon="📄">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <InfoRow label="Plan" value={meta.label} />
              <InfoRow label="Status" value={String(subscriptionStatus).replace("_", " ")} />
              {subscription?.amount && (
                <InfoRow
                  label="Price"
                  value={`${(subscription.currency || "usd").toUpperCase()} $${(subscription.amount / 100).toFixed(2)} / ${subscription.interval || "month"}`}
                />
              )}
            </div>
            {canCancel && (
              <button
                onClick={onCancelSubscription}
                disabled={busy === "cancel"}
                className="mt-5 w-full rounded-2xl bg-red-900/70 hover:bg-red-800/70 border border-red-700/60 px-5 py-4 font-black text-red-100 disabled:opacity-50"
              >
                {busy === "cancel" ? "Canceling..." : "Cancel Subscription"}
              </button>
            )}
          </Panel>
        </section>
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
          <button onClick={() => navigate("/dashboard")} className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 px-5 py-4 font-black">
            Go to Member Dashboard
          </button>
          <button onClick={() => navigate("/activation", { state: { tier: currentTier } })} className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-5 py-4 font-black">
            Continue Activation
          </button>
        </div>
      </section>
    </div>
  );
}

function Panel({ title, icon, children }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-black">{title}</h2>
        <span className="text-3xl">{icon}</span>
      </div>
      {children}
    </section>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-white/40">{label}</span>
      <span className="font-bold text-white capitalize text-right">{value}</span>
    </div>
  );
}

function Step({ done, number, title, text }) {
  return (
    <div className={`rounded-2xl border p-5 ${done ? "border-emerald-500/40 bg-emerald-500/10" : "border-white/10 bg-black/30"}`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black ${done ? "bg-emerald-400 text-black" : "bg-white/10 text-white/50"}`}>
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