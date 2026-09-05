import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotAPI from "../utils/BotAPI";
import {
  FaArrowRight,
  FaCheckCircle,
  FaExclamationTriangle,
  FaKey,
  FaLock,
  FaShieldAlt,
  FaSpinner,
  FaTrashAlt,
} from "react-icons/fa";

export default function ConnectKalshi() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [connected, setConnected] = useState(false);
  const [connectedAt, setConnectedAt] = useState(null);
  const [maskedKey, setMaskedKey] = useState(null);

  const [apiKey, setApiKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");

  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      const result =
        await BotAPI.getKalshiConnection(true);

      setConnected(Boolean(result?.connected));
      setConnectedAt(
        result?.connected_at || null
      );
      setMaskedKey(
        result?.api_key_masked || null
      );

    } catch (err) {
      setMessage(
        err.message ||
          "Could not check Kalshi connection."
      );

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

    setMessage("");
    setSuccessMessage("");

    if (!cleanApiKey || !cleanPrivateKey) {
      setMessage(
        "Enter both your Kalshi API key and private key."
      );
      return;
    }

    if (
      !cleanPrivateKey.includes("-----BEGIN") ||
      !cleanPrivateKey.includes("PRIVATE KEY-----")
    ) {
      setMessage(
        "The private key does not appear to be a valid PEM private key."
      );
      return;
    }

    setSaving(true);

    try {
      const result =
        await BotAPI.connectKalshi({
          api_key: cleanApiKey,
          private_key: cleanPrivateKey,
        });

      if (result?.success === false) {
        setMessage(
          result?.error ||
            result?.message ||
            "Kalshi connection failed."
        );
        return;
      }

      setApiKey("");
      setPrivateKey("");

      setConnected(true);

      setSuccessMessage(
        "Kalshi connected successfully."
      );

      await loadStatus();

    } catch (err) {
      setMessage(
        err.message ||
          "Kalshi connection failed. Check your credentials and try again."
      );

    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    const confirmed = window.confirm(
      "Disconnect your Kalshi account from IMALI?"
    );

    if (!confirmed) {
      return;
    }

    setDisconnecting(true);
    setMessage("");
    setSuccessMessage("");

    try {
      const result =
        await BotAPI.disconnectKalshi();

      if (result?.success === false) {
        setMessage(
          result?.error ||
            result?.message ||
            "Could not disconnect Kalshi."
        );
        return;
      }

      setConnected(false);
      setConnectedAt(null);
      setMaskedKey(null);
      setApiKey("");
      setPrivateKey("");

      setSuccessMessage(
        "Kalshi disconnected."
      );

    } catch (err) {
      setMessage(
        err.message ||
          "Could not disconnect Kalshi."
      );

    } finally {
      setDisconnecting(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return null;

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toLocaleString();
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
      <div className="min-h-screen bg-slate-950 text-white px-5 py-12">
        <main className="mx-auto max-w-xl">

          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.06] p-7 sm:p-8">

            <div className="text-center">
              <FaCheckCircle className="mx-auto text-5xl text-emerald-400" />

              <h1 className="mt-5 text-3xl font-black">
                Kalshi Connected
              </h1>

              <p className="mt-3 text-white/55">
                IMALI can now access your Kalshi account
                for prediction-market intelligence.
              </p>
            </div>

            <div className="mt-7 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">

              <StatusRow
                label="Connection"
                value="Connected"
              />

              <StatusRow
                label="API Key"
                value={maskedKey || "Stored securely"}
              />

              {connectedAt && (
                <StatusRow
                  label="Connected"
                  value={formatDate(connectedAt)}
                />
              )}

              <StatusRow
                label="Live Kalshi Trading"
                value="Disabled"
              />

            </div>

            <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">

              <div className="flex items-start gap-3">

                <FaShieldAlt className="mt-1 shrink-0 text-cyan-400" />

                <div>
                  <div className="font-bold text-cyan-200">
                    Kalshi Intelligence Mode
                  </div>

                  <div className="mt-1 text-sm leading-6 text-white/60">
                    IMALI can analyze Kalshi markets,
                    opportunities, positions and orders.
                    This connection does not enable IMALI
                    to submit live Kalshi orders.
                  </div>
                </div>

              </div>

            </div>

            {successMessage && (
              <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                {successMessage}
              </div>
            )}

            {message && (
              <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">
                {message}
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="mt-6 w-full rounded-xl bg-emerald-500 py-4 font-black text-slate-950 transition hover:bg-emerald-400"
            >
              Go to Dashboard
              <FaArrowRight className="ml-2 inline" />
            </button>

            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 py-4 font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              {disconnecting ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <FaTrashAlt />
                  Disconnect Kalshi
                </>
              )}
            </button>

          </div>

        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-5 py-12">

      <main className="mx-auto max-w-xl">

        <div className="text-center">

          <div className="text-5xl">
            📊
          </div>

          <h1 className="mt-4 text-3xl font-black">
            Connect Kalshi
          </h1>

          <p className="mt-3 text-white/55">
            Connect your Kalshi account so IMALI can
            analyze prediction markets and display
            account intelligence.
          </p>

        </div>

        <div className="mt-7 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">

          <div className="flex items-start gap-3">

            <FaExclamationTriangle className="mt-1 shrink-0 text-amber-400" />

            <div>

              <div className="font-bold text-amber-200">
                Read-only intelligence
              </div>

              <p className="mt-1 text-sm leading-6 text-white/60">
                Live automated Kalshi trading is currently
                disabled. Connecting your account does not
                allow IMALI to submit live orders.
              </p>

            </div>

          </div>

        </div>

        <div className="mt-6 space-y-5 rounded-3xl border border-white/10 bg-white/[0.04] p-6">

          <Input
            label="Kalshi API Key"
            icon={<FaKey />}
            value={apiKey}
            onChange={setApiKey}
            placeholder="Paste your Kalshi API key"
          />

          <TextArea
            label="Kalshi Private Key"
            icon={<FaLock />}
            value={privateKey}
            onChange={setPrivateKey}
            placeholder={`-----BEGIN PRIVATE KEY-----
Paste your private key here
-----END PRIVATE KEY-----`}
          />

          <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/50">

            <div className="flex gap-3">

              <FaShieldAlt className="mt-1 shrink-0 text-emerald-400" />

              <div>
                Your Kalshi credentials are sent securely
                to IMALI and stored encrypted. Your private
                key is never shown back to you after
                connection.
              </div>

            </div>

          </div>

          {message && (
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">
              {message}
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {successMessage}
            </div>
          )}

          <button
            type="button"
            onClick={handleConnect}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 font-black text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {saving ? (
              <>
                <FaSpinner className="animate-spin" />
                Validating & Connecting...
              </>
            ) : (
              <>
                Connect Kalshi
                <FaArrowRight />
              </>
            )}
          </button>

        </div>

        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mt-5 w-full py-3 text-sm font-bold text-white/45 transition hover:text-white/70"
        >
          Return to Dashboard
        </button>

      </main>

    </div>
  );
}


function Input({
  label,
  icon,
  value,
  onChange,
  placeholder,
}) {
  return (
    <label className="block">

      <span className="mb-2 flex items-center gap-2 text-sm font-bold text-white/70">
        <span className="text-emerald-400">
          {icon}
        </span>
        {label}
      </span>

      <input
        type="text"
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck="false"
        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-white/25 outline-none transition focus:border-emerald-400"
      />

    </label>
  );
}


function TextArea({
  label,
  icon,
  value,
  onChange,
  placeholder,
}) {
  return (
    <label className="block">

      <span className="mb-2 flex items-center gap-2 text-sm font-bold text-white/70">
        <span className="text-emerald-400">
          {icon}
        </span>
        {label}
      </span>

      <textarea
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck="false"
        rows={10}
        className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-white placeholder-white/25 outline-none transition focus:border-emerald-400"
      />

    </label>
  );
}


function StatusRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">

      <span className="text-sm text-white/45">
        {label}
      </span>

      <span className="text-right text-sm font-bold text-white/80">
        {value}
      </span>

    </div>
  );
}
