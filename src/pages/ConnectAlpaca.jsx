import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BotAPI from "../utils/BotAPI";
import {
  FaArrowRight,
  FaCheckCircle,
  FaExternalLinkAlt,
  FaShieldAlt,
  FaSpinner,
} from "react-icons/fa";

export default function ConnectAlpaca() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("");

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
    const status = searchParams.get("alpaca");

    if (status === "connected") {
      setConnected(true);
      setLoading(false);
      return;
    }

    if (status === "error") {
      setMessage(
        searchParams.get("message") ||
          "Alpaca authorization could not be completed."
      );
    }

    loadStatus();
  }, [loadStatus, searchParams]);

  const handleConnect = async () => {
    setSaving(true);
    setMessage("");

    try {
      const res = await BotAPI.startAlpacaOAuth();

      const authorizationUrl =
        res?.authorization_url ||
        res?.data?.authorization_url;

      if (!authorizationUrl) {
        throw new Error(
          res?.error ||
            res?.message ||
            "Could not start Alpaca authorization."
        );
      }

      window.location.assign(authorizationUrl);
    } catch (err) {
      setMessage(err.message || "Could not start Alpaca authorization.");
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
            Your Alpaca account is securely connected to IMALI.
          </p>

          <button
            onClick={() => navigate("/dashboard")}
            className="mt-7 w-full rounded-xl bg-emerald-500 py-4 font-black text-slate-950 hover:bg-emerald-400"
          >
            Go to Dashboard
            <FaArrowRight className="inline ml-2" />
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

          <h1 className="mt-4 text-3xl font-black">
            Connect Alpaca
          </h1>

          <p className="mt-3 text-white/55">
            Securely authorize IMALI through your Alpaca account.
          </p>
        </div>

        <section className="mt-8 rounded-3xl border border-cyan-400/20 bg-white/[0.04] p-6">
          <div className="flex items-start gap-3">
            <FaShieldAlt className="mt-1 shrink-0 text-2xl text-emerald-400" />

            <div>
              <h2 className="text-xl font-black">
                Authorize IMALI
              </h2>

              <p className="mt-3 text-sm leading-6 text-white/70">
                By allowing IMALI to access your Alpaca account, you
                are granting IMALI access to your account information
                and authorization to place transactions in your account
                at your direction. Alpaca does not warrant or guarantee
                that IMALI will work as advertised or expected. Before
                authorizing, learn more about IMALI.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
            <h3 className="font-bold">
              What you are authorizing
            </h3>

            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li>• View your Alpaca account information</li>
              <li>• View account balances and positions</li>
              <li>• Place and manage trades at your direction</li>
            </ul>
          </div>

          {message && (
            <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">
              {message}
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={saving}
            className="mt-6 w-full rounded-xl bg-emerald-500 py-4 font-black text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {saving ? (
              <>
                <FaSpinner className="mr-2 inline animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                Connect with Alpaca
                <FaExternalLinkAlt className="ml-2 inline" />
              </>
            )}
          </button>

          <p className="mt-5 text-center text-xs leading-5 text-white/40">
            You will be redirected to Alpaca to sign in and approve
            access. IMALI does not take custody of your funds. Trading
            involves risk, including possible loss of principal. You
            may disconnect your Alpaca account at any time.
          </p>

          <div className="mt-4 flex justify-center gap-5 text-xs">
            <a
              href="/terms"
              className="text-cyan-400 hover:text-cyan-300"
            >
              Terms of Use
            </a>

            <a
              href="/privacy"
              className="text-cyan-400 hover:text-cyan-300"
            >
              Privacy Policy
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
