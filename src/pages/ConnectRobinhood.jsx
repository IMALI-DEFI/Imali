// src/pages/ConnectRobinhood.jsx
import React, { useCallback, useEffect, useState } from "react";
import BotAPI from "../utils/BotAPI";
import {
  FaCheckCircle,
  FaPlug,
  FaSyncAlt,
  FaTrash,
  FaSpinner,
  FaShieldAlt,
  FaKey,
} from "react-icons/fa";

export default function ConnectRobinhood() {
  const [status, setStatus] = useState({
    connected: false,
    key: "",
    connectedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const [apiKey, setApiKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      const robinhood = await BotAPI.getRobinhoodStatus(true);

      setStatus({
        connected: !!robinhood.connected,
        key: robinhood.api_key_masked || "",
        connectedAt: robinhood.connected_at || null,
      });
    } catch (err) {
      setMessageType("error");
      setMessage(err.message || "Failed to load Robinhood status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleConnect = async () => {
    const cleanApiKey = apiKey.trim();
    const cleanPrivateKey = privateKey.trim();

    if (!cleanApiKey || !cleanPrivateKey) {
      setMessageType("error");
      setMessage("API key and private key are required");
      return;
    }

    setActionLoading(true);
    setMessage("");

    try {
      const res = await BotAPI.connectRobinhood({
        api_key: cleanApiKey,
        private_key: cleanPrivateKey,
      });

      if (res?.success) {
        setMessageType("success");
        setMessage("Robinhood connected successfully!");
        setApiKey("");
        setPrivateKey("");
        await loadStatus();
      } else {
        setMessageType("error");
        setMessage(res?.error || res?.message || "Connection failed");
      }
    } catch (err) {
      setMessageType("error");
      setMessage(err.message || "Connection failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect Robinhood?")) {
      return;
    }

    setActionLoading(true);
    setMessage("");

    try {
      const res = await BotAPI.disconnectRobinhood();

      if (res?.success) {
        setMessageType("success");
        setMessage("Robinhood disconnected");
        await loadStatus();
      } else {
        setMessageType("error");
        setMessage(res?.error || res?.message || "Disconnect failed");
      }
    } catch (err) {
      setMessageType("error");
      setMessage(err.message || "Disconnect failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300 mb-3">
            <span>🪶</span>
            Robinhood Crypto
          </div>

          <h1 className="text-4xl font-black">Connect Robinhood</h1>

          <p className="mt-2 text-white/55 max-w-2xl">
            Connect your Robinhood Crypto API credentials so IMALI can use your
            existing Robinhood account for supported crypto trading.
          </p>
        </div>

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

          <div className="space-y-2 text-sm text-white/70">
            <p>
              API Key:{" "}
              <span className="text-white">{status.key || "—"}</span>
            </p>
            <p>
              Connection:{" "}
              <span className="text-white">
                {status.connected ? "Robinhood Crypto API" : "—"}
              </span>
            </p>
            {status.connectedAt && (
              <p>
                Connected:{" "}
                <span className="text-white">
                  {new Date(status.connectedAt).toLocaleString()}
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              type="button"
              onClick={loadStatus}
              disabled={actionLoading}
              className="bg-white/10 hover:bg-white/20 px-5 py-3 rounded-xl font-bold transition disabled:opacity-50"
            >
              <FaSyncAlt className="inline mr-2" />
              Refresh
            </button>

            {status.connected && (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 px-5 py-3 rounded-xl font-bold transition disabled:opacity-50"
              >
                <FaTrash className="inline mr-2" />
                Disconnect
              </button>
            )}
          </div>

          {message && (
            <div
              className={`mt-4 p-3 rounded-xl text-sm font-medium ${
                messageType === "success"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : messageType === "error"
                  ? "bg-red-500/20 text-red-300"
                  : "bg-cyan-500/20 text-cyan-200"
              }`}
            >
              {message}
            </div>
          )}
        </div>

        {/* Connection Form */}
        <div className="rounded-3xl bg-white/5 p-6 border border-white/10">
          <h2 className="text-2xl font-bold mb-2">
            {status.connected
              ? "Update Robinhood Credentials"
              : "Connect Robinhood Crypto"}
          </h2>

          <p className="text-white/50 mb-6 text-sm">
            Create a Robinhood Crypto API key pair, then paste the API key and
            private key below. IMALI stores the credentials encrypted on the
            server.
          </p>

          <div className="grid md:grid-cols-3 gap-3 mb-6">
            <div className="rounded-2xl bg-black/25 border border-white/10 p-4">
              <FaKey className="text-emerald-400 mb-2" />
              <p className="font-bold text-sm">API Key</p>
              <p className="text-xs text-white/45 mt-1">
                Use the key created in Robinhood Crypto API settings.
              </p>
            </div>

            <div className="rounded-2xl bg-black/25 border border-white/10 p-4">
              <FaShieldAlt className="text-emerald-400 mb-2" />
              <p className="font-bold text-sm">Private Key</p>
              <p className="text-xs text-white/45 mt-1">
                Keep this secret and only submit it through the secure IMALI form.
              </p>
            </div>

            <div className="rounded-2xl bg-black/25 border border-white/10 p-4">
              <FaCheckCircle className="text-emerald-400 mb-2" />
              <p className="font-bold text-sm">Trading Access</p>
              <p className="text-xs text-white/45 mt-1">
                Enable the crypto account, holdings, products, quotes, orders,
                and order-placement access needed for automation.
              </p>
            </div>
          </div>

          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium mb-1">
                Robinhood API Key
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Robinhood API key"
                autoComplete="off"
                spellCheck="false"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Private Key
              </label>
              <textarea
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="Paste your Robinhood private key"
                rows={6}
                autoComplete="off"
                spellCheck="false"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500 font-mono text-xs"
              />
            </div>

            <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-xs text-amber-100">
              Do not share these credentials by email, chat, or support message.
              Enter them only in your authenticated IMALI connection page.
            </div>

            <button
              type="button"
              onClick={handleConnect}
              disabled={actionLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 px-6 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <FaPlug />
              )}
              {status.connected
                ? "Update Robinhood Connection"
                : "Connect Robinhood"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
