/*
=============================================================
File: src/pages/SignupForm.jsx
Purpose: Dynamic tier-specific instructions, gamified UX,
         NO wallet connect until AFTER payment.
=============================================================
*/

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

// Art
import StarterNFT from "../assets/images/nfts/nft-starter.png";
import ProNFT     from "../assets/images/nfts/nft-pro.png";
import EliteNFT   from "../assets/images/nfts/nft-elite.png";
import StockNFT   from "../assets/images/nfts/nft-stock.png";
import BundleNFT  from "../assets/images/nfts/nft-bundle.png";

// API base (CRA + Vite + hard defaults to your live IPs)
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  process.env.REACT_APP_API_BASE ||
  "http://129.213.30.1:8002";

// Pricing (USD / month). Discount handled post-purchase during activation.
const TIERS = {
  starter: { img: StarterNFT, label: "Free (CEX + Stocks)", base: 0,   xp: 50,  color: "from-sky-500 to-sky-700" },
  pro:     { img: ProNFT,     label: "Stocks (Pro)",        base: 19,  xp: 150, color: "from-fuchsia-500 to-fuchsia-700" },
  elite:   { img: EliteNFT,   label: "CEX + Stocks (Pro+)", base: 49,  xp: 300, color: "from-amber-500 to-amber-700" },
  stock:   { img: StockNFT,   label: "DEX + Crypto Pro",    base: 99,  xp: 450, color: "from-yellow-500 to-yellow-700" },
  bundle:  { img: BundleNFT,  label: "Bundle (All Bots)",   base: 199, xp: 650, color: "from-zinc-500 to-zinc-700" },
};

// Strategy catalog
const STRATEGIES = [
  { value: "momentum", label: "Momentum" },
  { value: "mean_reversion", label: "Mean Reversion" },
  { value: "ai_weighted", label: "AI Weighted" },
  { value: "volume_spike", label: "Volume Spike" },
];

// Tier-specific quick setup instructions
const INSTRUCTIONS = {
  starter: [
    "Create your account with email.",
    "Complete onboarding after signup (connect wallet, pick strategy).",
    "Open the OKX funding guide—send a small test first (ERC20).",
  ],
  pro: [
    "Create your account with email and choose a strategy.",
    "Checkout on Stripe.",
    "After payment you'll land on Activation: connect wallet (Polygon), verify ownership, and enable bot access.",
    "Fund OKX with USDT/USDC (ERC20) using our 5-minute guide.",
  ],
  elite: [
    "Create account + choose strategy.",
    "Checkout on Stripe.",
    "After payment: Activation flow (connect wallet on Polygon, verify, enable premium dashboards).",
    "Follow OKX funding guide; enable advanced analytics in dashboard.",
  ],
  stock: [
    "Create your account + choose strategy.",
    "Checkout on Stripe.",
    "After payment you'll see Stock Setup:",
    "1) Choose broker: Paper (sim) or a supported live broker with API keys.",
    "2) Paste API Key + Secret (read/trade scope). Keys are stored server-side securely.",
    "3) Select default symbols (e.g., SPY, QQQ, AAPL) and risk per trade.",
    "4) Confirm timezone & trading session window.",
  ],
  bundle: [
    "Create your account + choose your starting strategy.",
    "Checkout on Stripe.",
    "After payment, Activation lets you connect wallet, enable crypto bot, and open Stock Setup to connect your broker (or paper).",
    "Access ALL features and switch between crypto/stock dashboards anytime.",
  ],
};

// Extra helper panel for Stock tier
const STOCK_GUIDE = [
  {
    title: "Pick a Broker or Paper",
    points: [
      "Paper Trading (recommended to start) – no real money at risk.",
      "Live Broker – use an account that supports API keys (you'll paste Key + Secret).",
    ],
  },
  {
    title: "Connect Safely",
    points: [
      "You'll enter your API Key & Secret only after checkout on our secure Activation page.",
      "You can disconnect or rotate keys anytime from Settings.",
    ],
  },
  {
    title: "Basic Defaults",
    points: [
      "Symbols: SPY, QQQ, AAPL (edit anytime).",
      "Risk: e.g., 1% of account per trade (you control this).",
      "Trading window: regular market hours by default.",
    ],
  },
];

/** -----------------------------------------------------------
 * Tiny confetti (no deps). Fires a handful of emoji.
 * ----------------------------------------------------------*/
