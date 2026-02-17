// src/pages/Activation.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Activation() {
  const card =
    "rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">

        <h1 className="text-3xl md:text-4xl font-extrabold text-center">
          Let’s Finish Setting Up Your Account
        </h1>

        <p className="text-center text-gray-300 mt-4">
          You’re almost ready to trade. Just complete these simple steps.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mt-10">

          {/* Step 1 */}
          <div className={card}>
            <h3 className="text-lg font-bold mb-3">Step 1: Complete Billing</h3>
            <p className="text-sm text-gray-300 mb-4">
              Choose your plan so your account can activate.
            </p>
            <Link
              to="/billing"
              className="inline-block px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold"
            >
              Go To Billing
            </Link>
          </div>

          {/* Step 2 */}
          <div className={card}>
            <h3 className="text-lg font-bold mb-3">
              Step 2: Connect Exchange or Wallet
            </h3>
            <p className="text-sm text-gray-300 mb-4">
              Connect OKX, Alpaca, or your crypto wallet.
            </p>
            <Link
              to="/funding-guide"
              className="inline-block px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold"
            >
              Open Funding Guide
            </Link>
          </div>

          {/* Step 3 */}
          <div className={card}>
            <h3 className="text-lg font-bold mb-3">
              Step 3: Enable Trading
            </h3>
            <p className="text-sm text-gray-300 mb-4">
              Turn trading on from your dashboard.
            </p>
            <Link
              to="/dashboard"
              className="inline-block px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 font-semibold"
            >
              Go To Dashboard
            </Link>
          </div>

          {/* Help */}
          <div className={card}>
            <h3 className="text-lg font-bold mb-3">Need Help?</h3>
            <p className="text-sm text-gray-300 mb-4">
              If you’re unsure what to do, follow the beginner guide.
            </p>
            <Link
              to="/how-it-works"
              className="inline-block px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 font-semibold"
            >
              Read How It Works
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
