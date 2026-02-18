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
var API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8080"
    : "https://api.imali-defi.com");

/* ============================================================
   HOOKS
============================================================ */
function useCountUp(to, duration) {
  if (duration === undefined) duration = 2000;
  var stateVal = useState(0);
  var val = stateVal[0];
  var setVal = stateVal[1];

  useEffect(
    function () {
      var start;
      var step = function (ts) {
        if (!start) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        setVal(Math.floor(progress * to));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    [to, duration]
  );

  return val;
}

function usePromoStatus() {
  var stateData = useState({
    limit: 50,
    claimed: 0,
    spotsLeft: 50,
    active: true,
    loading: true,
    error: null,
  });
  var state = stateData[0];
  var setState = stateData[1];

  useEffect(function () {
    var mounted = true;

    var load = function () {
      axios
        .get(API_BASE + "/api/promo/status", { timeout: 6000 })
        .then(function (res) {
          var limit = Number((res.data && res.data.limit) || 50);
          var claimed = Number((res.data && res.data.claimed) || 0);

          if (!mounted) return;

          setState({
            limit: limit,
            claimed: claimed,
            spotsLeft: Math.max(0, limit - claimed),
            active: claimed < limit,
            loading: false,
            error: null,
          });

          localStorage.setItem(
            "imali_promo_cache",
            JSON.stringify({ limit: limit, claimed: claimed, ts: Date.now() })
          );
        })
        .catch(function () {
          var cached = JSON.parse(
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
            setState(function (s) {
              return Object.assign({}, s, {
                loading: false,
                error: "Promo unavailable",
              });
            });
          }
        });
    };

    load();
    var id = setInterval(load, 60000);
    return function () {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return state;
}

function usePromoClaim() {
  var stateData = useState({
    loading: false,
    success: false,
    error: null,
    data: null,
  });
  var state = stateData[0];
  var setState = stateData[1];

  var claim = function (email) {
    if (!email) return Promise.resolve(false);
    setState({ loading: true, success: false, error: null, data: null });

    return axios
      .post(
        API_BASE + "/api/promo/claim",
        { email: email, tier: "starter" },
        { timeout: 8000 }
      )
      .then(function (res) {
        setState({
          loading: false,
          success: true,
          error: null,
          data: res.data,
        });
        return true;
      })
      .catch(function (err) {
        var msg =
          (err && err.response && err.response.data && err.response.data.message) ||
          "Spot already taken or promo full";
        setState({ loading: false, success: false, error: msg, data: null });
        return false;
      });
  };

  var reset = function () {
    setState({ loading: false, success: false, error: null, data: null });
  };

  return { state: state, claim: claim, reset: reset };
}

/* ============================================================
   SMALL COMPONENTS
============================================================ */
function Pill(props) {
  var children = props.children;
  var color = props.color || "indigo";

  var cls =
    "inline-block px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold " +
    "bg-" + color + "-500/20 text-" + color + "-300 border border-" + color + "-500/30";

  return <span className={cls}>{children}</span>;
}

function GlowCard(props) {
  var children = props.children;
  var className = props.className || "";

  return (
    <div className={"relative group " + className}>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500" />
      <div className="relative bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 hover:border-white/20 transition-all">
        {children}
      </div>
    </div>
  );
}

function StepCard(props) {
  var number = props.number;
  var emoji = props.emoji;
  var title = props.title;
  var description = props.description;

  return (
    <div className="flex gap-3 sm:gap-4 items-start">
      <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-base sm:text-lg font-bold shadow-lg shadow-indigo-500/20">
        {number}
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-base sm:text-lg">
          {emoji} {title}
        </h3>
        <p className="text-white/60 text-sm mt-1 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

function FeatureRow(props) {
  var icon = props.icon;
  var label = props.label;

  return (
    <div className="flex items-start gap-2 text-sm text-white/80">
      <span className="text-emerald-400 flex-shrink-0 mt-0.5">{icon}</span>
      <span className="leading-snug">{label}</span>
    </div>
  );
}

/* ============================================================
   LIVE TICKER
============================================================ */
var TICKER_MESSAGES = [
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

function LiveTicker() {
  var stateIndex = useState(0);
  var index = stateIndex[0];
  var setIndex = stateIndex[1];

  var stateVisible = useState(true);
  var visible = stateVisible[0];
  var setVisible = stateVisible[1];

  useEffect(function () {
    var interval = setInterval(function () {
      setVisible(false);
      setTimeout(function () {
        setIndex(function (i) {
          return (i + 1) % TICKER_MESSAGES.length;
        });
        setVisible(true);
      }, 400);
    }, 4000);

    return function () {
      clearInterval(interval);
    };
  }, []);

  var visClass = visible ? "opacity-100" : "opacity-0";

  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 sm:px-4 py-2 inline-flex items-center gap-2 text-xs sm:text-sm max-w-full overflow-hidden">
      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
      <span className={"transition-opacity duration-300 truncate " + visClass}>
        {TICKER_MESSAGES[index]}
      </span>
    </div>
  );
}

/* ============================================================
   PROMO PROGRESS BAR
============================================================ */
function PromoMeter(props) {
  var claimed = props.claimed;
  var limit = props.limit;
  var spotsLeft = props.spotsLeft;
  var loading = props.loading;

  var pct = limit > 0 ? (claimed / limit) * 100 : 0;
  var urgency =
    spotsLeft <= 10
      ? "text-red-400"
      : spotsLeft <= 25
      ? "text-yellow-400"
      : "text-emerald-400";

  var barColor =
    spotsLeft <= 10
      ? "bg-gradient-to-r from-red-500 to-orange-500"
      : "bg-gradient-to-r from-emerald-500 to-cyan-500";

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs sm:text-sm">
        <span className="text-white/60">
          {loading
            ? "Loading..."
            : claimed + " of " + limit + " spots claimed"}
        </span>
        <span className={"font-bold " + urgency}>
          {loading ? "…" : spotsLeft + " left!"}
        </span>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className={"h-full rounded-full transition-all duration-1000 " + barColor}
          style={{ width: pct + "%" }}
        />
      </div>
      {spotsLeft <= 10 && spotsLeft > 0 && (
        <p className="text-xs text-red-400 animate-pulse font-medium">
          ⚡ Almost full — grab your spot before it's gone!
        </p>
      )}
    </div>
  );
}

/* ============================================================
   HOME PAGE
============================================================ */
function Home() {
  var nav = useNavigate();

  var profits = useCountUp(3281907);
  var traders = useCountUp(24189);
  var winRate = useCountUp(78);

  var promo = usePromoStatus();
  var promoClaim = usePromoClaim();
  var claimState = promoClaim.state;
  var claim = promoClaim.claim;
  var reset = promoClaim.reset;

  var stateEmail = useState("");
  var email = stateEmail[0];
  var setEmail = stateEmail[1];

  var stateShowForm = useState(false);
  var showForm = stateShowForm[0];
  var setShowForm = stateShowForm[1];

  return (
    <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white overflow-x-hidden">
      {/* ════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Background card images */}
        <div className="absolute inset-0 opacity-[0.07] sm:opacity-10 pointer-events-none select-none">
          <img
            src={tradeLoss}
            alt=""
            className="absolute left-1/2 top-8 sm:top-16 w-[95vw] sm:w-[80vw] max-w-[700px] -translate-x-1/2 -rotate-2"
            draggable="false"
          />
          <img
            src={tradeWin}
            alt=""
            className="absolute left-1/2 top-[35%] sm:top-[40%] w-[95vw] sm:w-[80vw] max-w-[700px] -translate-x-1/2 rotate-2"
            draggable="false"
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 md:pt-24 pb-12 sm:pb-16 text-center">
          {/* Live ticker */}
          <div className="mb-6 sm:mb-8">
            <LiveTicker />
          </div>

          {/* Main headline */}
          <h1 className="font-extrabold leading-tight">
            <span className="block text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white/90">
              Your Money-Making Robot 🤖
            </span>
            <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-7xl bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent mt-2">
              Is Ready to Trade
            </span>
          </h1>

          <p className="mt-4 sm:mt-6 max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-white/70 leading-relaxed px-2">
            Our AI bot buys and sells <b>stocks &amp; crypto</b> for you —
            automatically. You don't need to know anything about trading.{" "}
            <span className="text-emerald-400 font-medium">
              Just press start and watch it work.
            </span>
          </p>

          {/* Quick trust badges */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-5 sm:mt-6 px-2">
            <Pill color="emerald">✅ No experience needed</Pill>
            <Pill color="indigo">🤖 Fully automated</Pill>
            <Pill color="purple">💰 Only pay when you profit</Pill>
          </div>

          {/* Big CTA buttons */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <Link
              to="/signup"
              className="group relative px-8 sm:px-10 py-4 sm:py-5 rounded-full font-bold text-base sm:text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 active:scale-95 sm:hover:scale-105 text-center"
            >
              🚀 Start For Free
              <span className="block text-[11px] sm:text-xs font-normal opacity-70 mt-0.5">
                No credit card needed to sign up
              </span>
            </Link>
            <Link
              to="/demo"
              className="px-8 sm:px-10 py-4 sm:py-5 rounded-full font-bold text-base sm:text-lg border-2 border-white/20 hover:border-white/40 hover:bg-white/5 transition-all active:scale-95 text-center"
            >
              🎮 Try the Demo First
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          LIVE STATS
      ════════════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-3 sm:px-4 -mt-2 sm:-mt-4 mb-10 sm:mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-center">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold font-mono text-emerald-400">
              {"$" + profits.toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm text-white/50 mt-1">
              Total Profits Earned
            </div>
            <div className="text-[11px] sm:text-xs text-emerald-400/60 mt-1">
              📈 and growing
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-center">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold font-mono text-indigo-400">
              {traders.toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm text-white/50 mt-1">
              Happy Traders
            </div>
            <div className="text-[11px] sm:text-xs text-indigo-400/60 mt-1">
              👥 join them today
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-center">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold font-mono text-purple-400">
              {winRate}%
            </div>
            <div className="text-xs sm:text-sm text-white/50 mt-1">
              Average Win Rate
            </div>
            <div className="text-[11px] sm:text-xs text-purple-400/60 mt-1">
              🎯 that's really good
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          HOW IT WORKS (3 steps)
      ════════════════════════════════════════════════ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            How Does It Work? 🤔
          </h2>
          <p className="text-white/60 mt-2 sm:mt-3 max-w-xl mx-auto text-sm sm:text-base px-2">
            It's as easy as 1-2-3. Seriously — even if you've never traded
            before.
          </p>
        </div>

        <div className="space-y-6 sm:space-y-8 px-1 sm:px-0">
          <StepCard
            number="1"
            emoji="📝"
            title="Sign Up (takes 2 minutes)"
            description="Create your free account and pick a plan. No trading knowledge required — we handle everything."
          />
          <div className="ml-5 sm:ml-6 border-l-2 border-white/10 h-4 sm:h-6" />
          <StepCard
            number="2"
            emoji="🔗"
            title="Connect Your Accounts"
            description="Link your OKX (crypto) or Alpaca (stocks) account. We'll walk you through every step with a simple guide."
          />
          <div className="ml-5 sm:ml-6 border-l-2 border-white/10 h-4 sm:h-6" />
          <StepCard
            number="3"
            emoji="🚀"
            title="Press Start & Relax"
            description="Hit the big green button and our AI bot starts trading for you 24/7. Watch your profits grow on your dashboard!"
          />
        </div>

        <div className="text-center mt-8 sm:mt-10 px-4 sm:px-0">
          <Link
            to="/signup"
            className="inline-block w-full sm:w-auto px-8 py-4 rounded-full font-bold bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 sm:hover:scale-105 text-center"
          >
            Let's Go! Create My Account →
          </Link>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          PROMO SECTION
      ════════════════════════════════════════════════ */}
      <section className="max-w-3xl mx-auto px-3 sm:px-4 py-10 sm:py-12">
        <GlowCard>
          <div className="flex items-start sm:items-center gap-3 mb-4">
            <span className="text-2xl flex-shrink-0">🎁</span>
            <div>
              <h3 className="text-lg sm:text-xl font-bold">
                Early Bird Special
              </h3>
              <p className="text-xs sm:text-sm text-white/60">
                First {promo.limit} users get a{" "}
                <b className="text-emerald-400">special deal</b>
              </p>
            </div>
          </div>

          {/* What you get */}
          <div className="bg-black/30 rounded-xl p-3 sm:p-4 mb-4 space-y-2">
            <FeatureRow
              icon="✅"
              label="Only 5% fee on profits over 3% (normally 30%)"
            />
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
            <p className="text-xs text-yellow-400 mt-2">
              ⚠ {promo.error}
            </p>
          )}

          {/* Claim form */}
          {!showForm && !claimState.success && promo.active && (
            <button
              onClick={function () {
                setShowForm(true);
              }}
              className="mt-4 w-full py-3.5 sm:py-4 rounded-xl font-bold text-base sm:text-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] sm:hover:scale-[1.02]"
            >
              🎉 Claim My Spot Now
            </button>
          )}

          {showForm && !claimState.success && (
            <form
              onSubmit={function (e) {
                e.preventDefault();
                claim(email).then(function (ok) {
                  if (ok) setShowForm(false);
                });
              }}
              className="mt-4 space-y-3"
            >
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={function (e) {
                    setEmail(e.target.value);
                  }}
                  placeholder="Enter your email address"
                  className="w-full rounded-xl bg-black/40 border border-emerald-500/50 px-4 py-3.5 sm:py-4 text-white text-sm sm:text-base placeholder:text-white/30 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                  required
                  autoFocus
                />
              </div>

              {claimState.error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  ⚠️ {claimState.error}
                </div>
              )}

              <div className="flex gap-2 sm:gap-3">
                <button
                  type="submit"
                  disabled={claimState.loading}
                  className="flex-1 py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all active:scale-[0.98]"
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
                  onClick={function () {
                    setShowForm(false);
                    reset();
                  }}
                  className="px-4 sm:px-6 text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  Cancel
                </button>
              </div>

              <p className="text-[11px] sm:text-xs text-white/30 text-center">
                🔒 We'll never spam you. Unsubscribe anytime.
              </p>
            </form>
          )}

          {claimState.success && (
            <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-emerald-300 font-bold text-base sm:text-lg">
                You're in!
              </p>
              <p className="text-xs sm:text-sm text-white/60 mt-1">
                Check your email, then{" "}
                <Link
                  to="/signup"
                  className="text-emerald-400 underline"
                >
                  create your account
                </Link>{" "}
                to get started.
              </p>
            </div>
          )}

          {!promo.active && !claimState.success && (
            <div className="mt-4 text-center py-4">
              <p className="text-white/50 text-sm">
                😅 Promo is full! But you can still{" "}
                <Link
                  to="/signup"
                  className="text-indigo-400 underline"
                >
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
      <section className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-12 sm:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            What's Inside Your Dashboard ✨
          </h2>
          <p className="text-white/60 mt-2 sm:mt-3 text-sm sm:text-base">
            Everything you need — all in one place
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <GlowCard>
            <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">🤖</div>
            <h3 className="font-bold text-base sm:text-lg">AI Trading Bot</h3>
            <p className="text-xs sm:text-sm text-white/60 mt-2 leading-relaxed">
              Our smart bot watches the market 24/7 and makes trades for you. It
              learns and gets better over time!
            </p>
            <div className="mt-3">
              <Pill color="emerald">All Plans</Pill>
            </div>
          </GlowCard>

          <GlowCard>
            <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">📊</div>
            <h3 className="font-bold text-base sm:text-lg">
              Live Charts &amp; Stats
            </h3>
            <p className="text-xs sm:text-sm text-white/60 mt-2 leading-relaxed">
              See your profits, win rate, and trade history in colorful
              easy-to-read charts. Watch your money grow!
            </p>
            <div className="mt-3">
              <Pill color="emerald">All Plans</Pill>
            </div>
          </GlowCard>

          <GlowCard>
            <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">🏆</div>
            <h3 className="font-bold text-base sm:text-lg">Trader Levels</h3>
            <p className="text-xs sm:text-sm text-white/60 mt-2 leading-relaxed">
              Earn XP with every trade! Level up from Bronze to Legend. Compete
              and show off your rank.
            </p>
            <div className="mt-3">
              <Pill color="emerald">All Plans</Pill>
            </div>
          </GlowCard>

          <GlowCard>
            <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">📈</div>
            <h3 className="font-bold text-base sm:text-lg">Stock Trading</h3>
            <p className="text-xs sm:text-sm text-white/60 mt-2 leading-relaxed">
              Trade real stocks like Apple, Tesla, and Amazon through Alpaca. The
              bot picks the best ones!
            </p>
            <div className="mt-3">
              <Pill color="indigo">Starter+</Pill>
            </div>
          </GlowCard>

          <GlowCard>
            <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">🦄</div>
            <h3 className="font-bold text-base sm:text-lg">DEX Trading</h3>
            <p className="text-xs sm:text-sm text-white/60 mt-2 leading-relaxed">
              Trade on decentralized exchanges for even more crypto
              opportunities. Advanced but powerful!
            </p>
            <div className="mt-3">
              <Pill color="purple">Elite+</Pill>
            </div>
          </GlowCard>

          <GlowCard>
            <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">📊</div>
            <h3 className="font-bold text-base sm:text-lg">
              Futures &amp; Leverage
            </h3>
            <p className="text-xs sm:text-sm text-white/60 mt-2 leading-relaxed">
              Multiply your gains with futures trading. The bot manages risk
              automatically so you don't have to.
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
      <section className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-10 sm:py-12">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold">
            Not Sure Yet? Try It Free! 🎮
          </h2>
          <p className="text-white/60 mt-2 text-sm sm:text-base">
            Play with our demo — no signup, no risk, just fun
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-gradient-to-br from-indigo-600/20 to-indigo-900/20 border border-indigo-500/20 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <span className="text-2xl sm:text-3xl">🔷</span>
              <div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wide text-indigo-300">
                  Crypto Bot
                </div>
                <h3 className="text-lg sm:text-xl font-bold">
                  Try Crypto Trading
                </h3>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-white/60 mb-4 leading-relaxed">
              Watch the bot trade Bitcoin, Ethereum, and more. See how it finds
              the best moments to buy and sell.
            </p>
            <Link
              to="/demo"
              className="block w-full text-center py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold transition-all active:scale-[0.98] sm:hover:scale-[1.02] text-sm sm:text-base"
            >
              🎮 Play Crypto Demo
            </Link>
          </div>

          <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-900/20 border border-emerald-500/20 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <span className="text-2xl sm:text-3xl">📈</span>
              <div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wide text-emerald-300">
                  Stock Bot
                </div>
                <h3 className="text-lg sm:text-xl font-bold">
                  Try Stock Trading
                </h3>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-white/60 mb-4 leading-relaxed">
              See how the bot picks winning stocks like Apple and Tesla. It's
              like having a Wall Street pro working for you!
            </p>
            <Link
              to="/demo?venue=stocks"
              className="block w-full text-center py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold transition-all active:scale-[0.98] sm:hover:scale-[1.02] text-sm sm:text-base"
            >
              🎮 Play Stock Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          TRUST / FAQ
      ════════════════════════════════════════════════ */}
      <section className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-12 sm:py-16">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold">
            Common Questions 💬
          </h2>
        </div>

        <div className="space-y-3 sm:space-y-4">
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
          ].map(function (item, i) {
            return (
              <details
                key={i}
                className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-white/5 transition-colors text-sm sm:text-base">
                  <span className="font-medium pr-4">{item.q}</span>
                  <span className="text-white/40 group-open:rotate-45 transition-transform text-lg sm:text-xl flex-shrink-0">
                    +
                  </span>
                </summary>
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-white/60 text-xs sm:text-sm leading-relaxed">
                  {item.a}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════════════ */}
      <section className="text-center py-14 sm:py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🚀</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
            Ready to Let Your Bot Make Money?
          </h2>
          <p className="text-white/60 mb-6 sm:mb-8 text-base sm:text-lg px-2">
            Join thousands of people who are already earning while they sleep. No
            experience needed. Start in 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2 sm:px-0">
            <Link
              to="/signup"
              className="px-8 sm:px-12 py-4 sm:py-5 rounded-full font-bold text-base sm:text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-500/25 transition-all active:scale-95 sm:hover:scale-105 text-center"
            >
              🚀 Create Free Account
            </Link>
            <Link
              to="/dashboard"
              className="px-8 sm:px-12 py-4 sm:py-5 rounded-full font-bold text-base sm:text-lg border-2 border-white/20 hover:border-white/40 hover:bg-white/5 transition-all active:scale-95 text-center"
            >
              📊 Go to Dashboard
            </Link>
          </div>
          <p className="text-[11px] sm:text-xs text-white/30 mt-5 sm:mt-6">
            No credit card required • Cancel anytime • Your money stays in your
            account
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          FOOTER LINKS
      ════════════════════════════════════════════════ */}
      <section className="border-t border-white/10 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-x-4 gap-y-2 sm:gap-6 text-xs sm:text-sm text-white/40">
          <Link
            to="/how-it-works"
            className="hover:text-white transition-colors py-1"
          >
            How It Works
          </Link>
          <Link
            to="/pricing"
            className="hover:text-white transition-colors py-1"
          >
            Pricing
          </Link>
          <Link
            to="/funding-guide"
            className="hover:text-white transition-colors py-1"
          >
            Funding Guide
          </Link>
          <Link
            to="/support"
            className="hover:text-white transition-colors py-1"
          >
            Support
          </Link>
          <Link
            to="/privacy"
            className="hover:text-white transition-colors py-1"
          >
            Privacy
          </Link>
          <Link
            to="/terms"
            className="hover:text-white transition-colors py-1"
          >
            Terms
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Home;