function fireConfetti(container) {
  if (!container) return;
  const EMOJI = ["🎉", "✨", "🏆", "💎", "🚀"];
  const pieces = 24;
  for (let i = 0; i < pieces; i++) {
    const span = document.createElement("span");
    span.textContent = EMOJI[Math.floor(Math.random() * EMOJI.length)];
    span.style.position = "fixed";
    span.style.left = Math.random() * 100 + "vw";
    span.style.top = "-2vh";
    span.style.fontSize = (16 + Math.random() * 18) + "px";
    span.style.pointerEvents = "none";
    span.style.transition = "transform 1.2s ease-out, opacity 1.2s ease-out";
    container.appendChild(span);
    requestAnimationFrame(() => {
      span.style.transform = `translateY(${100 + Math.random() * 90}vh) rotate(${(Math.random()*360)|0}deg)`;
      span.style.opacity = "0";
    });
    setTimeout(() => span.remove(), 1400);
  }
}

/** -----------------------------------------------------------
 * Streak helpers
 * ----------------------------------------------------------*/
function bumpDailyStreak() {
  const today = new Date().toDateString();
  const last = localStorage.getItem("IMALI_STREAK_LAST") || "";
  let streak = Number(localStorage.getItem("IMALI_STREAK") || "0");
  if (last !== today) {
    streak = (last && new Date(last).getTime() === new Date(new Date().setDate(new Date().getDate()-1)).setHours(0,0,0,0))
      ? streak + 1
      : 1;
    localStorage.setItem("IMALI_STREAK", String(streak));
    localStorage.setItem("IMALI_STREAK_LAST", today);
  }
  return streak || 1;
}

