import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaArrowRight,
  FaCheckCircle,
  FaShieldAlt,
  FaRobot,
  FaPlug,
  FaChartLine,
} from "react-icons/fa";


export default function Home() {
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

          </motion.div>
        </div>
      </section>


      {/* PRODUCT DEMO */}
      <section className="relative border-t border-white/5 bg-slate-950 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">

          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
              <FaRobot />
              See IMALI in Action
            </div>

            <h2 className="mt-5 text-3xl font-black sm:text-4xl md:text-5xl">
              See What Trading With
              <span className="block bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                IMALI Looks Like
              </span>
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-base">
              Take a quick look inside IMALI and see how your trading dashboard
              brings your account, automation, and market activity together.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-5xl">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl shadow-cyan-500/10">
              <video
                className="block h-auto w-full"
                controls
                playsInline
                preload="metadata"
              >
                <source src="/videos/imali-defi.MP4" type="video/mp4" />
                Your browser does not support video playback.
              </video>
            </div>

            <p className="mx-auto mt-4 max-w-2xl text-center text-xs leading-relaxed text-white/35">
              Product demonstration. Available features and account information
              can vary by connected service and plan.
            </p>
          </div>

          {/* OFFER */}
          <div className="mx-auto mt-12 max-w-3xl rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 p-7 text-center sm:p-10">

            <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-400">
              Start with IMALI
            </p>

            <h3 className="mt-3 text-3xl font-black sm:text-4xl">
              Put AI to Work on Your Trading
            </h3>

            <p className="mx-auto mt-4 max-w-xl text-white/55">
              Connect a supported trading account, choose your settings,
              and let IMALI help analyze opportunities and automate eligible trades.
            </p>

            <div className="mt-7 flex items-end justify-center gap-2">
              <span className="text-5xl font-black text-white">
                $19.95
              </span>
              <span className="mb-2 text-lg text-white/50">
                /month
              </span>
            </div>

            <Link
              to="/signup?plan=pro&tier=pro&product_type=trading"
              state={{
                tier: "pro",
                product_type: "trading",
                from: "home-video-demo",
              }}
              className="group mt-7 inline-flex w-full max-w-sm items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-8 py-4 text-lg font-extrabold text-slate-950 shadow-xl shadow-emerald-500/20 transition hover:scale-[1.02] hover:bg-emerald-400 sm:w-auto sm:min-w-[320px]"
            >
              Start Trading with IMALI
              <FaArrowRight className="transition group-hover:translate-x-1" />
            </Link>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/45">
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
                text: "Connect Robinhood Crypto, OKX, Alpaca, Kalshi, or your supported DEX wallet. Your funds stay in your connected account or wallet.",
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
            {["Robinhood Crypto", "OKX", "Alpaca", "Kalshi", "DEX"].map((provider) => (
              <div
                key={provider}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 font-semibold text-white/80"
              >
                {provider}
              </div>
            ))}
          </div>

          <p className="mx-auto mt-7 max-w-xl text-sm leading-relaxed text-white/45">
            IMALI connects to supported exchanges, brokerages, prediction markets,
            and compatible wallets without taking custody of your funds.
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
