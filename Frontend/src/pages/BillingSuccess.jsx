import React, { useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";

/**
 * BillingSuccess
 * -----------------
 * Purpose:
 * - Confirm billing completion
 * - Force transition into Activation flow
 *
 * Rules:
 * - NEVER redirect to dashboard
 * - NEVER rely on query params
 * - NEVER rely on localStorage
 * - Activation page is the single source of truth
 */

export default function BillingSuccess() {
  const navigate = useNavigate();
  const redirectedRef = useRef(false);

  /* ------------------------------------------------------
   * Lock app into billing → activation flow
   * Prevents global guards from hijacking redirect
   * ---------------------------------------------------- */
  useEffect(() => {
    window.__IMALI_IN_BILLING_FLOW__ = true;

    const timer = setTimeout(() => {
      if (redirectedRef.current) return;
      redirectedRef.current = true;

      navigate("/activation", { replace: true });
    }, 6000); // mobile-friendly grace period

    return () => {
      clearTimeout(timer);
      delete window.__IMALI_IN_BILLING_FLOW__;
    };
  }, [navigate]);

  /* ------------------------------------------------------
   * Immediate manual continue (CTA)
   * ---------------------------------------------------- */
  const handleContinue = () => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;

    navigate("/activation", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-800 p-6 text-center">

        {/* Success Icon */}
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
        <button
          onClick={handleContinue}
          className="block w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-3 font-semibold transition"
        >
          Continue Setup
        </button>

        {/* Fallback hint */}
        <p className="mt-4 text-xs text-gray-500">
          You’ll be redirected automatically if you don’t continue.
        </p>

        {/* Hidden hard link fallback (edge cases / bots) */}
        <Link to="/activation" className="hidden">
          Activation
        </Link>
      </div>
    </div>
  );
}
