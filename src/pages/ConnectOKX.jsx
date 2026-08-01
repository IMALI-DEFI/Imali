// src/pages/ConnectOKX.jsx
import React, { useCallback, useEffect, useState } from "react";
import BotAPI from "../utils/BotAPI";
import {
  FaCheckCircle,
  FaPlug,
  FaExchangeAlt,
  FaSyncAlt,
  FaTrash,
  FaSpinner,
} from "react-icons/fa";

export default function ConnectOKX() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Form state
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [mode, setMode] = useState("live");

  const loadStatus = useCallback(async () => {
    try {
      const integration = await BotAPI.getIntegrationStatus(true);
      const balance = await BotAPI.getExchangeBalance(true);

      setStatus({
        connected: integration.okx_connected,
        mode: integration.okx_mode,
        key: integration.okx_api_key_masked,
        balance: balance.okx_total,
        available: balance.okx_available_usdt,
      });
    } catch (err) {
      setMessage("Failed to load OKX status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleConnect = async () => {
    if (!apiKey || !secretKey || !passphrase) {
      setMessage("All fields are required");
      return;
    }
    setActionLoading(true);
    setMessage("");
    try {
      const res = await BotAPI.connectOKX({
        api_key: apiKey,
        secret_key: secretKey,
        passphrase,
        mode,
      });
      if (res.success) {
        setMessage("OKX connected successfully!");
        setApiKey("");
        setSecretKey("");
        setPassphrase("");
        await loadStatus();
      } else {
        setMessage(res.error || "Connection failed");
      }
    } catch (err) {
      setMessage(err.message || "Connection failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect OKX?")) return;
    setActionLoading(true);
    setMessage("");
    try {
      const res = await BotAPI.disconnectOKX();
      if (res.success) {
        setMessage("OKX disconnected");
        await loadStatus();
      } else {
        setMessage(res.error || "Disconnect failed");
      }
    } catch (err) {
      setMessage(err.message || "Disconnect failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleMode = async () => {
    const newMode = status.mode === "live" ? "paper" : "live";
    setActionLoading(true);
    setMessage("");
    try {
      const res = await BotAPI.switchExchangeMode("okx", newMode);
      if (res.success) {
        setMessage(`Switched to ${newMode.toUpperCase()} mode`);
        await loadStatus();
      } else {
        setMessage(res.error || "Mode switch failed");
      }
    } catch (err) {
      setMessage(err.message || "Mode switch failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-4xl font-black">Connect OKX</h1>

        {/* Status Card */}
        <div className="rounded-3xl bg-white/5 p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            {status.connected ? (
              <FaCheckCircle className="text-emerald-400 text-2xl" />
            ) : (
              <FaPlug className="text-yellow-400 text-2xl" />
            )}
            <span className="text-xl font-bold">
              {status.connected ? "Connected" : "Not Connected"}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <p>API Key: {status.key || "—"}</p>
            <p>Mode: {status.mode?.toUpperCase()}</p>
            <p>Total Balance: ${status.balance?.toFixed(2) || "0.00"}</p>
            <p>Available USDT: ${status.available?.toFixed(2) || "0.00"}</p>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={loadStatus}
              disabled={actionLoading}
              className="bg-white/10 hover:bg-white/20 px-5 py-3 rounded-xl font-bold transition"
            >
              <FaSyncAlt className="inline mr-2" />
              Refresh
            </button>

            {status.connected && (
              <>
                <button
                  onClick={handleToggleMode}
                  disabled={actionLoading}
                  className="bg-cyan-600 hover:bg-cyan-700 px-5 py-3 rounded-xl font-bold transition"
                >
                  <FaExchangeAlt className="inline mr-2" />
                  Switch to {status.mode === "live" ? "Paper" : "Live"}
                </button>

                <button
                  onClick={handleDisconnect}
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700 px-5 py-3 rounded-xl font-bold transition"
                >
                  <FaTrash className="inline mr-2" />
                  Disconnect
                </button>
              </>
            )}
          </div>

          {message && (
            <div className={`mt-4 p-3 rounded-xl text-sm font-medium ${
              message.includes("success") || message.includes("Success")
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-red-500/20 text-red-300"
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Connection Form */}
        <div className="rounded-3xl bg-white/5 p-6 border border-white/10">
          <h2 className="text-2xl font-bold mb-4">
            {status.connected ? "Update API Keys" : "Connect New API Key"}
          </h2>
          <p className="text-white/50 mb-6 text-sm">
            Get your API key from{" "}
            <a
              href="https://www.okx.com/account/my-api"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 underline"
            >
              OKX API Management
            </a>
            . Required permissions: <strong>Read</strong> and <strong>Trade</strong>.
          </p>

          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-1">API Key</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your OKX API key"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Secret Key</label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Enter your OKX secret key"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Passphrase</label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter your OKX passphrase"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Trading Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="live">Live Trading</option>
                <option value="paper">Paper Trading</option>
              </select>
            </div>

            <button
              onClick={handleConnect}
              disabled={actionLoading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 px-6 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <FaPlug />
              )}
              {status.connected ? "Update Keys" : "Connect OKX"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}