// src/pages/Activation.jsx
import React, { useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

export default function Activation() {
  const navigate = useNavigate();
  const { user, activation, setActivation } = useAuth();

  const redirectLock = useRef(false);

  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const tier = useMemo(
    () => user?.tier?.toLowerCase() || "starter",
    [user]
  );

  const status = {
    billing: !!activation?.billing_complete,
    okx: !!activation?.okx_connected,
    alpaca: !!activation?.alpaca_connected,
    wallet: !!activation?.wallet_connected,
    trading: !!activation?.trading_enabled
  };

  const needs = {
    okx: ["starter", "pro", "bundle"].includes(tier),
    alpaca: ["starter", "bundle"].includes(tier),
    wallet: ["elite", "bundle"].includes(tier)
  };

  const connectionsDone =
    (!needs.okx || status.okx) &&
    (!needs.alpaca || status.alpaca) &&
    (!needs.wallet || status.wallet);

  const activationComplete =
    status.billing && connectionsDone && status.trading;

  // 🔥 SAFE REDIRECT (NO LOOP)
  if (activationComplete && !redirectLock.current) {
    redirectLock.current = true;
    navigate("/dashboard", { replace: true });
  }

  /* ================= CONNECTION HELPERS ================= */

  const refreshActivationOnly = async () => {
    const act = await BotAPI.activationStatus();
    const clean = act?.status || act;
    setActivation(clean);
  };

  const connectOKX = async (payload) => {
    try {
      setBusy("okx");
      await BotAPI.connectOKX(payload);
      await refreshActivationOnly();
      setSuccess("OKX connected");
    } catch (err) {
      setError("Failed to connect OKX");
    } finally {
      setBusy("");
    }
  };

  const connectAlpaca = async (payload) => {
    try {
      setBusy("alpaca");
      await BotAPI.connectAlpaca(payload);
      await refreshActivationOnly();
      setSuccess("Alpaca connected");
    } catch {
      setError("Failed to connect Alpaca");
    } finally {
      setBusy("");
    }
  };

  const connectWallet = async (address) => {
    try {
      setBusy("wallet");
      await BotAPI.connectWallet({ address });
      await refreshActivationOnly();
      setSuccess("Wallet connected");
    } catch {
      setError("Wallet connection failed");
    } finally {
      setBusy("");
    }
  };

  const toggleTrading = async () => {
    try {
      setBusy("trading");
      await BotAPI.toggleTrading(!status.trading);
      await refreshActivationOnly();
      setSuccess("Trading updated");
    } catch {
      setError("Failed to update trading");
    } finally {
      setBusy("");
    }
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-3xl mx-auto space-y-8">

        <h1 className="text-3xl font-bold">
          Finish Setup
        </h1>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded">
            {success}
          </div>
        )}

        {/* BILLING */}
        {!status.billing && (
          <div className="p-6 bg-white/5 border border-white/10 rounded">
            <p>Add payment method to continue.</p>
            <button
              onClick={() => navigate("/billing")}
              className="mt-4 px-4 py-2 bg-blue-600 rounded"
            >
              Go To Billing
            </button>
          </div>
        )}

        {/* CONNECTIONS */}
        {status.billing && !connectionsDone && (
          <div className="p-6 bg-white/5 border border-white/10 rounded">
            <p>Connect required accounts for your tier.</p>
          </div>
        )}

        {/* TRADING */}
        {status.billing && connectionsDone && (
          <div className="p-6 bg-white/5 border border-white/10 rounded">
            <button
              onClick={toggleTrading}
              disabled={busy === "trading"}
              className="px-6 py-2 bg-green-600 rounded"
            >
              {status.trading ? "Disable Trading" : "Enable Trading"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
