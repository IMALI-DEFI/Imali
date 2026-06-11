import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotAPI from "../utils/BotAPI";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPlug,
  FaRedo,
  FaSyncAlt,
  FaTrash,
  FaKey,
  FaWallet,
} from "react-icons/fa";

export default function ConnectAlpaca() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({
    connected: false,
    mode: "paper",
    keyMasked: "",
    balance: 0,
    available: 0,
  });

  const [form, setForm] = useState({
    apiKey: "",
    secretKey: "",
    mode: "paper",
  });

  const loadStatus = async () => {
    setLoading(true);

    const integration = await BotAPI.getIntegrationStatus?.(true);
    const balance = await BotAPI.getExchangeBalance?.(true);

    setStatus({
      connected: Boolean(integration?.alpaca_connected),
      mode: integration?.alpaca_mode || "paper",
      keyMasked: integration?.alpaca_api_key_masked || "",
      balance: Number(balance?.alpaca_total || 0),
      available: Number(balance?.alpaca_available_usd || balance?.alpaca_available_usdt || 0),
    });

    setForm((prev) => ({
      ...prev,
      mode: integration?.alpaca_mode || "paper",
    }));

    setLoading(false);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSave = async () => {
    if (!form.apiKey || !form.secretKey) {
      alert("Enter Alpaca API key and secret key.");
      return;
    }

    setSaving(true);

    const res = await BotAPI.connectAlpaca?.({
      apiKey: form.apiKey,
      secretKey: form.secretKey,
      mode: form.mode,
    });

    setSaving(false);

    if (res?.success === false) {
      alert(res.error || "Failed to connect Alpaca.");
      return;
    }

    await loadStatus();
    alert("Alpaca connected successfully.");
  };

  const handleTest = async () => {
    setTesting(true);
    await loadStatus();
    setTesting(false);
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect Alpaca API keys?")) return;

    const res = await BotAPI.disconnectAlpaca?.();

    if (res?.success === false) {
      alert(res.error || "Failed to disconnect Alpaca.");
      return;
    }

    await loadStatus();
  };

  const handleModeChange = async (mode) => {
    setForm((prev) => ({ ...prev, mode }));

    if (status.connected) {
      await BotAPI.switchExchangeMode?.("alpaca", mode);
      await loadStatus();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] text-white grid place-items-center">
        <FaSyncAlt className="animate-spin text-4xl text-cyan-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white pb-10">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.10),transparent_35%)]" />

      <main className="relative mx-auto max-w-4xl px-4 py-6 space-y-5">
        <button onClick={() => navigate("/dashboard")} className="text-white/60 hover:text-white">
          <FaArrowLeft className="inline mr-2" />
          Back to Dashboard
        </button>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h1 className="text-3xl font-black">Connect Alpaca</h1>
          <p className="mt-2 text-white/50">
            Used for Stocks trading.
          </p>

          <div
            className={`mt-6 rounded-2xl border p-4 ${
              status.connected
                ? "border-emerald-400/30 bg-emerald-400/10"
                : "border-yellow-400/30 bg-yellow-400/10"
            }`}
          >
            <div className="flex items-start gap-3">
              {status.connected ? (
                <FaCheckCircle className="mt-1 text-emerald-300" />
              ) : (
                <FaExclamationTriangle className="mt-1 text-yellow-300" />
              )}

              <div>
                <h2 className="font-black">
                  {status.connected ? "Alpaca Connected" : "Alpaca Not Connected"}
                </h2>
                <p className="text-sm text-white/60">
                  {status.connected
                    ? `API Key: ${status.keyMasked || "Saved"}`
                    : "Connect or reconnect Alpaca to activate stock bots."}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <InfoCard icon={<FaWallet />} label="Portfolio Value" value={`$${status.balance.toFixed(2)}`} />
            <InfoCard icon={<FaWallet />} label="Available Cash" value={`$${status.available.toFixed(2)}`} />
            <InfoCard icon={<FaKey />} label="Mode" value={status.mode.toUpperCase()} />
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-xl font-black">API Setup</h2>
          <p className="mt-1 text-sm text-white/50">
            Start with Alpaca paper mode before enabling live stock trading.
          </p>

          <div className="mt-5 grid gap-4">
            <Input
              label="Alpaca API Key"
              value={form.apiKey}
              onChange={(v) => setForm((p) => ({ ...p, apiKey: v }))}
              placeholder="Enter Alpaca API key"
            />

            <Input
              label="Alpaca Secret Key"
              value={form.secretKey}
              onChange={(v) => setForm((p) => ({ ...p, secretKey: v }))}
              placeholder="Enter Alpaca secret key"
              type="password"
            />

            <Select
              label="Mode"
              value={form.mode}
              onChange={handleModeChange}
              options={[
                { value: "paper", label: "Paper Mode" },
                { value: "live", label: "Live Mode" },
              ]}
            />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-2xl bg-cyan-500 py-3 font-black text-black hover:bg-cyan-400 disabled:opacity-50"
            >
              {saving ? <FaSyncAlt className="animate-spin inline mr-2" /> : <FaPlug className="inline mr-2" />}
              {status.connected ? "Reconnect" : "Connect"}
            </button>

            <button
              onClick={handleTest}
              disabled={testing}
              className="rounded-2xl bg-white/10 py-3 font-black hover:bg-white/15 disabled:opacity-50"
            >
              {testing ? <FaSyncAlt className="animate-spin inline mr-2" /> : <FaRedo className="inline mr-2" />}
              Test
            </button>

            <button
              onClick={handleDisconnect}
              className="rounded-2xl bg-red-500 py-3 font-black hover:bg-red-400"
            >
              <FaTrash className="inline mr-2" />
              Disconnect
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-black/25 p-4">
      <div className="text-cyan-300">{icon}</div>
      <p className="mt-3 text-sm text-white/40">{label}</p>
      <p className="font-black">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="block">
      <span className="text-sm text-white/50">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-sm text-white/50">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-slate-950">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}