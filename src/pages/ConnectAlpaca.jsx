import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotAPI from "../utils/BotAPI";
import {
  FaArrowRight,
  FaCheckCircle,
  FaExternalLinkAlt,
  FaShieldAlt,
  FaSpinner,
} from "react-icons/fa";

const ALPACA_API_URL = "https://app.alpaca.markets/";

export default function ConnectAlpaca() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("");

  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      const integration = await BotAPI.getIntegrationStatus(true);
      setConnected(Boolean(integration?.alpaca_connected));
    } catch (err) {
      setMessage(err.message || "Could not check Alpaca connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleConnect = async () => {
    if (!apiKey.trim() || !secretKey.trim()) {
      setMessage("Enter your Alpaca API key and secret key.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const res = await BotAPI.connectAlpaca({
        apiKey: apiKey.trim(),
        secretKey: secretKey.trim(),
        mode: "live",
      });

      if (res?.success === false) {
        setMessage(res.error || res.message || "Alpaca connection failed.");
        return;
      }

      setApiKey("");
      setSecretKey("");
      setConnected(true);
      setMessage("");
    } catch (err) {
      setMessage(err.message || "Alpaca connection failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 grid place-items-center text-white">
        <FaSpinner className="animate-spin text-4xl text-cyan-400" />
      </div>
    );
  }

  if (connected) {
    return (
      <div className="min-h-screen bg-slate-950 text-white grid place-items-center px-5">
        <div className="w-full max-w-md rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.06] p-8 text-center">
          <FaCheckCircle className="mx-auto text-5xl text-emerald-400" />

          <h1 className="mt-5 text-3xl font-black">
            Alpaca Connected
          </h1>

          <p className="mt-3 text-white/55">
            IMALI is ready to use your Alpaca trading connection.
          </p>

          <button
            onClick={() => navigate("/dashboard")}
            className="mt-7 w-full rounded-xl bg-emerald-500 py-4 font-black text-slate-950 hover:bg-emerald-400"
          >
            Go to Dashboard <FaArrowRight className="inline ml-2" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-5 py-12">
      <main className="mx-auto max-w-xl">

        <div className="text-center">
          <div className="text-5xl">📈</div>
          <h1 className="mt-4 text-3xl font-black">Connect Alpaca</h1>

          <p className="mt-3 text-white/55">
            Create your Alpaca API keys and paste them below.
          </p>

          <a
            href={ALPACA_API_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 font-bold text-cyan-400 hover:text-cyan-300"
          >
            Open Alpaca API Settings
            <FaExternalLinkAlt />
          </a>
        </div>

        <div className="mt-8 space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <Input
            label="API Key"
            value={apiKey}
            onChange={setApiKey}
            placeholder="Paste API key"
          />

          <Input
            label="Secret Key"
            value={secretKey}
            onChange={setSecretKey}
            placeholder="Paste secret key"
            secret
          />

          {message && (
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">
              {message}
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={saving}
            className="w-full rounded-xl bg-emerald-500 py-4 font-black text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {saving ? "Connecting..." : "Connect & Continue"}
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-white/35">
            <FaShieldAlt className="text-emerald-400" />
            Your credentials are sent only to your authenticated IMALI account.
          </div>
        </div>

      </main>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, secret = false }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-white/70">
        {label}
      </span>

      <input
        type={secret ? "password" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck="false"
        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-white/25 outline-none focus:border-emerald-400"
      />
    </label>
  );
}
