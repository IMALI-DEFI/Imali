// src/pages/HowItWorks.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function HowItWorks() {
  const card =
    "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold">
            How IMALI Works
          </h1>

          <p className="mt-4 text-slate-600 text-sm sm:text-base font-semibold">
            Start trading in minutes. No experience needed.
          </p>
        </div>

        {/* Steps */}
        <div className="grid gap-5 mt-12 md:grid-cols-2">

          {/* Step 1 */}
          <div className={card}>
            <div className="text-indigo-600 font-extrabold text-sm mb-2">
              STEP 1
            </div>
            <h3 className="text-lg font-extrabold mb-2">
              Create Your Account
            </h3>
            <p className="text-slate-600 text-sm font-semibold">
              Sign up and choose your plan. You can start with paper trading using virtual money.
            </p>
          </div>

          {/* Step 2 */}
          <div className={card}>
            <div className="text-indigo-600 font-extrabold text-sm mb-2">
              STEP 2
            </div>
            <h3 className="text-lg font-extrabold mb-2">
              Connect Your Accounts
            </h3>
            <p className="text-slate-600 text-sm font-semibold mb-3">
              Link your exchange accounts so IMALI can trade for you.
            </p>

            <Link
              to="/funding-guide"
              className="text-indigo-600 font-bold text-sm hover:underline"
            >
              View Setup Guide →
            </Link>
          </div>

          {/* Step 3 */}
          <div className={card}>
            <div className="text-indigo-600 font-extrabold text-sm mb-2">
              STEP 3
            </div>
            <h3 className="text-lg font-extrabold mb-2">
              Choose a Strategy
            </h3>
            <p className="text-slate-600 text-sm font-semibold">
              Pick a trading style like Conservative, Balanced, or Momentum.
              You can change it anytime.
            </p>
          </div>

          {/* Step 4 */}
          <div className={card}>
            <div className="text-indigo-600 font-extrabold text-sm mb-2">
              STEP 4
            </div>
            <h3 className="text-lg font-extrabold mb-2">
              Start Trading
            </h3>
            <p className="text-slate-600 text-sm font-semibold">
              Turn on paper trading first, then go live when you're ready.
              IMALI will handle trades automatically.
            </p>
          </div>

        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <Link
            to="/signup"
            className="inline-block px-6 py-3 rounded-xl bg-indigo-600 text-white font-extrabold hover:bg-indigo-700 transition"
          >
            Get Started
          </Link>
        </div>

      </div>
    </div>
  );
}
