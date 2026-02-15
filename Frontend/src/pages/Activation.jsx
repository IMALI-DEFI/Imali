// src/pages/Activation.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotAPI from "../utils/BotAPI";
import { api } from "../utils/BotAPI";

export default function Activation() {
  const nav = useNavigate();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  /* =========================
     LOAD STATUS
  ========================= */

  const loadStatus = async () => {
    try {
      const res = await BotAPI.activationStatus();
      const s = res?.status || res || {};
      setStatus(s);
    } catch {
      setBanner({
        type: "error",
        message: "Unable to load your setup progress.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  /* =========================
     HELPERS
  ========================= */

  const progressCount = [
    status?.wallet_connected,
    status?.okx_connected,
    status?.alpaca_connected,
  ].filter(Boolean).length;

  const progressPercent = Math.round((progressCount / 3) * 100);

  const goDashboard = () => nav("/memberdashboard");

  /* =========================
     STATES
  ========================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Checking your setup...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto p-6 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Finish Your Setup</h1>
          <p className="text-white/60 mt-1">
            Complete these steps so your bot can trade safely.
          </p>
        </div>

        {/* Progress */}
        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
          <div className="text-sm text-white/60 mb-2">
            Setup Progress: {progressPercent}%
          </div>
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-2"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <Step
          complete={status?.wallet_connected}
          title="Verify Wallet Ownership"
          description="Confirm you own the wallet connected to your account."
        />

        <Step
          complete={status?.okx_connected}
          title="Connect Your Crypto Account"
          description="Allow your bot to trade crypto futures safely."
        />

        <Step
          complete={status?.alpaca_connected}
          title="Connect Your Stock Account"
          description="Enable stock trading (paper or live)."
        />

        {/* Footer Actions */}
        <div className="pt-4 flex justify-between items-center">
          <button
            onClick={goDashboard}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl"
          >
            Back to Dashboard
          </button>

          {progressPercent === 100 && (
            <button
              onClick={goDashboard}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold"
            >
              Setup Complete → Start Trading
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================
   STEP COMPONENT
========================= */

function Step({ complete, title, description }) {
  return (
    <div
      className={`p-4 rounded-xl border ${
        complete
          ? "bg-emerald-600/10 border-emerald-500/40"
          : "bg-white/5 border-white/10"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-sm text-white/60 mt-1">
            {description}
          </div>
        </div>

        <div className="text-xl">
          {complete ? "✅" : "⬜"}
        </div>
      </div>
    </div>
  );
}
