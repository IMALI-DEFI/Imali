// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
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

const Home = () => {
  const navigate = useNavigate();
  const totalProfits = useCountUp({ to: 3281907, durationMs: 2200 });
  const activeTraders = useCountUp({ to: 24189, durationMs: 2200 });

  return (
    <div className="page bg-gradient-to-br from-gray-900 to-indigo-900 text-white min-h-screen overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative">
        {/* Background visuals (hidden on small screens) */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden hidden sm:block"
          aria-hidden="true"
        >
          <div className="absolute inset-0 flex justify-center items-center gap-20 opacity-15 md:opacity-20 lg:opacity-25">
            <img
              src={tradeLoss}
              alt=""
              className="w-[60vw] max-w-[720px] object-contain -translate-y-6"
            />
            <img
              src={tradeWin}
              alt=""
              className="w-[60vw] max-w-[720px] object-contain translate-y-6"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900/40 to-indigo-900/70" />
        </div>

        {/* Content */}
        <div
          className="max-w-7xl mx-auto px-4 pt-20 pb-16 sm:pt-24 sm:pb-24 text-center relative z-10
          pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]"
        >
          <h1 className="font-extrabold leading-tight text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-5 text-balance break-words">
            <span className="block sm:inline text-indigo-400">AI-POWERED</span>{" "}
            <span className="block sm:inline">CRYPTO &</span>{" "}
            <span className="block sm:inline">STOCK</span>{" "}
            <span className="block sm:inline">PROFITS</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl mb-3 max-w-3xl mx-auto text-white/90">
            Join <span className="font-bold">IMALI</span> — automated AI bots,
            IMALI-powered rewards, and a zero-code dashboard that makes
            professional-grade trading simple and rewarding.
          </p>

          <p className="text-sm sm:text-base md:text-lg text-indigo-200/90 max-w-3xl mx-auto">
            One shared AI model across DEX (Uniswap/QuickSwap), CEX (OKX), and
            Stocks (Alpaca). Demo or Live — it keeps learning from results.
          </p>

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-12 mt-6">
            <Link
              to="/signup"
              className="bg-indigo-600 hover:bg-indigo-700 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-base sm:text-lg transition-all duration-300"
            >
              Start Free Trial
            </Link>
            <Link
              to="/pricing"
              className="border-2 border-indigo-500 hover:bg-indigo-500 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-base sm:text-lg transition-all"
            >
              Compare Tiers
            </Link>
          </div>

          {/* Quick Feature Strip */}
          <div className="mx-auto grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 max-w-3xl mb-10 sm:mb-12 text-sm sm:text-[0.95rem]">
            <div className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 break-words">
              🎯 Smart strategies (Momentum, MeanRev, SMA, AI filter)
            </div>
            <div className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 break-words">
              🛡️ Risk guards (TP/SL, cooldowns, max drawdown)
            </div>
            <div className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 break-words">
              🏆 Gamified XP • Streaks • Coins
            </div>
          </div>

          {/* Counters */}
          <div className="bg-gray-800/60 rounded-xl p-5 sm:p-6 max-w-2xl mx-auto mb-12 sm:mb-14 border border-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-0">
              <div className="text-center sm:text-left">
                <div className="text-xl sm:text-2xl font-mono tabular-nums">
                  ${totalProfits.toLocaleString()}
                </div>
                <div className="text-indigo-300 text-sm sm:text-base">
                  Total Profits Generated
                </div>
              </div>
              <div className="text-center sm:text-right">
                <div className="text-xl sm:text-2xl font-mono tabular-nums">
                  {activeTraders.toLocaleString()}
                </div>
                <div className="text-indigo-300 text-sm sm:text-base">
                  Active Traders
                </div>
              </div>
            </div>
          </div>

          {/* Dual Demo Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Crypto Demo */}
            <div className="rounded-2xl p-4 sm:p-5 border border-white/10 bg-white/10 text-left">
              <div className="text-xs sm:text-sm uppercase tracking-wide text-indigo-300 mb-1">
                Crypto Bot
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2">
                DEX & OKX Autopilot
              </h3>
              <p className="text-white/85 text-sm sm:text-base mb-4">
                Watch the live equity curve, PnL, and markers (honeypot/TP).
                Earn XP and coins as your demo runs. Switch to Live with the
                same AI model.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/demo"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg font-semibold text-sm sm:text-base"
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

            {/* Stock Demo */}
            <div className="rounded-2xl p-4 sm:p-5 border border-white/10 bg-white/10 text-left">
              <div className="text-xs sm:text-sm uppercase tracking-wide text-emerald-300 mb-1">
                Stock Bot
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2">
                Top Movers + Sentiment
              </h3>
              <p className="text-white/85 text-sm sm:text-base mb-4">
                SMA crossover + AI probability filter, news sentiment, and
                bracket orders (TP/SL). Start in Paper — go Live when ready.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/demo?venue=stocks"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg font-semibold text-sm sm:text-base"
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
      <div className="max-w-4xl mx-auto px-4 pb-20 sm:pb-24 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">
          See IMALI In Action 🚀
        </h2>
        <p className="text-base sm:text-lg md:text-xl mb-8 sm:mb-10 text-white/90">
          Try our interactive demos to explore live bot stats, mock trades, and
          the full dashboard experience.
        </p>
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full p-1 inline-block">
          <Link
            to="/MemberDashboard"
            className="block bg-gray-900 hover:bg-gray-800 px-8 sm:px-12 py-4 sm:py-5 rounded-full font-bold text-base sm:text-lg transition-colors"
          >
            Start For Free
          </Link>
        </div>
        <div className="mt-4">
          <Link
            to="/demo?venue=stocks"
            className="inline-block text-sm sm:text-base text-emerald-300 underline hover:text-emerald-200"
          >
            Or launch the Stock Demo →
          </Link>
        </div>
        <p className="mt-6 text-indigo-300 text-sm sm:text-base">
          No signup required • Explore all features • Perfect for first-time
          users
        </p>
      </div>
    </div>
  );
};

export default Home;