export default function SignupForm() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // form state
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState("starter");
  const [strategy, setStrategy] = useState("momentum");
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // gamification state
  const [streak, setStreak] = useState(1);
  const [quests, setQuests] = useState({
    account: false,
    strategy: false,
    checkout: false,
    activation: false,
  });
  const confettiRootRef = useRef(null);

  // deep-link tier (Pricing → Signup) and set streak
  useEffect(() => {
    const qTier = (params.get("tier") || "").toLowerCase();
    if (qTier && TIERS[qTier]) setTier(qTier);
    setStreak(bumpDailyStreak());
  }, [params]);

  // Quest progress auto-updates from form state
  useEffect(() => {
    setQuests((q) => ({
      account: !!email,
      strategy: !!strategy,
      checkout: tier === "starter" ? false : q.checkout, // will complete on submit for paid tiers
      activation: false, // completed after returning from Stripe → Activation page
    }));
  }, [email, strategy, tier]);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);
  const priceFor = (t) => TIERS[t]?.base ?? 0;

  const progressPct = useMemo(() => {
    const items = [
      quests.account,
      quests.strategy,
      tier === "starter" ? true : quests.checkout, // starter skips checkout
    ];
    const done = items.filter(Boolean).length;
    return Math.round((done / items.length) * 100);
  }, [quests, tier]);

  const badgeStyle = useMemo(() => {
    const g = TIERS[tier]?.color || "from-gray-600 to-gray-800";
    return `bg-gradient-to-r ${g} text-white`;
  }, [tier]);

  const activeTier = TIERS[tier] || TIERS.starter;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErr("");

    try {
      if (!emailValid) throw new Error("Enter a valid email.");

      const payload = { email, tier, strategy, source: "signup" };

      // Free tier → straight to onboarding (post-pay activation flow but without pay)
      if (tier === "starter") {
        try {
          await axios.post(`${API_BASE}/signup`, payload, { withCredentials: true });
        } catch (_) {}
        localStorage.setItem("IMALI_MEMBER", "1");
        localStorage.setItem("IMALI_EMAIL", email);
        fireConfetti(confettiRootRef.current); // gamified reward
        setTimeout(() => navigate("/onboarding", { replace: true }), 500);
        return;
      }

      // optional tips/promos
      if (marketingOptIn) {
        try {
          await axios.post(
            `${API_BASE}/newsletter-optin`,
            { email, source: "signup", tier, strategy },
            { withCredentials: true }
          );
        } catch (_) {}
      }

      const price_cents = Math.round(Number(priceFor(tier)) * 100);
      const { data } = await axios.post(
        `${API_BASE}/create-stripe-checkout`,
        {
          ...payload,
          price_cents,
          success_path: "/activation",
          cancel_path: `/signup?tier=${tier}&canceled=1`,
        },
        { withCredentials: true }
      );

      // mark checkout quest complete (optimistic UI)
      setQuests((q) => ({ ...q, checkout: true }));
      localStorage.setItem("IMALI_PENDING", "1");
      localStorage.setItem("IMALI_EMAIL", email);
      window.location.href = data.checkout_url;
    } catch (e) {
      setErr(e?.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={confettiRootRef} className="relative min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white">
      {/* Top streak + XP */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <span className="opacity-70 mr-2">Daily streak:</span>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
              🔥 {streak} day{streak > 1 ? "s" : ""}
            </span>
          </div>
          <div className="text-sm">
            <span className="opacity-70 mr-2">Tier XP on activation:</span>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
              ⭐ +{activeTier.xp} XP
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 via-yellow-300 to-pink-300 bg-clip-text text-transparent">
            Create Your Account
          </h1>
          <p className="mt-2 text-gray-300">
            Pay first. Activate after. No wallet required until activation.
          </p>
          <div className="mt-3 text-sm text-indigo-200">
            New to wallets or funding?{" "}
            <Link to="/how-to/fund-okx" className="text-emerald-300 underline">
              See the 5-minute OKX guide
            </Link>
          </div>
        </div>

        {/* Progress bar */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center justify-between text-xs text-gray-300 mb-2">
            <span>Progress</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-2 rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 transition-all`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-400">
            <span className={`px-2 py-1 rounded ${quests.account ? "bg-emerald-500/20 text-emerald-200" : "bg-white/5"}`}>
              1) Account
            </span>
            <span className={`px-2 py-1 rounded ${quests.strategy ? "bg-emerald-500/20 text-emerald-200" : "bg-white/5"}`}>
              2) Strategy
            </span>
            <span className={`px-2 py-1 rounded ${(tier === "starter" || quests.checkout) ? "bg-emerald-500/20 text-emerald-200" : "bg-white/5"}`}>
              3) {tier === "starter" ? "Skip" : "Checkout"}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left rail: Quests + Tier info */}
          <aside className="lg:col-span-2 space-y-4">
            {/* Quests card */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <h3 className="text-lg font-bold mb-3">Starter Quests</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span>{quests.account ? "✅" : "⬜️"}</span>
                  <span>Enter a valid email</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>{quests.strategy ? "✅" : "⬜️"}</span>
                  <span>Pick your first strategy</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>{tier === "starter" ? "⏭️" : quests.checkout ? "✅" : "⬜️"}</span>
                  <span>{tier === "starter" ? "Starter skips checkout" : "Checkout on Stripe"}</span>
                </li>
              </ul>
              <div className="mt-3 text-xs text-amber-200/90">
                Holder discounts apply during activation after wallet connect.
              </div>
            </div>

            {/* Tier preview */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold mb-1">{activeTier.label} Tier</h3>
                  <div className="text-sm text-gray-300">
                    {activeTier.base ? `$${activeTier.base}/mo` : "Free"}
                  </div>
                </div>
                <img src={activeTier.img} alt="Tier NFT" className="w-14 h-14 rounded-lg ring-1 ring-white/10" />
              </div>

              <div className="mt-3">
                <div className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${badgeStyle}`}>
                  🎖️ Badge unlocked at activation • +{activeTier.xp} XP
                </div>
              </div>

              <ul className="mt-4 text-sm text-emerald-100/90 space-y-1">
                {(INSTRUCTIONS[tier] || []).map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
              </ul>
            </div>

            {/* Stock extra help */}
            {tier === "stock" && (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                <h3 className="text-lg font-bold mb-2">Stock Tier – After Checkout</h3>
                <div className="space-y-4">
                  {STOCK_GUIDE.map((b, i) => (
                    <div key={i}>
                      <div className="font-semibold">{b.title}</div>
                      <ul className="text-sm text-gray-200 list-disc ml-5 mt-1 space-y-1">
                        {b.points.map((p, j) => (
                          <li key={j}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Safety / Guides */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <h3 className="text-lg font-bold mb-1">Safety</h3>
              <ul className="text-sm text-gray-200 list-disc ml-5 space-y-1">
                <li>Crypto: Use ERC20 on OKX for USDT/USDC. Send a $5 test first.</li>
                <li>Stocks: Keep API keys private. You can revoke keys anytime.</li>
                <li>
                  Only use official contracts:{" "}
                  <Link to="/supported-chains" className="underline text-indigo-300">Supported Chains</Link>
                </li>
              </ul>
              <div className="mt-3 space-y-1">
                <Link to="/how-to/fund-okx" className="block text-emerald-300 underline text-sm">Open 5-min OKX Funding Guide →</Link>
                <Link to="/how-to/wallet-metamask" className="block text-emerald-300 underline text-sm">MetaMask: install + fund →</Link>
              </div>
            </div>
          </aside>

          {/* Right: form */}
          <section className="lg:col-span-3">
            <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative">
              {/* Gradient stripe */}
              <div className={`h-1 w-full bg-gradient-to-r ${badgeStyle}`} />

              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold truncate">Create Access</h2>
                  <p className="text-xs text-gray-400 truncate">No wallet required now. You'll connect during activation.</p>
                </div>
                <div className="hidden md:flex items-center gap-3">
                  <div className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${badgeStyle}`}>
                    {activeTier.label} Tier
                  </div>
                  <img src={activeTier.img} alt="Tier NFT" className="w-12 h-12 rounded-lg ring-1 ring-white/10" />
                </div>
              </div>

              {err && (
                <div className="mx-5 mt-4 rounded bg-red-500/10 border border-red-500/30 text-red-200 p-3 text-sm">
                  {err}
                </div>
              )}

              <form onSubmit={handleSubmit} className="p-5 grid gap-4">
                <label className="block">
                  <span className="block text-sm mb-1">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 focus:border-emerald-400 outline-none p-3 rounded-xl"
                    placeholder="you@example.com"
                    required
                  />
                </label>

                <label className="block">
                  <span className="block text-sm mb-1">Strategy</span>
                  <select
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 focus:border-emerald-400 outline-none p-3 rounded-xl"
                  >
                    {STRATEGIES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">You can change this anytime after activation.</p>
                </label>

                <label className="block">
                  <span className="block text-sm mb-1">Tier</span>
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 focus:border-emerald-400 outline-none p-3 rounded-xl"
                  >
                    <option value="starter">Starter – Free</option>
                    <option value="pro">Pro – ${priceFor("pro").toFixed(2)}</option>
                    <option value="elite">Elite – ${priceFor("elite").toFixed(2)}</option>
                    <option value="stock">Stocks – ${priceFor("stock").toFixed(2)}</option>
                    <option value="bundle">Bundle All – ${priceFor("bundle").toFixed(2)}</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Holder discounts for Pro/Elite are applied during activation after wallet connect.
                  </p>
                </label>

                <label className="flex items-start gap-3 text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={marketingOptIn}
                    onChange={(e) => setMarketingOptIn(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30"
                  />
                  <span>Send setup tips & promos (unsubscribe anytime)</span>
                </label>

                <button
                  type="submit"
                  disabled={!email || !emailValid || loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 disabled:opacity-60 py-3 font-bold"
                >
                  {loading
                    ? "Processing…"
                    : tier === "starter"
                    ? "Finish & Go to Onboarding"
                    : `Continue to Stripe ($${priceFor(tier).toFixed(2)}/mo)`}
                </button>

                {/* Mini “gamified” footnotes */}
                <div className="grid md:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                    <div className="font-semibold mb-1">🎯 Goal</div>
                    <div className="text-gray-300">Activate to unlock +{activeTier.xp} XP and your {activeTier.label} badge.</div>
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                    <div className="font-semibold mb-1">🏁 Next</div>
                    <div className="text-gray-300">
                      {tier === "starter" ? "Complete Onboarding" : "Stripe Checkout"} → Activation
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                    <div className="font-semibold mb-1">📚 Guides</div>
                    <div className="text-gray-300">
                      <Link to="/FundingGuide" className="underline text-emerald-300">OKX Funding</Link> ·{" "}
                      <Link to="/supported-chains" className="underline text-indigo-300">Chains</Link> ·{" "}
                      <Link to="/FundingGuide" className="underline text-indigo-300">MetaMask</Link>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Social proof / small gamified tip */}
            <div className="mt-6 text-xs text-gray-400">
              Tip: log in tomorrow to extend your 🔥 streak and earn bonus XP during activation.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}