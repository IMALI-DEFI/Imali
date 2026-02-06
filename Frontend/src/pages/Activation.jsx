import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BotAPI } from "../utils/BotAPI";

/* ======================================================
   UI HELPERS
====================================================== */

function Step({ title, done, required, loading, actionLabel, onAction, children }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center ${
              done
                ? "bg-emerald-500/20 text-emerald-400"
                : loading
                ? "bg-blue-500/20 text-blue-400"
                : "bg-gray-800 text-gray-400"
            }`}
          >
            {done ? "✓" : loading ? "…" : "•"}
          </div>

          <div>
            <div className="font-semibold text-white">
              {title}
              {required && !done && (
                <span className="ml-2 text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
                  Required
                </span>
              )}
            </div>

            {!done && actionLabel && (
              <button
                onClick={onAction}
                disabled={loading}
                className="text-sm text-blue-400 underline mt-1"
              >
                {actionLabel}
              </button>
            )}
          </div>
        </div>

        <div className="text-sm">
          {done ? (
            <span className="text-emerald-400">Complete</span>
          ) : loading ? (
            <span className="text-blue-400">Working…</span>
          ) : (
            <span className="text-amber-400">Pending</span>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-400 pl-11">{children}</div>
    </div>
  );
}

function ProgressBar({ pct }) {
  return (
    <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ======================================================
   MAIN
====================================================== */

export default function Activation() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState("");

  /* ---------------- LOAD ---------------- */
  const load = async () => {
    const [user, activation] = await Promise.all([
      BotAPI.me(),
      BotAPI.activationStatus(),
    ]);

    setMe(user?.user || user || null);
    setStatus(activation?.status || activation || null);
  };

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (e) {
        setError(e.message || "Failed to load activation state.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------------- ACTION RUNNER ---------------- */
  const run = async (key, fn) => {
    setUpdating(key);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdating(null);
    }
  };

  /* ---------------- DERIVED ---------------- */
  const tier = String(me?.tier || "starter").toLowerCase();

  const billing = !!status?.billing_complete || !!status?.has_card_on_file;
  const okx = !!status?.okx_connected;
  const alpaca = !!status?.alpaca_connected;
  const wallet = !!status?.wallet_connected;
  const trading = !!status?.trading_enabled;
  const activationComplete = !!status?.activation_complete;

  const progress = Math.round(
    ([
      billing,
      trading,
      tier === "starter" ? okx : true,
      tier === "starter" ? alpaca : true,
      tier === "elite" ? wallet : true,
    ].filter(Boolean).length / 5) * 100
  );

  /* ---------------- AUTO REDIRECT ---------------- */
  useEffect(() => {
    if (!loading && activationComplete && trading) {
      const t = setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
      return () => clearTimeout(t);
    }
  }, [loading, activationComplete, trading, navigate]);

  /* ---------------- RENDER ---------------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Link to="/login" className="underline text-blue-400">
          Session expired — log in again
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Account Activation</h1>
      <p className="text-gray-400 mb-6">Finish setup to enable trading</p>

      <ProgressBar pct={progress} />
      <div className="text-sm text-gray-500 mt-2 mb-6">{progress}% complete</div>

      <div className="grid gap-4">
        <Step
          title="Payment Method"
          done={billing}
          required
          loading={updating === "billing"}
          actionLabel={!billing ? "Add payment" : ""}
          onAction={() => navigate("/billing")}
        >
          Required for fees and billing.
        </Step>

        <Step
          title="OKX"
          done={okx}
          required={tier === "starter"}
          loading={updating === "okx"}
          actionLabel={!okx ? "Connect OKX" : ""}
          onAction={() => run("okx", () => BotAPI.connectOkx({}))}
        />

        <Step
          title="Alpaca"
          done={alpaca}
          required={tier === "starter"}
          loading={updating === "alpaca"}
          actionLabel={!alpaca ? "Connect Alpaca" : ""}
          onAction={() => run("alpaca", () => BotAPI.connectAlpaca({}))}
        />

        <Step
          title="Wallet"
          done={wallet}
          required={tier === "elite"}
          loading={updating === "wallet"}
          actionLabel={!wallet ? "Connect Wallet" : ""}
          onAction={() => run("wallet", () => BotAPI.connectWallet({}))}
        />

        <Step
          title="Enable Trading"
          done={trading}
          required
          loading={updating === "trading"}
          actionLabel={!trading ? "Enable trading" : ""}
          onAction={() => run("trading", () => BotAPI.tradingEnable(true))}
        />
      </div>

      {activationComplete && trading && (
        <div className="mt-8 p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
          <h2 className="text-xl text-emerald-400 font-semibold mb-2">
            🎉 Activation Complete
          </h2>
          <p className="text-emerald-300">Redirecting to dashboard…</p>
        </div>
      )}

      {error && (
        <div className="mt-6 text-red-400 text-sm text-center">{error}</div>
      )}
    </div>
  );
}
