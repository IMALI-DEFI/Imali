// src/pages/BillingSuccess.jsx
import React, { useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function BillingSuccess() {
  const navigate = useNavigate();
  const redirectedRef = useRef(false);
  const { refreshActivation } = useAuth();

  useEffect(() => {
    const updateBillingStatus = async () => {
      try {
        // Force refresh activation status
        await refreshActivation();
        console.log("✅ Billing status refreshed");
      } catch (err) {
        console.warn("[BillingSuccess] Failed to refresh activation:", err);
      }
    };
    
    updateBillingStatus();

    const timer = setTimeout(() => {
      if (redirectedRef.current) return;
      redirectedRef.current = true;
      navigate("/activation", { replace: true, state: { fromBilling: true } });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate, refreshActivation]);

  const handleContinue = () => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    navigate("/activation", { replace: true, state: { fromBilling: true } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-950 to-black px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-8 text-center backdrop-blur-sm">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center animate-bounce">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          Payment Method Saved!
        </h1>

        <p className="text-gray-400 mb-6">
          Your billing setup is complete. Redirecting you to complete activation...
        </p>

        <div className="flex justify-center gap-2 mb-6">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-150" />
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-300" />
        </div>

        <button
          onClick={handleContinue}
          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-3 font-semibold transition"
        >
          Continue to Activation →
        </button>

        <p className="mt-4 text-xs text-gray-500">
          You'll be redirected automatically
        </p>

        <Link to="/activation" className="hidden">Activation</Link>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce { animation: bounce 0.5s ease-in-out infinite; }
        .delay-150 { animation-delay: 150ms; }
        .delay-300 { animation-delay: 300ms; }
      `}</style>
    </div>
  );
}
