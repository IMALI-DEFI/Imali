// src/pages/Activation.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import BotAPI from "../utils/BotAPI";
import { useAuth } from '../contexts/AuthContext';
/* ======================================================
   TAILWIND-SAFE STATUS MAPS
====================================================== */

const STATUS_STYLES = {
  complete: {
    ring: "border-emerald-500/30 bg-emerald-500/20",
    text: "text-emerald-400",
    badge: "bg-emerald-500/20 text-emerald-400",
    icon: "✓",
  },
  active: {
    ring: "border-blue-500/30 bg-blue-500/20",
    text: "text-blue-400",
    badge: "bg-blue-500/20 text-blue-400",
    icon: "⟳",
  },
  pending: {
    ring: "border-gray-700 bg-gray-800/50",
    text: "text-gray-400",
    badge: "bg-gray-800 text-gray-400",
    icon: "○",
  },
  error: {
    ring: "border-red-500/30 bg-red-500/20",
    text: "text-red-400",
    badge: "bg-red-500/20 text-red-400",
    icon: "!",
  },
};

/* ======================================================
   UI COMPONENTS
====================================================== */

function StatusStep({
  number,
  title,
  description,
  status = "pending",
  actionLabel,
  onAction,
  disabled,
}) {
  const s = STATUS_STYLES[status];

  return (
    <div className="relative pl-14 py-4 group">
      <div className="absolute left-[27px] top-0 bottom-0 w-0.5 bg-gray-800 group-last:hidden" />

      <div
        className={`absolute left-0 h-14 w-14 rounded-full border-2 ${s.ring} flex items-center justify-center`}
      >
        <span className={`${s.text} font-semibold text-lg`}>
          {status === "complete" ? s.icon : number}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white text-lg">{title}</h3>
          <span className={`text-sm px-3 py-1 rounded-full ${s.badge}`}>
            {status === "complete"
              ? "Complete"
              : status === "active"
              ? "In Progress"
              : status === "error"
              ? "Error"
              : "Pending"}
          </span>
        </div>

        <p className="text-gray-400 text-sm">{description}</p>

        {actionLabel && status !== "complete" && (
          <button
            onClick={onAction}
            disabled={disabled}
            className={`mt-2 px-4 py-2 rounded-lg font-medium transition ${
              disabled
                ? "opacity-50 cursor-not-allowed"
                : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
            }`}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/* ======================================================
   MAIN COMPONENT
====================================================== */

export default function Activation() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showOkx, setShowOkx] = useState(false);
  const [showAlpaca, setShowAlpaca] = useState(false);
  const [showWallet, setShowWallet] = useState(false);

  /* ---------------- LOAD ---------------- */
  const load = async () => {
    try {
      const userRes = await BotAPI.me();
      const actRes = await BotAPI.activationStatus();

      setMe(userRes?.user || userRes);
      setStatus(actRes?.status || actRes);
    } catch (err) {
      if (err.status === 401) {
        BotAPI.logout();
        navigate("/login");
      } else {
        setError(err.message || "Failed to load activation");
      }
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  /* ---------------- DERIVED ---------------- */
  const tier = (me?.tier || "starter").toLowerCase();

  const billing = !!status?.billing_complete;
  const okx = !!status?.okx_connected;
  const alpaca = !!status?.alpaca_connected;
  const wallet = !!status?.wallet_connected;
  const trading = !!status?.trading_enabled;
  const complete = !!status?.activation_complete;

  /* ---------------- AUTO REDIRECT ---------------- */
  useEffect(() => {
    if (!loading && complete && trading) {
      setTimeout(() => navigate("/members", { replace: true }), 1200);
    }
  }, [loading, complete, trading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Loading activation…
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Link to="/login" className="text-blue-400 underline">
          Session expired — log in again
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
            {success}
          </div>
        )}

        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <StatusStep
            number={1}
            title="Billing"
            description="Add a payment method"
            status={billing ? "complete" : "active"}
            actionLabel="Go to Billing"
            onAction={() => navigate("/billing")}
          />

          <StatusStep
            number={2}
            title="Connections"
            description="Connect exchanges or wallet"
            status={
              tier === "starter"
                ? okx && alpaca
                  ? "complete"
                  : "pending"
                : tier === "elite"
                ? wallet
                  ? "complete"
                  : "pending"
                : okx || alpaca || wallet
                ? "complete"
                : "pending"
            }
            actionLabel="Connect"
            onAction={() => {
              if (tier === "elite") setShowWallet(true);
              else setShowOkx(true);
            }}
          />

          <StatusStep
            number={3}
            title="Enable Trading"
            description="Start automated trading"
            status={trading ? "complete" : "pending"}
            actionLabel={trading ? "Disable" : "Enable"}
            onAction={() =>
              BotAPI.tradingEnable(!trading).then(load)
            }
          />
        </div>
      </div>
    </div>
  );
}
