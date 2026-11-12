import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotAPI from "../utils/BotAPI";
import { MascotLogo } from "../components/game/GameKit";
import {
  FaArrowRight,
  FaCheckCircle,
  FaExternalLinkAlt,
  FaShieldAlt,
  FaSpinner,
} from "react-icons/fa";

const OKX_API_URL = "https://www.okx.com/account/my-api";

export default function ConnectOKX() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("");

  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [passphrase, setPassphrase] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      const integration = await BotAPI.getIntegrationStatus(true);
      setConnected(Boolean(integration?.okx_connected));
    } catch (err) {
      setMessage(err.message || "Could not check OKX connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleConnect = async () => {
    if (!apiKey.trim() || !secretKey.trim() || !passphrase.trim()) {
      setMessage("Please fill in all 3 boxes: API key, Secret key and passphrase.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const res = await BotAPI.connectOKX({
        api_key: apiKey.trim(),
        secret_key: secretKey.trim(),
        passphrase: passphrase.trim(),
        mode: "live",
      });

      if (res?.success === false) {
        setMessage(res.error || res.message || "OKX connection failed.");
        return;
      }

      setApiKey("");
      setSecretKey("");
      setPassphrase("");
      setConnected(true);
      setMessage("");
    } catch (err) {
      setMessage(err.message || "OKX connection failed.");
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

          <MascotLogo size={84} className="block mx-auto mb-3" />
          <h1 className="mt-5 text-3xl font-black">
            OKX Connected
          </h1>

          <p className="mt-3 text-white/55">
            Your robot can now trade in your OKX account.
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
          <div className="text-5xl">🔷</div>
          <h1 className="mt-4 text-3xl font-black">Connect OKX</h1>

          <p className="mt-3 text-white/55">
            Your robot needs 3 codes from OKX. It takes about 5 minutes.
          </p>

          <a
            href={OKX_API_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 font-bold text-cyan-400 hover:text-cyan-300"
          >
            Open the OKX API page
            <FaExternalLinkAlt />
          </a>
        </div>

        <ol className="mt-8 list-decimal list-inside space-y-3 rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.05] p-6 text-sm leading-6 text-white/80">
          <li>Log in to OKX. Tap your <b>profile picture</b> (top right), then tap <b>API</b>.</li>
          <li>Tap <b>Create V5 API key</b> and pick <b>API trading</b>.</li>
          <li>Give it a name, like <b>IMALI</b>.</li>
          <li>Make up a <b>passphrase</b> (a password just for this key). Write it down.</li>
          <li>Turn on <b>Read</b> and <b>Trade</b>. Leave <b>Withdraw OFF</b> so no one can take money out.</li>
          <li>Tap <b>Confirm</b> and finish the security check. Copy the <b>API key</b> and <b>Secret key</b> right away. OKX shows the Secret key only once.</li>
        </ol>

        <div className="mt-6 space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <Input
            label="API Key"
            value={apiKey}
            onChange={setApiKey}
            placeholder="Paste the API key from step 6"
          />

          <Input
            label="Secret Key"
            value={secretKey}
            onChange={setSecretKey}
            placeholder="Paste the Secret key from step 6"
            secret
          />

          <Input
            label="Passphrase"
            value={passphrase}
            onChange={setPassphrase}
            placeholder="Type the passphrase you made in step 4"
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
            Keep Withdraw OFF. Your money stays in your OKX account.
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
