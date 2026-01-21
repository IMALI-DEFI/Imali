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

export default function Home() {
  const navigate = useNavigate();

  // Animated counters (demo-style numbers — replace with real stats later)
  const totalProfits = useCountUp({ to: 3281907, durationMs: 2200 });
  const activeTraders = useCountUp({ to: 24189, durationMs: 2200 });

  // Promo counter (First 50)
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
  const progressPct = PROMO_LIMIT > 0 ? (totalClaimed / PROMO_LIMIT) * 100 : 0;

  return (
    <div className="w-full overflow-x-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white">
      {/* HERO */}
      <section className="relative w-full overflow-hidden">
        {/* Background art (mobile-safe: stacked, not side-by-side) */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 opacity-20 md:opacity-25">
            {/* Image 1 */}
            <img
              src={tradeLoss}
              alt=""
              className="absolute left-1/2 top-10 w-[88vw] max-w-[720px] -translate-x-1/2 -rotate-2 object-contain"
              draggable="false"
            />
            {/* Image 2 */}
            <img
              src={tradeWin}
              alt=""
              className="absolute left-1/2 top-[38%] w-[88vw] max-w-[720px] -translate-x-1/2 rotate-2 object-contain"
              draggable="false"
            />
          </div>

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950/80 via-gray-950/40 to-indigo-950/80" />
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-24 text-center md:pt-28">
          <h1 className="mx-auto max-w-5xl font-extrabold tracking-tight leading-[1.05]">
            <span className="block text-indigo-400 text-[clamp(2.1rem,8vw,4.25rem)]">
              AI-POWERED
            </span>
            <span className="block text-white text-[clamp(2.3rem,9vw,4.75rem)]">
              STOCK & CRYPTO
            </span>
            <span className="block text-white text-[clamp(2.3rem,9vw,4.75rem)]">
              PROFITS
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-base sm:text-lg md:text-xl text-white/90">
            <span className="font-bold">IMALI</span> helps beginners trade with
            auto trading options, <span className="font-semibold">no percentage fee</span>{" "}
            unless your account exceeds a net <span className="font-semibold">3% profit</span>. Cancel anytime.
          </p>

          {/* Promo banner */}
          <div className="mx-auto mt-8 mb-10 max-w-3xl rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-6 py-5 text-left">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-emerald-200">
                  Limited promo
                </div>
                <div className="mt-1 text-xl font-extrabold text-white">
                  First 50 customers: 5% performance fee over 3% for 90 days
                </div>
                <div className="mt-2 text-sm text-white/80">
                  Cancel anytime. Promo ends when 50 spots are filled.
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-xs text-white/70">Spots left</div>
                <div className="text-3xl font-extrabold text-emerald-200 tabular-nums">
                  {spotsLeft}
                </div>
                <div className="text-[11px] text-white/60">out of {PROMO_LIMIT}</div>
              </div>
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-emerald-400/80"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Primary CTAs */}
          <div className="mb-10 mt-2 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              to="/signup"
              className="rounded-full bg-indigo-600 px-8 py-4 text-lg font-bold transition-all duration-300 hover:bg-indigo-700 active:scale-[0.99]"
            >
              Start (Free Tier)
            </Link>

            <Link
              to="/pricing"
              className="rounded-full border-2 border-indigo-500 px-8 py-4 text-lg font-bold transition-all hover:bg-indigo-500/20"
            >
              See Pricing + Rules
            </Link>
          </div>

          {/* Quick feature strip */}
          <div className="mx-auto mb-10 grid max-w-3xl grid-cols-1 gap-2 text-sm sm:grid-cols-3 sm:gap-3">
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

          {/* Counters */}
          <div className="mx-auto mb-8 max-w-2xl rounded-xl border border-white/10 bg-gray-900/50 p-6">
            <div className="flex items-center justify-between gap-6">
              <div className="text-left">
                <div className="text-2xl font-mono tabular-nums">
                  ${totalProfits.toLocaleString()}
                </div>
                <div className="text-indigo-300">Example Profits (Demo Counter)</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-mono tabular-nums">
                  {activeTraders.toLocaleString()}
                </div>
                <div className="text-indigo-300">Example Users (Demo Counter)</div>
              </div>
            </div>
          </div>

          {/* Dual Demo CTA Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            {/* Crypto Demo */}
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5 text-left">
              <div className="mb-1 text-sm uppercase tracking-wide text-indigo-300">
                Crypto Bot
              </div>
              <h3 className="mb-2 text-2xl font-bold">
                New Crypto (DEX) + Established Crypto (CEX)
              </h3>
              <p className="mb-4 text-sm text-white/85">
                See live PnL, markers, and alerts. Start with demo signals, then
                choose Auto or Manual when you’re ready.
              </p>
              <div className="flex items-center gap-3">
                <Link
                  to="/demo"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-500"
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
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5 text-left">
              <div className="mb-1 text-sm uppercase tracking-wide text-emerald-300">
                Stock Bot
              </div>
              <h3 className="mb-2 text-2xl font-bold">Stocks (Alpaca)</h3>
              <p className="mb-4 text-sm text-white/85">
                Start in paper mode. See alerts, simple rules, and performance tracking
                before you go live.
              </p>
              <div className="flex items-center gap-3">
                <Link
                  to="/demo?venue=stocks"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500"
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
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-4xl px-4 pb-24 pt-10 text-center">
        <h2 className="mb-6 text-3xl font-bold">Open the Dashboard 🚀</h2>
        <p className="mb-10 text-lg text-white/90 md:text-xl">
          Track PnL, see alerts, and control everything from one place.
        </p>

        <div className="inline-block rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 p-1">
          <Link
            to="/MemberDashboard"
            className="block rounded-full bg-gray-950 px-12 py-5 text-lg font-bold transition-colors hover:bg-gray-900"
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
      </section>
    </div>
  );
}