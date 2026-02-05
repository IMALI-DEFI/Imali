import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

/* ======================================================
   CONFIG
====================================================== */

const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:8001"
    : "https://api.imali-defi.com");

const TOKEN_KEY = "imali_token";

/* ======================================================
   API CLIENT
====================================================== */

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 20000,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

/* ======================================================
   UI HELPERS
====================================================== */

function Step({ title, done, children }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-white">{title}</div>
        <div className="text-sm">
          {done ? (
            <span className="text-emerald-400">✔ Complete</span>
          ) : (
            <span className="text-amber-400">Pending</span>
          )}
        </div>
      </div>
      <div className="text-sm text-gray-400">{children}</div>
    </div>
  );
}

function ProgressBar({ pct }) {
  return (
    <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
      <div
        className="h-full bg-emerald-500 transition-all"
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
  const [error, setError] = useState("");

  /* ---------------- HARD AUTH GUARD ---------------- */
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  /* ---------------- LOAD STATE ---------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [meRes, statusRes] = await Promise.all([
          api.get("/me"),
          api.get("/me/activation-status"),
        ]);

        if (!mounted) return;

        setMe(meRes.data?.user || null);
        setStatus(statusRes.data || null);
      } catch (e) {
        setError(
          e?.response?.data?.message ||
            "Unable to load activation status."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* ======================================================
     DERIVED FLAGS (SAFE)
  ====================================================== */

  const tier = useMemo(() => {
    const t = String(me?.tier || "starter").toLowerCase();
    if (t.includes("elite")) return "elite";
    if (t.includes("pro")) return "pro";
    return "starter";
  }, [me]);

  const billingConfirmed =
    !!status?.billing_complete ||
    !!status?.stripe_confirmed ||
    !!status?.has_card_on_file;

  const okxReady = tier !== "pro" && tier !== "elite"
    ? true
    : !!status?.okx_connected;

  const alpacaReady = tier !== "elite"
    ? true
    : !!status?.alpaca_connected;

  const walletReady = tier !== "elite"
    ? true
    : !!status?.wallet_connected;

  const activationComplete =
    billingConfirmed && okxReady && alpacaReady && walletReady;

  /* ======================================================
     PROGRESS (PERSISTED)
  ====================================================== */

  const steps = [
    billingConfirmed,
    okxReady,
    alpacaReady,
    walletReady,
  ];

  const progressPct = Math.round(
    (steps.filter(Boolean).length / steps.length) * 100
  );

  useEffect(() => {
    localStorage.setItem(
      "imali_activation_progress",
      JSON.stringify({ progressPct, activationComplete })
    );
  }, [progressPct, activationComplete]);

  /* ======================================================
     AUTO REDIRECTS
  ====================================================== */

  useEffect(() => {
    if (!loading && activationComplete) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, activationComplete, navigate]);

  /* ======================================================
     RENDER
  ====================================================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        Loading setup…
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white gap-3">
        <p>{error || "Session expired."}</p>
        <Link to="/login" className="underline">
          Log in again
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-6">
      <div className="max-w-xl mx-auto space-y-5">

        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold">🚀 Account Setup</h1>
          <p className="text-sm text-gray-400">
            Finish these steps to enable live trading.
          </p>
        </div>

        {/* PROGRESS */}
        <div className="space-y-2">
          <ProgressBar pct={progressPct} />
          <div className="text-xs text-gray-400">
            {progressPct}% complete
          </div>
        </div>

        {/* STEPS */}
        <Step title="Add payment method" done={billingConfirmed}>
          Required to run automation safely.
          {!billingConfirmed && (
            <div className="mt-2">
              <Link
                to="/billing"
                className="underline text-emerald-400"
              >
                Go to billing
              </Link>
            </div>
          )}
        </Step>

        <Step title="Connect OKX (crypto trading)" done={okxReady}>
          Required for Pro and Elite plans.
        </Step>

        <Step title="Connect Alpaca (stocks trading)" done={alpacaReady}>
          Required for Elite plan.
        </Step>

        <Step title="Connect wallet (MetaMask)" done={walletReady}>
          Required for Elite plan.
        </Step>

        {/* INCOMPLETE MODE */}
        {!activationComplete && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
            <div className="font-semibold text-amber-300 mb-1">
              Demo mode active
            </div>
            <p className="text-amber-200">
              Live trading unlocks automatically when setup is complete.
              You can still explore the dashboard.
            </p>

            <button
              onClick={() => navigate("/dashboard")}
              className="mt-3 w-full rounded-lg bg-amber-500/20 hover:bg-amber-500/30 py-2"
            >
              Go to demo dashboard
            </button>
          </div>
        )}

        {/* COMPLETE */}
        {activationComplete && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            Setup complete — launching dashboard…
          </div>
        )}

        {/* FOOTER */}
        <div className="text-xs text-gray-500 text-center pt-4">
          Trading involves risk. Never trade money you can’t afford to lose.
        </div>
      </div>
    </div>
  );
}
