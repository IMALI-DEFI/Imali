// src/pages/Activation.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotAPI, { api } from "../utils/BotAPI";

/* ======================================================
   STATUS STYLES
====================================================== */

const STATUS_STYLES = {
  complete: {
    ring: "border-emerald-500/30 bg-emerald-500/20",
    text: "text-emerald-400",
    badge: "bg-emerald-500/20 text-emerald-400",
    icon: "✓",
  },
  pending: {
    ring: "border-gray-700 bg-gray-800/50",
    text: "text-gray-400",
    badge: "bg-gray-800 text-gray-400",
    icon: "○",
  },
};

/* ======================================================
   STEP COMPONENT
====================================================== */

function StatusStep({
  number,
  title,
  description,
  status = "pending",
  actionLabel,
  onAction,
}) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;

  return (
    <div className="relative pl-14 py-4">
      <div className="absolute left-[27px] top-0 bottom-0 w-0.5 bg-gray-800" />

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
            {status === "complete" ? "Complete" : "Pending"}
          </span>
        </div>

        <p className="text-gray-400 text-sm">{description}</p>

        {actionLabel && status !== "complete" && (
          <button
            onClick={onAction}
            className="mt-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/* ======================================================
   MAIN
====================================================== */

export default function Activation() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");

  /* =========================
     LOAD USER + STATUS
  ========================= */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const me = await BotAPI.me();
        if (!mounted) return;

        const userObj = me?.user || me;
        setUser(userObj);

        const act = await BotAPI.activationStatus();
        if (!mounted) return;

        const activation = act?.status || act || {};
        setStatus(activation);

        // 🔥 HARD ROUTING LOGIC

        // If billing not complete → force billing
        if (!activation.billing_complete) {
          navigate("/billing", { replace: true });
          return;
        }

        // If fully activated → go to dashboard
        if (activation.activation_complete) {
          navigate("/dashboard", { replace: true });
          return;
        }

      } catch (err) {
        // 401 already handled globally by interceptor
        setError("Unable to load activation status.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  /* =========================
     TOGGLES
  ========================= */

  const toggleTrading = async () => {
    try {
      await api.post("/api/trading/enable", {
        enabled: !status?.trading_enabled,
      });

      const updated = await BotAPI.activationStatus();
      setStatus(updated?.status || updated || {});
    } catch {
      setError("Failed to update trading.");
    }
  };

  /* =========================
     STATES
  ========================= */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Loading activation…
      </div>
    );
  }

  if (!user || !status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Session expired.
      </div>
    );
  }

  const billing = !!status.billing_complete;
  const connections =
    !!status.okx_connected ||
    !!status.alpaca_connected ||
    !!status.wallet_connected;
  const trading = !!status.trading_enabled;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            {error}
          </div>
        )}

        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 space-y-4">

          <StatusStep
            number={1}
            title="Billing"
            description="Add a payment method"
            status={billing ? "complete" : "pending"}
            actionLabel="Go to Billing"
            onAction={() => navigate("/billing")}
          />

          <StatusStep
            number={2}
            title="Connections"
            description="Connect exchanges or wallet"
            status={connections ? "complete" : "pending"}
            actionLabel="Connect"
            onAction={() => navigate("/connections")}
          />

          <StatusStep
            number={3}
            title="Enable Trading"
            description="Start automated trading"
            status={trading ? "complete" : "pending"}
            actionLabel={trading ? "Disable" : "Enable"}
            onAction={toggleTrading}
          />

        </div>
      </div>
    </div>
  );
}
