import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

/**
 * BillingSuccess
 * -----------------
 * Purpose:
 * - Confirm billing completion
 * - Send user to Activation flow
 *
 * IMPORTANT:
 * - Do NOT rely on query params
 * - Do NOT rely on localStorage for tier/strategy
 * - Activation page pulls everything from backend
 */

export default function BillingSuccess() {
  const navigate = useNavigate();

  /* ---------------- Hard redirect safety ---------------- */
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/activation", { replace: true });
    }, 6000); // 6s grace (mobile-friendly)

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-800 p-6 text-center">

        {/* Icon */}
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <span className="text-2xl">✅</span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-white mb-2">
          Payment Method Saved
        </h1>

        {/* Message */}
        <p className="text-sm text-gray-400 mb-5 leading-relaxed">
          Your billing setup is complete.
          <br />
          Next, we’ll finish activating your account.
        </p>

        {/* CTA */}
        <Link
          to="/activation"
          className="block w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-3 font-semibold transition"
        >
          Continue Setup
        </Link>

        {/* Hint */}
        <p className="mt-4 text-xs text-gray-500">
          You’ll be redirected automatically if you don’t continue.
        </p>
      </div>
    </div>
  );
}
