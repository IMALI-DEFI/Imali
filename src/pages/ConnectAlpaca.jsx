import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BotAPI from "../utils/BotAPI";
import {
  FaArrowRight,
  FaCheckCircle,
  FaExternalLinkAlt,
  FaKey,
  FaShieldAlt,
  FaSpinner,
  FaUnlink,
} from "react-icons/fa";

export default function ConnectAlpaca() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [savingOAuth, setSavingOAuth] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [connected, setConnected] = useState(false);
  const [connectionMode, setConnectionMode] = useState("paper");
  const [authType, setAuthType] = useState(null);
  const [connectedAt, setConnectedAt] = useState(null);

  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [manualMode, setManualMode] = useState("paper");

  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const applyStatus = useCallback((integration = {}) => {
    const isConnected = Boolean(integration?.alpaca_connected);

    setConnected(isConnected);
    setConnectionMode(
      String(integration?.alpaca_mode || "paper").toLowerCase()
    );

    setAuthType(
      integration?.alpaca_auth_type ||
        (integration?.alpaca_api_key_masked ? "api_key" : isConnected ? "oauth" : null)
    );

    setConnectedAt(
      integration?.alpaca_connected_at ||
        integration?.alpaca_key_updated_at ||
        null
    );
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const integration = await BotAPI.getIntegrationStatus(true);
      applyStatus(integration);
    } catch (err) {
      setMessage(err.message || "Could not check Alpaca connection.");
    } finally {
      setLoading(false);
    }
  }, [applyStatus]);

  useEffect(() => {
    const status = searchParams.get("alpaca");

    if (status === "connected") {
      setSuccessMessage("Alpaca authorization completed successfully.");
    }

    if (status === "error") {
      setMessage(
        searchParams.get("message") ||
          "Alpaca authorization could not be completed."
      );
    }

    loadStatus();
  }, [loadStatus, searchParams]);

  const handleOAuthConnect = async () => {
    setSavingOAuth(true);
    setMessage("");
    setSuccessMessage("");

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
      setSavingOAuth(false);
    }
  };

  const handleManualConnect = async (event) => {
    event.preventDefault();

    const cleanApiKey = apiKey.trim();
    const cleanSecretKey = secretKey.trim();

    if (!cleanApiKey || !cleanSecretKey) {
      setMessage("Enter both your Alpaca API Key and Secret Key.");
      return;
    }

    setSavingManual(true);
    setMessage("");
    setSuccessMessage("");

    try {
      const result = await BotAPI.connectAlpaca({
        api_key: cleanApiKey,
        secret_key: cleanSecretKey,
        mode: manualMode,
      });

      if (result?.success === false) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Could not connect Alpaca API credentials."
        );
      }

      setApiKey("");
      setSecretKey("");

      await loadStatus();

      setSuccessMessage(
        `Alpaca ${manualMode === "live" ? "Live" : "Paper"} API credentials connected successfully.`
      );
    } catch (err) {
      setMessage(
        err.message || "Could not connect Alpaca API credentials."
      );
    } finally {
      setSavingManual(false);
    }
  };

  const handleDisconnect = async () => {
    const confirmed = window.confirm(
      "Disconnect your Alpaca account from IMALI?"
    );

    if (!confirmed) return;

    setDisconnecting(true);
    setMessage("");
    setSuccessMessage("");

    try {
      const result = await BotAPI.disconnectAlpaca();

      if (result?.success === false) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Could not disconnect Alpaca."
        );
      }

      setConnected(false);
      setAuthType(null);
      setConnectedAt(null);
      setConnectionMode("paper");

      await loadStatus();

      setSuccessMessage("Alpaca disconnected successfully.");
    } catch (err) {
      setMessage(err.message || "Could not disconnect Alpaca.");
    } finally {
      setDisconnecting(false);
    }
  };

  const formatConnectedAt = (value) => {
    if (!value) return null;

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) return null;

    return d.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 grid place-items-center text-white">
        <FaSpinner className="animate-spin text-4xl text-cyan-400" />
      </div>
    );
  }

  if (connected) {
    const isLive = connectionMode === "live";
    const methodLabel =
      authType === "api_key" ? "API Keys" : "Alpaca OAuth";

    return (
      <div className="min-h-screen bg-slate-950 text-white px-5 py-12">
        <main className="mx-auto max-w-xl">
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.06] p-8 text-center">
            <FaCheckCircle className="mx-auto text-5xl text-emerald-400" />

            <h1 className="mt-5 text-3xl font-black">
              Alpaca Connected
            </h1>

            <p className="mt-3 text-white/55">
              Your Alpaca account is connected to IMALI.
            </p>

            <div className="mt-7 grid gap-3 text-left sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wider text-white/40">
                  Connection
                </div>
                <div className="mt-1 font-black">
                  {methodLabel}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wider text-white/40">
                  Account Mode
                </div>

                <div
                  className={`mt-1 font-black ${
                    isLive ? "text-red-300" : "text-amber-300"
                  }`}
                >
                  {isLive ? "LIVE" : "PAPER"}
                </div>
              </div>
            </div>

            {formatConnectedAt(connectedAt) && (
              <p className="mt-4 text-xs text-white/40">
                Connected: {formatConnectedAt(connectedAt)}
              </p>
            )}

            {!isLive && authType !== "api_key" && (
              <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-left">
                <div className="font-bold text-amber-300">
                  OAuth Paper Connection
                </div>

                <p className="mt-2 text-sm leading-6 text-white/65">
                  IMALI's Alpaca OAuth connection is currently using
                  Alpaca Paper Trading. Live OAuth access will be enabled
                  after Alpaca approves IMALI for live Connect access.
                </p>
              </div>
            )}

            {message && (
              <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">
                {message}
              </div>
            )}

            {successMessage && (
              <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                {successMessage}
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="mt-7 w-full rounded-xl bg-emerald-500 py-4 font-black text-slate-950 hover:bg-emerald-400"
            >
              Go to Dashboard
              <FaArrowRight className="inline ml-2" />
            </button>

            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="mt-3 w-full rounded-xl border border-red-400/30 bg-red-500/10 py-4 font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              {disconnecting ? (
                <>
                  <FaSpinner className="mr-2 inline animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <FaUnlink className="mr-2 inline" />
                  Disconnect Alpaca
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
      <main className="mx-auto max-w-5xl">
        <div className="text-center">
          <div className="text-5xl">📈</div>

          <h1 className="mt-4 text-3xl font-black">
            Connect Alpaca
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-white/55">
            Choose how you want to connect your Alpaca account to IMALI.
          </p>
        </div>

        {message && (
          <div className="mx-auto mt-7 max-w-2xl rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-300">
            {message}
          </div>
        )}

        {successMessage && (
          <div className="mx-auto mt-7 max-w-2xl rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {successMessage}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* OAuth */}
          <section className="relative rounded-3xl border border-cyan-400/30 bg-white/[0.04] p-6">
            <div className="absolute right-5 top-5 rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-300">
              RECOMMENDED
            </div>

            <FaShieldAlt className="text-3xl text-emerald-400" />

            <h2 className="mt-5 text-2xl font-black">
              Connect with Alpaca OAuth
            </h2>

            <p className="mt-3 text-sm leading-6 text-white/65">
              Sign in directly with Alpaca and authorize IMALI without
              copying API credentials into the connection form.
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-4">
                <span className="text-sm text-white/65">
                  Paper Trading
                </span>
                <span className="font-black text-emerald-300">
                  Available
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-4">
                <span className="text-sm text-white/65">
                  Live OAuth
                </span>
                <span className="text-right text-sm font-black text-amber-300">
                  Pending Alpaca Approval
                </span>
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

            <button
              type="button"
              onClick={handleOAuthConnect}
              disabled={savingOAuth}
              className="mt-6 w-full rounded-xl bg-emerald-500 py-4 font-black text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {savingOAuth ? (
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

            <p className="mt-4 text-center text-xs leading-5 text-white/40">
              You will be redirected to Alpaca to authorize your Paper
              account while IMALI's live OAuth application is under review.
            </p>
          </section>

          {/* API keys */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <FaKey className="text-3xl text-amber-300" />

            <h2 className="mt-5 text-2xl font-black">
              Connect with API Keys
            </h2>

            <p className="mt-3 text-sm leading-6 text-white/65">
              Already have Alpaca API credentials? Connect your own
              Alpaca account manually.
            </p>

            <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] p-4">
              <div className="font-bold text-amber-300">
                Manual / Advanced
              </div>

              <p className="mt-2 text-xs leading-5 text-white/55">
                Use credentials created in your own Alpaca account.
                Choose Paper or Live based on the credentials you created.
              </p>
            </div>

            <form onSubmit={handleManualConnect} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="alpaca-api-key"
                  className="mb-2 block text-sm font-bold text-white/70"
                >
                  API Key
                </label>

                <input
                  id="alpaca-api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  autoComplete="off"
                  spellCheck="false"
                  placeholder="Enter Alpaca API key"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50"
                />
              </div>

              <div>
                <label
                  htmlFor="alpaca-secret-key"
                  className="mb-2 block text-sm font-bold text-white/70"
                >
                  Secret Key
                </label>

                <input
                  id="alpaca-secret-key"
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  autoComplete="new-password"
                  spellCheck="false"
                  placeholder="Enter Alpaca secret key"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50"
                />
              </div>

              <div>
                <label
                  htmlFor="alpaca-mode"
                  className="mb-2 block text-sm font-bold text-white/70"
                >
                  Alpaca Account Mode
                </label>

                <select
                  id="alpaca-mode"
                  value={manualMode}
                  onChange={(e) => setManualMode(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50"
                >
                  <option value="paper">Paper Trading</option>
                  <option value="live">Live Trading</option>
                </select>
              </div>

              {manualMode === "live" && (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs leading-5 text-red-200">
                  Live mode can place real-money trades. Only use Alpaca
                  Live API credentials when you intend to connect a real
                  brokerage account.
                </div>
              )}

              <button
                type="submit"
                disabled={savingManual}
                className="w-full rounded-xl border border-cyan-400/30 bg-cyan-400/10 py-4 font-black text-cyan-200 transition hover:bg-cyan-400/20 disabled:opacity-50"
              >
                {savingManual ? (
                  <>
                    <FaSpinner className="mr-2 inline animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <FaKey className="mr-2 inline" />
                    Connect with API Keys
                  </>
                )}
              </button>
            </form>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="font-black">
            About Alpaca authorization
          </h3>

          <p className="mt-2 text-sm leading-6 text-white/60">
            By allowing IMALI to access your Alpaca account, you are
            granting IMALI access to your account information and
            authorization to place transactions in your account at your
            direction. Alpaca does not warrant or guarantee that IMALI
            will work as advertised or expected.
          </p>

          <p className="mt-3 text-xs leading-5 text-white/40">
            IMALI does not take custody of your funds. Trading involves
            risk, including possible loss of principal. You may disconnect
            your Alpaca account at any time.
          </p>

          <div className="mt-4 flex gap-5 text-xs">
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
