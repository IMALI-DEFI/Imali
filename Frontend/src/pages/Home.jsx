// src/pages/Home.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

// Background card images
import tradeLoss from "../assets/images/cards/trade_loss_template2.PNG";
import tradeWin from "../assets/images/cards/trade_win_template2.PNG";

/* ============================================================
   API BASE
============================================================ */
const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8080"
    : "https://api.imali-defi.com");

/* ============================================================
   HOOKS
============================================================ */
function useCountUp(to, duration = 2000) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let start;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(progress * to));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [to, duration]);

  return val;
}

function usePromoStatus() {
  const [state, setState] = useState({
    limit: 50,
    claimed: 0,
    spotsLeft: 50,
    active: true,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/promo/status`, {
          timeout: 6000,
        });

        const limit = Number(res.data?.limit ?? 50);
        const claimed = Number(res.data?.claimed ?? 0);

        if (!mounted) return;

        setState({
          limit,
          claimed,
          spotsLeft: Math.max(0, limit - claimed),
          active: claimed < limit,
          loading: false,
          error: null,
        });

        localStorage.setItem(
          "imali_promo_cache",
          JSON.stringify({ limit, claimed, ts: Date.now() })
        );
      } catch {
        const cached = JSON.parse(
          localStorage.getItem("imali_promo_cache") || "{}"
        );

        if (cached.limit != null && mounted) {
          setState({
            limit: cached.limit,
            claimed: cached.claimed,
            spotsLeft: Math.max(0, cached.limit - cached.claimed),
            active: cached.claimed < cached.limit,
            loading: false,
            error: "Using cached data",
          });
        } else if (mounted) {
          setState((s) => ({ ...s, loading: false, error: "Promo unavailable" }));
        }
      }
    };

    load();
    const id = setInterval(load, 60000); // 60s — no need to hammer
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return state;
}

function usePromoClaim() {
  const [state, setState] = useState({
    loading: false,
    success: false,
    error: null,
    data: null,
  });

  const claim = async (email) => {
    if (!email) return false;
    setState({ loading: true, success: false, error: null, data: null });

    try {
      const res = await axios.post(
        `${API_BASE}/api/promo/claim`,
        { email, tier: "starter" },
        { timeout: 8000 }
      );
      setState({ loading: false, success: true, error: null, data: res.data });
      return true;
    } catch (err) {
      setState({
        loading: false,
        success: false,
        error: err?.response?.data?.message || "Spot already taken or promo full",
        data: null,
      });
      return false;
    }
  };

  const reset = () =>
    setState({ loading: false, success: false, error: null, data: null });

  return { state, claim, reset };
}

/* ============================================================
   SMALL COMPONENTS
============================================================ */

const Pill = ({ children, color = "indigo" }) => (
  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold bg-${color}-500/20 text-${color}-300 border border-${color}-500/30`}>
    {children}
  </span>
);

const GlowCard = ({ children, className = "" }) => (
  <div className={`relative group ${className}`}>
    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500" />
    <div className="relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
      {children}
    </div>
  </div>
);

const StepCard = ({ number, emoji, title, description }) => (
  <div className="flex gap-4 items-start">
    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-lg font-bold shadow-lg shadow-indigo-500/20">
      {number}
    </div>
    <div>
      <h3 className="font-bold text-lg">
        {emoji} {title}
      </h3>
      <p className="text-white/60 text-sm mt-1">{description}</p>
    </div>
  </div>
);

const FeatureRow = ({ icon, label }) => (
  <div className="flex items-center gap-2 text-sm text-white/80">
    <span className="text-emerald-400">{icon}</span>
    <span>{label}</span>
  </div>
);

/* ============================================================
   LIVE TICKER (fake social proof)
============================================================ */
const TICKER_MESSAGES = [
  "🟢 Alex from NY just earned +\$47.20 on BTC",
  "🟢 Sarah started her first bot today!",
  "🟢 James hit Gold trader level 🥇",
  "🟢 Maria earned +\$124.50 on AAPL",
  "🟢 New user from London joined 🇬🇧",
  "🟢 Kevin's bot made 12 winning trades today",
  "🟢 Lisa upgraded to Pro tier ⚡",
  "🟢 Ahmed earned +\$89.30 on ETH",
  "🟢 Bot confidence hit 92% today 🤖",
  "🟢 Emma claimed a promo spot!",
];

const LiveTicker = () => {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % TICKER_MESSAGES.length);
        setVisible(true);
      }, 400);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 inline-flex items-center gap-2 text-sm">
      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
      <span
        className={`transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        {TICKER_MESSAGES[index]}
      </span>
    </div>
  );
};

/* ============================================================
   PROMO PROGRESS BAR
============================================================ */
const PromoMeter = ({ claimed, limit, spotsLeft, loading }) => {
  const pct = limit > 0 ? (claimed / limit) * 100 : 0;
  const urgency = spotsLeft <= 10 ? "text-red-400" : spotsLeft <= 25 ? "text-yellow-400" : "text-emerald-400";

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-white/60">
          {loading ? "Loading..." : `${claimed} of ${limit} spots claimed`}
        </span>
        <span className={`font-bold ${urgency}`}>
          {loading ? "…" : `${spotsLeft} left!`}
        </span>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            spotsLeft <= 10
              ? "bg-gradient-to-r from-red-500 to-orange-500"
              : "bg-gradient-to-r from-emerald-500 to-cyan-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {spotsLeft <= 10 && spotsLeft > 0 && (
        <p className="text-xs text-red-400 animate-pulse font-medium">
          ⚡ Almost full — grab your spot before it's gone!
        </p>
      )}
    </div>
  );
};

/* ============================================================
   HOME PAGE
============================================================ */
function Home() {
  const nav = useNavigate();

  const profits = useCountUp(3281907);
  const traders = useCountUp(24189);
  const winRate = useCountUp(78);

  const promo = usePromoStatus();
  const { state: claimState, claim, reset } = usePromoClaim();

  const [email, setEmail] = useState("");
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white">

      {/* ════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Background card images */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <img
            src={tradeLoss}
            alt=""
            className="absolute left-1/2 top-16 w-[80vw] max-w-[700px] -translate-x-1/2 -rotate-2"
          />
          <img
            src={tradeWin}
            alt=""
            className="absolute left-1/2 top-[40%] w-[80vw] max-w-[700px] -translate-x-1/2 rotate-2"
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 pt-24 pb-16 text-center">
          {/* Live ticker */}
          <div className="mb-8">
            <LiveTicker />
          </div>

          {/* Main headline */}
          <h1 className="font-extrabold leading-tight">
            <span className="block text-3xl sm:text-4xl md:text-5xl text-white/90">
              Your Money-Making Robot 🤖
            </span>
            <span className="block text-4xl sm:text-5xl md:text-7xl bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent mt-2">
              Is Ready to Trade
            </span>
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-white/70 leading-relaxed">
            Our AI bot buys and sells <b>stocks & crypto</b> for you — automatically.
            You don't need to know anything about trading.{" "}
            <span className="text-emerald-400 font-medium">
              Just press start and watch it work.
            </span>
          </p>

          {/* Quick trust badges */}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Pill color="emerald">✅ No experience needed</Pill>
            <Pill color="indigo">🤖 Fully automated</Pill>
            <Pill color="purple">💰 Only pay when you profit</Pill>
          </div>

          {/* Big CTA buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="group relative px-10 py-5 rounded-full font-bold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-105"
            >
              🚀 Start For Free
              <span className="block text-xs font-normal opacity-70 mt-0.5">
                No credit card needed to sign up
              </span>
            </Link>
            <Link
              to="/demo"
              className="px-10 py-5 rounded-full font-bold text-lg border-2 border-white/20 hover:border-white/40 hover:bg-white/5 transition-all"
            >
              🎮 Try the Demo First
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          LIVE STATS
      ════════════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-4 -mt-4 mb-12">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <div className="text-3xl sm:text-4xl font-bold font-mono text-emerald-400">
              ${profits.toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm text-white/50 mt-1">
              Total Profits Earned
            </div>
            <div className="text-xs text-emerald-400/60 mt-1">📈 and growing</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <div className="text-3xl sm:text-4xl font-bold font-mono text-indigo-400">
              {traders.toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm text-white/50 mt-1">
              Happy Traders
            </div>
            <div className="text-xs text-indigo-400/60 mt-1">👥 join them today</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <div className="text-3xl sm:text-4xl font-bold font-mono text-purple-400">
              {winRate}%
            </div>
            <div className="text-xs sm:text-sm text-white/50 mt-1">
              Average Win Rate
            </div>
            <div className="text-xs text-purple-400/60 mt-1">🎯 that's really good</div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          HOW IT WORKS (3 steps)
      ════════════════════════════════════════════════ */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">
            How Does It Work? 🤔
          </h2>
          <p className="text-white/60 mt-3 max-w-xl mx-auto">
            It's as easy as 1-2-3. Seriously — even if you've never traded before.
          </p>
        </div>

        <div className="space-y-8">
          <StepCard
            number="1"
            emoji="📝"
            title="Sign Up (takes 2 minutes)"
            description="Create your free account and pick a plan. No trading knowledge required — we handle everything."
          />
          <div className="ml-6 border-l-2 border-white/10 h-6" />
          <StepCard
            number="2"
            emoji="🔗"
            title="Connect Your Accounts"
            description="Link your OKX (crypto) or Alpaca (stocks) account. We'll walk you through every step with a simple guide."
          />
          <div className="ml-6 border-l-2 border-white/10 h-6" />
          <StepCard
            number="3"
            emoji="🚀"
            title="Press Start & Relax"
            description="Hit the big green button and our AI bot starts trading for you 24/7. Watch your profits grow on your dashboard!"
          />
        </div>

        <div className="text-center mt-10">
          <Link
            to="/signup"
            className="inline-block px-8 py-4 rounded-full font-bold bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
          >
            Let's Go! Create My Account →
          </Link>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          PROMO SECTION
      ════════════════════════════════════════════════ */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <GlowCard>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🎁</span>
            <div>
              <h3 className="text-xl font-bold">Early Bird Special</h3>
              <p className="text-sm text-white/60">
                First {promo.limit} users get a <b className="text-emerald-400">special deal</b>
              </p>
            </div>
          </div>

          {/* What you get */}
          <div className="bg-black/30 rounded-xl p-4 mb-4 space-y-2">
            <FeatureRow icon="✅" label="Only 5% fee on profits over 3% (normally 30%)" />
            <FeatureRow icon="✅" label="Locked in for 90 days" />
            <FeatureRow icon="✅" label="Full access to all bot features" />
            <FeatureRow icon="✅" label="Cancel anytime — no risk" />
          </div>

          {/* Progress meter */}
          <PromoMeter
            claimed={promo.claimed}
            limit={promo.limit}
            spotsLeft={promo.spotsLeft}
            loading={promo.loading}
          />

          {promo.error && (
            <p className="text-xs text-yellow-400 mt-2">⚠ {promo.error}</p>
          )}

          {/* Claim form */}
          {!showForm && !claimState.success && promo.active && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
            >
              🎉 Claim My Spot Now
            </button>
          )}

          {showForm && !claimState.success && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await claim(email);
                if (ok) setShowForm(false);
              }}
              className="mt-4 space-y-3"
            >
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full rounded-xl bg-black/40 border border-emerald-500/50 px-4 py-4 text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none transition-colors"
                  required
                  autoFocus
                />
              </div>

              {claimState.error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  ⚠️ {claimState.error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={claimState.loading}
                  className="flex-1 py-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all"
                >
                  {claimState.loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Claiming...
                    </span>
                  ) : (
                    "✅ Confirm My Spot"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    reset();
                  }}
                  className="px-6 text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  Cancel
                </button>
              </div>

              <p className="text-xs text-white/30 text-center">
                🔒 We'll never spam you. Unsubscribe anytime.
              </p>
            </form>
          )}

          {claimState.success && (
            <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-emerald-300 font-bold text-lg">You're in!</p>
              <p className="text-sm text-white/60 mt-1">
                Check your email, then{" "}
                <Link to="/signup" className="text-emerald-400 underline">
                  create your account
                </Link>{" "}
                to get started.
              </p>
            </div>
          )}

          {!promo.active && !claimState.success && (
            <div className="mt-4 text-center py-4">
              <p className="text-white/50">
                😅 Promo is full! But you can still{" "}
                <Link to="/signup" className="text-indigo-400 underline">
                  sign up at regular pricing
                </Link>
              </p>
            </div>
          )}
        </GlowCard>
      </section>

      {/* ════════════════════════════════════════════════
          WHAT YOU GET
      ════════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">
            What's Inside Your Dashboard ✨
          </h2>
          <p className="text-white/60 mt-3">
            Everything you need — all in one place
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <GlowCard>
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="font-bold text-lg">AI Trading Bot</h3>
            <p className="text-sm text-white/60 mt-2">
              Our smart bot watches the market 24/7 and makes trades for you.
              It learns and gets better over time!
            </p>
            <div className="mt-3">
              <Pill color="emerald">All Plans</Pill>
            </div>
          </GlowCard>

          <GlowCard>
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-bold text-lg">Live Charts & Stats</h3>
            <p className="text-sm text-white/60 mt-2">
              See your profits, win rate, and trade history in colorful
              easy-to-read charts. Watch your money grow!
            </p>
            <div className="mt-3">
              <Pill color="emerald">All Plans</Pill>
            </div>
          </GlowCard>

          <GlowCard>
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="font-bold text-lg">Trader Levels</h3>
            <p className="text-sm text-white/60 mt-2">
              Earn XP with every trade! Level up from Bronze to Legend.
              Compete and show off your rank.
            </p>
            <div className="mt-3">
              <Pill color="emerald">All Plans</Pill>
            </div>
          </GlowCard>

          <GlowCard>
            <div className="text-3xl mb-3">📈</div>
            <h3 className="font-bold text-lg">Stock Trading</h3>
            <p className="text-sm text-white/60 mt-2">
              Trade real stocks like Apple, Tesla, and Amazon through
              Alpaca. The bot picks the best ones!
            </p>
            <div className="mt-3">
              <Pill color="indigo">Starter+</Pill>
            </div>
          </GlowCard>

          <GlowCard>
            <div className="text-3xl mb-3">🦄</div>
            <h3 className="font-bold text-lg">DEX Trading</h3>
            <p className="text-sm text-white/60 mt-2">
              Trade on decentralized exchanges for even more crypto
              opportunities. Advanced but powerful!
            </p>
            <div className="mt-3">
              <Pill color="purple">Elite+</Pill>
            </div>
          </GlowCard>

          <GlowCard>
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-bold text-lg">Futures & Leverage</h3>
            <p className="text-sm text-white/60 mt-2">
              Multiply your gains with futures trading. The bot manages
              risk automatically so you don't have to.
            </p>
            <div className="mt-3">
              <Pill color="purple">Elite+</Pill>
            </div>
          </GlowCard>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          TRY THE DEMO
      ════════════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold">Not Sure Yet? Try It Free! 🎮</h2>
          <p className="text-white/60 mt-2">
            Play with our demo — no signup, no risk, just fun
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-indigo-600/20 to-indigo-900/20 border border-indigo-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🔷</span>
              <div>
                <div className="text-xs uppercase tracking-wide text-indigo-300">
                  Crypto Bot
                </div>
                <h3 className="text-xl font-bold">Try Crypto Trading</h3>
              </div>
            </div>
            <p className="text-sm text-white/60 mb-4">
              Watch the bot trade Bitcoin, Ethereum, and more.
              See how it finds the best moments to buy and sell.
            </p>
            <div className="flex gap-3">
              <Link
                to="/demo"
                className="flex-1 text-center py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold transition-all hover:scale-[1.02]"
              >
                🎮 Play Crypto Demo
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-900/20 border border-emerald-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📈</span>
              <div>
                <div className="text-xs uppercase tracking-wide text-emerald-300">
                  Stock Bot
                </div>
                <h3 className="text-xl font-bold">Try Stock Trading</h3>
              </div>
            </div>
            <p className="text-sm text-white/60 mb-4">
              See how the bot picks winning stocks like Apple and Tesla.
              It's like having a Wall Street pro working for you!
            </p>
            <div className="flex gap-3">
              <Link
                to="/demo?venue=stocks"
                className="flex-1 text-center py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold transition-all hover:scale-[1.02]"
              >
                🎮 Play Stock Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          TRUST / FAQ
      ════════════════════════════════════════════════ */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">Common Questions 💬</h2>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "Do I need to know how to trade?",
              a: "Nope! The bot does everything. You just press Start and it handles buying, selling, and risk management automatically.",
            },
            {
              q: "How much money do I need to start?",
              a: "You can start with as little as \$50 in your exchange account. The bot works with whatever amount you have.",
            },
            {
              q: "When do I get charged?",
              a: "Only when you make money! We take a small percentage of your profits. If the bot doesn't make money, you don't pay anything.",
            },
            {
              q: "Can I stop anytime?",
              a: "Yes! You can pause or stop the bot with one click. There are no contracts or lock-in periods.",
            },
            {
              q: "Is my money safe?",
              a: "Your money stays in YOUR exchange account (OKX or Alpaca). We never hold your funds. The bot only has permission to trade — never withdraw.",
            },
          ].map((item, i) => (
            <details
              key={i}
              className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden"
            >
              <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors">
                <span className="font-medium">{item.q}</span>
                <span className="text-white/40 group-open:rotate-45 transition-transform text-xl">
                  +
                </span>
              </summary>
              <div className="px-5 pb-5 text-white/60 text-sm">{item.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════════════ */}
      <section className="text-center py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Let Your Bot Make Money?
          </h2>
          <p className="text-white/60 mb-8 text-lg">
            Join thousands of people who are already earning while they sleep.
            No experience needed. Start in 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="px-12 py-5 rounded-full font-bold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-500/25 transition-all hover:scale-105"
            >
              🚀 Create Free Account
            </Link>
            <Link
              to="/dashboard"
              className="px-12 py-5 rounded-full font-bold text-lg border-2 border-white/20 hover:border-white/40 hover:bg-white/5 transition-all"
            >
              📊 Go to Dashboard
            </Link>
          </div>
          <p className="text-xs text-white/30 mt-6">
            No credit card required • Cancel anytime • Your money stays in your account
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          FOOTER LINKS
      ════════════════════════════════════════════════ */}
      <section className="border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-6 text-sm text-white/40">
          <Link to="/how-it-works" className="hover:text-white transition-colors">
            How It Works
          </Link>
          <Link to="/pricing" className="hover:text-white transition-colors">
            Pricing
          </Link>
          <Link to="/funding-guide" className="hover:text-white transition-colors">
            Funding Guide
          </Link>
          <Link to="/support" className="hover:text-white transition-colors">
            Support
          </Link>
          <Link to="/privacy" className="hover:text-white transition-colors">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-white transition-colors">
            Terms
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Home;
