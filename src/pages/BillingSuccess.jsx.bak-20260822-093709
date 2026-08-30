import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FaCheckCircle,
  FaArrowRight,
  FaShieldAlt,
} from "react-icons/fa";

const providers = [
  {
    name: "Robinhood Crypto",
    description: "Connect your Robinhood Crypto account.",
    path: "/connect-robinhood",
    icon: "🟢",
  },
  {
    name: "OKX",
    description: "Connect your OKX trading account.",
    path: "/connect-okx",
    icon: "🔷",
  },
  {
    name: "Alpaca",
    description: "Connect your Alpaca stock account.",
    path: "/connect-alpaca",
    icon: "📈",
  },
];

export default function BillingSuccess() {
  const { refreshActivation } = useAuth();

  useEffect(() => {
    refreshActivation().catch((err) => {
      console.warn("[BillingSuccess] Failed to refresh activation:", err);
    });
  }, [refreshActivation]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-5 py-14 sm:py-20">

        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <FaCheckCircle className="text-3xl text-emerald-400" />
          </div>

          <h1 className="mt-5 text-3xl font-black sm:text-4xl">
            You're In
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-white/55">
            Choose the trading account you want IMALI to connect to.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {providers.map((provider) => (
            <Link
              key={provider.name}
              to={provider.path}
              state={{ fromOnboarding: true }}
              className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-emerald-400/40 hover:bg-white/[0.07]"
            >
              <div className="text-4xl">{provider.icon}</div>

              <h2 className="mt-4 text-xl font-black">
                {provider.name}
              </h2>

              <p className="mt-2 min-h-[40px] text-sm text-white/50">
                {provider.description}
              </p>

              <div className="mt-5 flex items-center gap-2 font-bold text-emerald-400">
                Connect
                <FaArrowRight className="transition group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-white/40">
          <FaShieldAlt className="text-emerald-400" />
          Your funds remain in your trading account.
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/dashboard"
            className="text-sm text-white/40 underline transition hover:text-white/70"
          >
            I'll connect an account later
          </Link>
        </div>

      </div>
    </div>
  );
}
