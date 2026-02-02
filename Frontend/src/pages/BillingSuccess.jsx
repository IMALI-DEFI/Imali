// src/pages/BillingSuccess.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function BillingSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <span className="text-3xl">✅</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful
        </h1>

        <p className="text-gray-600 mb-6">
          Your plan is active. You’re officially unlocked for live trading
          features and rewards.
        </p>

        <div className="space-y-3">
          <Link
            to="/activation"
            className="block w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-3 font-semibold"
          >
            Continue Setup
          </Link>

          <Link
            to="/dashboard"
            className="block w-full rounded-xl border border-gray-300 py-3 text-gray-700 hover:bg-gray-50"
          >
            Go to Dashboard
          </Link>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Tip: Completing setup increases your confidence score and unlocks NFT
          rewards.
        </p>
      </div>
    </div>
  );
}
