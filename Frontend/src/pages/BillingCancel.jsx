// src/pages/BillingCancel.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function BillingCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white px-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
          <span className="text-3xl">⚠️</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Canceled
        </h1>

        <p className="text-gray-600 mb-6">
          No worries — nothing was charged. You can try again anytime.
        </p>

        <div className="space-y-3">
          <Link
            to="/billing"
            className="block w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white py-3 font-semibold"
          >
            Try Again
          </Link>

          <Link
            to="/pricing"
            className="block w-full rounded-xl border border-gray-300 py-3 text-gray-700 hover:bg-gray-50"
          >
            View Plans
          </Link>

          <Link
            to="/trade-demo"
            className="block text-sm text-gray-500 hover:underline"
          >
            Back to Demo
          </Link>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          You can always practice in demo mode before going live.
        </p>
      </div>
    </div>
  );
}
