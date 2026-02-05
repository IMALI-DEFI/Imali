// src/pages/BillingSuccess.jsx
import React, { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function BillingSuccess() {
  const navigate = useNavigate();

  // Pull last selected plan / strategy safely
  const { plan, strategy } = useMemo(() => {
    let p = "starter";
    let s = "ai_weighted";

    try {
      p = localStorage.getItem("imali_plan") || p;
      s = localStorage.getItem("imali_strategy") || s;
    } catch {
      // ignore storage issues
    }

    return { plan: p, strategy: s };
  }, []);

  const activationLink = `/activation?tier=${encodeURIComponent(
    plan
  )}&strategy=${encodeURIComponent(strategy)}`;

  // Optional auto-redirect safety (prevents dead-end tab)
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(activationLink, { replace: true });
    }, 15000); // 15s grace

    return () => clearTimeout(timer);
  }, [activationLink, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <span className="text-3xl">✅</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Billing Complete
        </h1>

        {/* Message */}
        <p className="text-gray-600 mb-6">
          Your payment method was saved successfully.
          <br />
          One last step to finish setup.
        </p>

        {/* Primary CTA */}
        <Link
          to={activationLink}
          className="block w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-3 font-semibold transition"
        >
          Continue Setup
        </Link>

        {/* Info */}
        <div className="mt-5 text-xs text-gray-500 space-y-1">
          <div>
            <span className="font-semibold">Plan:</span>{" "}
            <span className="capitalize">{plan}</span>
          </div>
          <div>
            <span className="font-semibold">Strategy:</span>{" "}
            <span className="capitalize">{strategy.replace("_", " ")}</span>
          </div>
        </div>

        {/* Footer hint */}
        <p className="mt-6 text-xs text-gray-400">
          You’ll be redirected automatically if you don’t continue.
        </p>
      </div>
    </div>
  );
}
