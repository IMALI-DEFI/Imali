// src/pages/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// Background card images
import tradeLoss from "../assets/images/cards/trade_loss_template2.PNG";
import tradeWin from "../assets/images/cards/trade_win_template2.PNG";

/* -------------------------- Helpers -------------------------- */

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

/* -------------------------- Component -------------------------- */

export default function Home() {
  const navigate = useNavigate();

  // Animated counters (demo numbers)
  const totalProfits = useCountUp({ to: 3281907, durationMs: 2200 });
  const activeTraders = useCountUp({ to: 24189, durationMs: 2200 });

  // Promo counter
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
    <div className="w-full overflow-x-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white">
      {/* ================= HERO ================= */}
      <section className="relative w-full overflow-hidden">
        {/* Background Art */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 opacity-20 md:opacity-25">
            <img
              src={tradeLoss}
              alt=""
              className="absolute left-1/2 top-10 w-[88vw] max-w-[720px] -translate-x-1/2 -rotate-2 object-contain"
              draggable="false"
            />
            <img
              src={tradeWin}
              alt=""
              className="absolute left-1/2 top-[38%] w-[88vw] max-w-[720px] -translate-x-1/2 rotate-2 object-contain"
              draggable="false"
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-b from-gray-950/80 via-gray-950/40 to-indigo-950/80" />
        </div>

        {/* Hero Content */}
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
            automated strategies — <span className="font-semibold">no fees</span>{" "}
            unless your account exceeds a{" "}
            <span className="font-semibold">3% net profit</span>. Cancel anytime.
          </p>

          {/* Promo Banner */}
          <div className="mx-auto mt-8 mb-10 max-w-3xl rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-6 py-5 text-left">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-emerald-200">
                  Limited promo
                </div>
                <div className="mt-1 text-xl font-extrabold">
                  First 50 customers: 5% performance fee over 3% for 90 days
                </div>
                <div className="mt-2 text-sm text-white/80">
                  Promo ends when all spots are filled.
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-xs text-white/70">Spots left</div>
                <div className="text-3xl font-extrabold text-emerald-200">
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

          {/* CTAs */}
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/signup"
              className="rounded-full bg-indigo-600 px-8 py-4 text-lg font-bold hover:bg-indigo-700"
            >
              Start (Free Tier)
            </Link>

            <Link
              to="/pricing"
              className="rounded-full border-2 border-indigo-500 px-8 py-4 text-lg font-bold hover:bg-indigo-500/20"
            >
              See Pricing + Rules
            </Link>
          </div>

          {/* Feature Strip */}
          <div className="mx-auto mb-10 grid max-w-3xl grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg bg-white/10 border border-white/10 px-4 py-3">
              ✅ Simple strategies
            </div>
            <div className="rounded-lg bg-white/10 border border-white/10 px-4 py-3">
              🛡️ Built-in risk controls
            </div>
            <div className="rounded-lg bg-white/10 border border-white/10 px-4 py-3">
              ⛔ One-click stop
            </div>
          </div>

          {/* Counters */}
          <div className="mx-auto mb-10 max-w-2xl rounded-xl border border-white/10 bg-gray-900/50 p-6">
            <div className="flex justify-between">
              <div>
                <div className="text-2xl font-mono">
                  ${totalProfits.toLocaleString()}
                </div>
                <div className="text-xs text-white/60">Demo profits</div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-mono">
                  {activeTraders.toLocaleString()}
                </div>
                <div className="text-xs text-white/60">Active traders</div>
              </div>
            </div>
          </div>

          {/* Demo Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white/10 border border-white/10 p-5 text-left">
              <div className="text-sm uppercase text-indigo-300">Crypto Bot</div>
              <h3 className="text-2xl font-bold mt-1">
                New + Established Crypto
              </h3>
              <div className="mt-4 flex gap-3">
                <Link
                  to="/demo"
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-500"
                >
                  Launch Demo
                </Link>
                <button
                  onClick={() => navigate("/how-it-works")}
                  className="text-sm underline text-white/80"
                >
                  How it works
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 border border-white/10 p-5 text-left">
              <div className="text-sm uppercase text-emerald-300">Stock Bot</div>
              <h3 className="text-2xl font-bold mt-1">Stocks (Alpaca)</h3>
              <div className="mt-4 flex gap-3">
                <Link
                  to="/demo?venue=stocks"
                  className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500"
                >
                  Launch Demo
                </Link>
                <button
                  onClick={() => navigate("/pricing")}
                  className="text-sm underline text-white/80"
                >
                  Requirements
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="mx-auto max-w-4xl px-4 pb-24 pt-10 text-center">
        <h2 className="mb-6 text-3xl font-bold">Open the Dashboard 🚀</h2>
        <p className="mb-10 text-lg text-white/90">
          Track PnL, alerts, and control everything in one place.
        </p>

        <div className="inline-block rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 p-1">
          <Link
            to="/MemberDashboard"
            className="block rounded-full bg-gray-950 px-12 py-5 text-lg font-bold hover:bg-gray-900"
          >
            Go to Dashboard
          </Link>
        </div>

        <p className="mt-6 text-indigo-300">
          Cancel anytime • Start in Demo • Upgrade when ready
        </p>
      </section>
    </div>
  );
}
