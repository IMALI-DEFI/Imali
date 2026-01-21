// src/pages/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// Background card images
import tradeLoss from "../assets/images/cards/trade_loss_template2.PNG";
import tradeWin from "../assets/images/cards/trade_win_template2.PNG";

function useCountUp({ to = 1000, durationMs = 2000, fps = 60 }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let raf;
    const totalFrames = Math.max(1, Math.round((durationMs / 1000) * fps));
    let frame = 0;

    const tick = () => {
      frame += 1;
      const p = Math.min(1, frame / totalFrames);
      const eased = 1 - Math.pow(1 - p, 2); // easeOutQuad
      setVal(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, durationMs, fps]);

  return val;
}

const clampInt = (n, min, max) => Math.max(min, Math.min(max, n));

const Home = () => {
  const navigate = useNavigate();

  // Animated counters (demo-style numbers — replace with real stats later)
  const totalProfits = useCountUp({ to: 3281907, durationMs: 2200 });
  const activeTraders = useCountUp({ to: 24189, durationMs: 2200 });

  // Promo counter (First 50)
  // Dev note: set this in Netlify to control the counter without redeploying:
  // REACT_APP_PROMO_FIRST50_CLAIMED=12
  const PROMO_LIMIT = 50;

  const claimedFromEnv = useMemo(() => {
    const raw = process.env.REACT_APP_PROMO_FIRST50_CLAIMED;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const [localClaimed, setLocalClaimed] = useState(0);

  useEffect(() => {
    try {
      const v = Number(localStorage.getItem("imali_promo_claimed") || "0");
      setLocalClaimed(Number.isFinite(v) ? v : 0);
    } catch {
      setLocalClaimed(0);
    }
  }, []);

  const totalClaimed = clampInt(claimedFromEnv + localClaimed, 0, PROMO_LIMIT);
  const spotsLeft = clampInt(PROMO_LIMIT - totalClaimed, 0, PROMO_LIMIT);
  const progressPct =
    PROMO_LIMIT > 0 ? (totalClaimed / PROMO_LIMIT) * 100 : 0;

  return (
    <div className="page bg-gradient-to-br from-gray-900 to-indigo-900 text-white min-h-screen">
      <div className="relative">
        {/* Background */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute inset-0 flex justify-center items-center gap-20 opacity-15 md:opacity-20 lg:opacity-25">
            <img
              src={tradeLoss}
              alt=""
              className="w-[70vw] max-w-[900px] object-contain -translate-y-8 scale-110"
            />
            <img
              src={tradeWin}
              alt=""
              className="w-[70vw] max-w-[900px] object-contain translate-y-8 scale-110"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900/40 to-indigo-900/70" />
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-24 text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            <span className="text-indigo-400">AI-POWERED</span>{" "}
            <span className="whitespace-nowrap">STOCK & CRYPTO  </span>{" "}
            PROFITS
          </h1>

          <p className="text-xl mb-3 max-w-3xl mx-auto text-white/90">
            <span className="font-bold">IMALI</span> helps beginners trade with
            auto trading options, NO percentage fee unless your account exceeds a net 3% profit, cancel anytime.
          </p>

          {/* Promo banner */}
          <div className="mx-auto mt-8 mb-10 max-w-3xl rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-6 py-5 text-left">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-emerald-200">
                  Limited promo
                </div>
                <div className="text-xl font-extrabold text-white mt-1">
                  First 50 customers: 5% performance fee over 3% for 90 days
                </div>
                <div className="text-sm text-white/80 mt-2">
                  Cancel anytime. Promo ends when 50 spots are filled.
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-xs text-white/70">Spots left</div>
                <div className="text-3xl font-extrabold text-emerald-200 tabular-nums">
                  {spotsLeft}
                </div>
                <div className="text-[11px] text-white/60">
                  out of {PROMO_LIMIT}
                </div>
              </div>
            </div>

            <div className="mt-4 h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-emerald-400/80"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-12 mt-2">
            <Link
              to="/signup"
              className="bg-indigo-600 hover:bg-indigo-700 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 transform hover:scale-105"
            >
              Start (Free Tier)
            </Link>
            <Link
              to="/pricing"
              className="border-2 border-indigo-500 hover:bg-indigo-500 px-8 py-4 rounded-full font-bold text-lg transition-all"
            >
              See Pricing + Rules
            </Link>
          </div>

          {/* Quick feature strip (novice wording) */}
          <div className="mx-auto grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 max-w-3xl mb-12 text-sm">
            <div className="rounded-lg border border-white/10 bg-white/10 px-4 py-3">
              ✅ Simple strategies (trend, bounce, AI filter)
            </div>
            <div className="rounded-lg border border-white/10 bg-white/10 px-4 py-3">
              🛡️ Safety controls (take profit, stop loss, cooldown)
            </div>
            <div className="rounded-lg border border-white/10 bg-white/10 px-4 py-3">
              ⛔ Big STOP button • Cancel anytime
            </div>
          </div>

          {/* Counters (demo-style) */}
          <div className="bg-gray-800/60 rounded-xl p-6 max-w-2xl mx-auto mb-14 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="text-2xl font-mono tabular-nums">
                  ${totalProfits.toLocaleString()}
                </div>
                <div className="text-indigo-300">
                  Example Profits (Demo Counter)
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-mono tabular-nums">
                  {activeTraders.toLocaleString()}
                </div>
                <div className="text-indigo-300">
                  Example Users (Demo Counter)
                </div>
              </div>
            </div>
          </div>

          {/* Dual Demo CTA Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Crypto Demo */}
            <div className="rounded-2xl p-5 border border-white/10 bg-white/10 text-left">
              <div className="text-sm uppercase tracking-wide text-indigo-300 mb-1">
                Crypto Bot
              </div>
              <h3 className="text-2xl font-bold mb-2">
                New Crypto (DEX) + Established Crypto (CEX)
              </h3>
              <p className="text-white/85 text-sm mb-4">
                See live PnL, markers, and alerts. Start with demo signals, then
                choose Auto or Manual when you’re ready.
              </p>
              <div className="flex items-center gap-2">
                <Link
                  to="/demo"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg font-semibold"
                >
                  Launch Crypto Demo <span aria-hidden>↗</span>
                </Link>
                <button
                  onClick={() => navigate("/how-it-works")}
                  className="text-sm underline text-white/80 hover:text-white"
                >
                  How it works
                </button>
              </div>
            </div>

            {/* Stocks Demo */}
            <div className="rounded-2xl p-5 border border-white/10 bg-white/10 text-left">
              <div className="text-sm uppercase tracking-wide text-emerald-300 mb-1">
                Stock Bot
              </div>
              <h3 className="text-2xl font-bold mb-2">Stocks (Alpaca)</h3>
              <p className="text-white/85 text-sm mb-4">
                Start in paper mode. See alerts, simple rules, and performance
                tracking before you go live.
              </p>
              <div className="flex items-center gap-2">
                <Link
                  to="/demo?venue=stocks"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg font-semibold"
                >
                  Launch Stock Demo <span aria-hidden>↗</span>
                </Link>
                <button
                  onClick={() => navigate("/pricing")}
                  className="text-sm underline text-white/80 hover:text-white"
                >
                  Requirements
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="max-w-4xl mx-auto px-4 pb-24 text-center">
        <h2 className="text-3xl font-bold mb-6">Open the Dashboard 🚀</h2>
        <p className="text-lg md:text-xl mb-10 text-white/90">
          Track PnL, see alerts, and control everything from one place.
        </p>
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full p-1 inline-block">
          <Link
            to="/MemberDashboard"
            className="block bg-gray-900 hover:bg-gray-800 px-12 py-5 rounded-full font-bold text-lg transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
        <div className="mt-4">
          <Link
            to="/pricing"
            className="inline-block text-sm text-emerald-300 underline hover:text-emerald-200"
          >
            View pricing + promo →
          </Link>
        </div>
        <p className="mt-6 text-indigo-300">
          Cancel anytime • Start in Demo • Switch to Auto when ready
        </p>
      </div>
    </div>
  );
};

export default Home;
