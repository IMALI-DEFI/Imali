import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaArrowRight,
  FaCheckCircle,
  FaShieldAlt,
  FaRobot,
  FaPlug,
  FaChartLine,
  FaBrain,
  FaClock,
  FaSpinner,
} from "react-icons/fa";


const DEMO_SIGNAL_URL =
  `${process.env.REACT_APP_API_URL || "https://api.imali-defi.com"}/api/public/signals/demo`;

export default function Home() {
  const [demoSignals, setDemoSignals] = useState([]);
  const [demoLoading, setDemoLoading] = useState(true);
  const [demoUpdatedAt, setDemoUpdatedAt] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadDemoSignals = async () => {
      try {
        const response = await fetch(DEMO_SIGNAL_URL, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Signal demo HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!mounted) return;

        setDemoSignals(
          Array.isArray(data?.signals)
            ? data.signals
            : []
        );

        setDemoUpdatedAt(new Date());
      } catch (error) {
        console.error("Homepage signal demo error:", error);
      } finally {
        if (mounted) {
          setDemoLoading(false);
        }
      }
    };

    loadDemoSignals();

    const interval = window.setInterval(
      loadDemoSignals,
      30000
    );

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* HERO */}
      <section className="relative min-h-[78vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-slate-950 to-cyan-500/10" />

        <div className="absolute top-20 left-1/4 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-20 right-1/4 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-20 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
              <FaRobot />
              AI That Helps You Trade
            </div>

            <h1 className="mx-auto max-w-4xl text-4xl font-black tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Let IMALI
              <span className="block bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Trade for You
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg md:text-xl">
              Connect your existing trading account and let IMALI analyze
              opportunities, manage risk, and automate trades.
            </p>

            <div className="mt-9">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white/40">
                Start automated trading from
              </div>

              <div className="mt-2 flex items-end justify-center gap-2">
                <span className="text-5xl font-black text-white sm:text-6xl">
                  $19.95
                </span>
                <span className="mb-2 text-lg text-white/50">/month</span>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <Link
                to="/signup?plan=pro&tier=pro&product_type=trading"
                state={{
                  tier: "pro",
                  product_type: "trading",
                  from: "home",
                }}
                className="group inline-flex w-full max-w-sm items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-8 py-4 text-lg font-extrabold text-slate-950 shadow-2xl shadow-emerald-500/20 transition hover:scale-[1.02] hover:bg-emerald-400 sm:w-auto sm:min-w-[320px]"
              >
                Start Trading with IMALI
                <FaArrowRight className="transition group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/45 sm:text-sm">
              <span className="flex items-center gap-2">
                <FaShieldAlt className="text-emerald-400" />
                Non-custodial
              </span>

              <span className="flex items-center gap-2">
                <FaCheckCircle className="text-emerald-400" />
                Your funds stay in your account
              </span>

              <span className="flex items-center gap-2">
                <FaCheckCircle className="text-emerald-400" />
                Cancel anytime
              </span>
            </div>
          </motion.div>
        </div>
      </section>


      {/* LIVE AI SIGNAL DEMO */}
      <section className="relative border-t border-white/5 bg-slate-950 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">

          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
              <FaBrain />
              See IMALI Working
            </div>

            <h2 className="mt-5 text-3xl font-black sm:text-4xl md:text-5xl">
              See What IMALI
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                {" "}Finds
              </span>
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-base">
              IMALI watches the market all day. When it finds a possible trade,
               it gives that trade a score. Here are some things IMALI recently found.
            </p>

            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-white/30">
              <FaClock />

              {demoUpdatedAt
                ? `Updated ${demoUpdatedAt.toLocaleTimeString()}`
                : "Loading latest signals"}
            </div>
          </div>

          <div className="mt-9">
            {demoLoading && demoSignals.length === 0 ? (
              <div className="grid min-h-[220px] place-items-center">
                <div className="text-center text-white/45">
                  <FaSpinner className="mx-auto mb-3 animate-spin text-2xl text-cyan-300" />
                  Loading IMALI AI signals...
                </div>
              </div>
            ) : demoSignals.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/40">
                New AI signals will appear here automatically.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {demoSignals.map((signal, index) => {
                  const score = Number(signal.score || 0);
                  const confidence = Number(signal.confidence || 0);
                  const price = Number(signal.price || 0);

                  const side = String(signal.side || "").toUpperCase();

                  const sideClasses =
                    side === "BUY"
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/20"
                      : "bg-red-500/15 text-red-300 border-red-400/20";

                  return (
                    <motion.div
                      key={signal.id || `${signal.symbol}-${index}`}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: index * 0.04 }}
                      className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5 shadow-xl backdrop-blur"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-black text-lg">
                            {signal.symbol}
                          </div>

                          <div className="mt-1 text-xs text-white/35">
                            {signal.market || "Market"}
                          </div>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${sideClasses}`}
                        >
                          {side || "SIGNAL"}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">

                        <div className="rounded-2xl bg-black/20 p-3">
                          <div className="text-sm font-black text-emerald-300">
                            ★ TRADE SCORE
                          </div>

                          <div className="mt-1 text-xl font-black text-white">
                            {score.toFixed(1)}
                            <span className="ml-1 text-xs font-normal text-white/40">
                              / 100
                            </span>
                          </div>

                          <div className="mt-1 text-xs leading-snug text-white/50">
                            How good this trade looks
                          </div>
                        </div>

                        <div className="rounded-2xl bg-black/20 p-3">
                          <div className="text-sm font-black text-cyan-300">
                            🧠 AI CONFIDENCE
                          </div>

                          <div className="mt-1 text-xl font-black text-white">
                            {confidence.toFixed(1)}%
                          </div>

                          <div className="mt-1 text-xs leading-snug text-white/50">
                            How sure the AI is
                          </div>
                        </div>

                        <div className="rounded-2xl bg-black/20 p-3">
                          <div className="text-sm font-black text-emerald-300">
                            💵 PRICE FOUND
                          </div>

                          <div className="mt-1 truncate text-lg font-black text-white">
                            {price > 0
                              ? `$${price.toLocaleString(undefined, {
                                  maximumFractionDigits: 8,
                                })}`
                              : "-"}
                          </div>

                          <div className="mt-1 text-xs leading-snug text-white/50">
                            Price when IMALI found it
                          </div>
                        </div>

                        <div className="rounded-2xl bg-black/20 p-3">
                          <div className="text-sm font-black text-amber-300">
                            ⚠ RISK LEVEL
                          </div>

                          <div className="mt-1 text-lg font-black capitalize text-white">
                            {signal.risk || "N/A"}
                          </div>

                          <div className="mt-1 text-xs leading-snug text-white/50">
                            How risky this trade looks
                          </div>
                        </div>

                      </div>

                      

                      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
                        

                        <span className="text-[10px] text-white/25">
                          {signal.sent_at
                            ? new Date(signal.sent_at).toLocaleString()
                            : "Recent"}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-9 text-center">
            <p className="mx-auto max-w-xl text-xs leading-relaxed text-white/35">
              These examples show what IMALI is finding in the market.
               They do not mean a real-money trade happened.
               Real trading can make or lose money.
            </p>

            <Link
              to="/signup?plan=pro&tier=pro&product_type=trading"
              state={{
                tier: "pro",
                product_type: "trading",
                from: "home-demo",
              }}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-7 py-3.5 font-extrabold text-slate-950 transition hover:bg-emerald-400"
            >
              Start Trading with IMALI
              <FaArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* THREE STEPS */}
      <section className="border-y border-white/5 bg-white/[0.02] py-14 sm:py-16">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
              Getting started
            </p>

            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              Here's How It Works
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                number: "1",
                icon: <FaCheckCircle />,
                title: "Create Your Account",
                text: "Sign up for IMALI and choose the plan you want to use.",
              },
              {
                number: "2",
                icon: <FaPlug />,
                title: "Connect Your Trading Account",
                text: "Connect Robinhood Crypto, OKX, or Alpaca. Your money stays in that account.",
              },
              {
                number: "3",
                icon: <FaChartLine />,
                title: "Let IMALI Trade",
                text: "IMALI watches the market, checks opportunities, and can place eligible trades based on your settings.",
              },
            ].map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 text-center"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-xl text-emerald-400">
                  {step.icon}
                </div>

                <div className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-white/25">
                  Step {step.number}
                </div>

                <h3 className="mt-2 text-xl font-bold">{step.title}</h3>

                <p className="mt-2 text-sm leading-relaxed text-white/50">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SUPPORTED ACCOUNTS */}
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-4xl px-5 text-center sm:px-6">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/35">
            Use an Account You Already Have
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {["Robinhood Crypto", "OKX", "Alpaca"].map((provider) => (
              <div
                key={provider}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 font-semibold text-white/80"
              >
                {provider}
              </div>
            ))}
          </div>

          <p className="mx-auto mt-7 max-w-xl text-sm leading-relaxed text-white/45">
            IMALI connects to supported trading accounts without taking custody
            of your funds.
          </p>

          <Link
            to="/how-it-works"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300"
          >
            See how IMALI works <FaArrowRight />
          </Link>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-t border-white/5 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 py-16">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="text-3xl font-black sm:text-4xl">
            Ready to let IMALI watch the market for you?
          </h2>

          <p className="mt-3 text-white/55">
            Connect your trading account and let IMALI help find, check, and automate trading opportunities.
          </p>

          <Link
            to="/signup?plan=pro&tier=pro&product_type=trading"
            state={{
              tier: "pro",
              product_type: "trading",
              from: "home",
            }}
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-8 py-4 text-lg font-extrabold text-slate-950 transition hover:bg-emerald-400"
          >
            Start Pro — $19.95/month
            <FaArrowRight />
          </Link>
        </div>
      </section>
    </div>
  );
}
