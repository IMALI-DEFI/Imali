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
    icon: "🟢",
    path: "/connect-robinhood",
    text: "Connect your Robinhood Crypto account.",
  },
  {
    name: "OKX",
    icon: "🔷",
    path: "/connect-okx",
    text: "Connect your OKX account.",
  },
  {
    name: "Alpaca",
    icon: "📈",
    path: "/connect-alpaca",
    text: "Connect your Alpaca stock account.",
  },
];

export default function BillingSuccess() {
  const { refreshActivation } = useAuth();

  useEffect(() => {
    refreshActivation().catch((err) => {
      console.warn("[BillingSuccess] refresh failed:", err);
    });
  }, [refreshActivation]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <main className="mx-auto max-w-4xl px-5 py-16 sm:py-20">

        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <FaCheckCircle className="text-3xl text-emerald-400" />
          </div>

          <h1 className="mt-5 text-3xl font-black sm:text-4xl">
            Payment Complete
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-white/55">
            One last step: choose the account you want IMALI to trade through.
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

              <p className="mt-2 text-sm text-white/50">
                {provider.text}
              </p>

              <div className="mt-5 flex items-center gap-2 font-bold text-emerald-400">
                Connect
                <FaArrowRight className="transition group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex justify-center gap-2 text-xs text-white/40">
          <FaShieldAlt className="text-emerald-400" />
          Your funds remain in your trading account.
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/dashboard"
            className="text-sm text-white/40 underline hover:text-white/70"
          >
            Connect an account later
          </Link>
        </div>

      </main>
    </div>
  );
}
