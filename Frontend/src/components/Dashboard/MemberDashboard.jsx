// src/components/Dashboard/MemberDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotAPI from "../../utils/BotAPI";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/* =========================================================
   IMALI MEMBER DASHBOARD
   Beginner-friendly version:
   1. No Common/Rare/Epic/Legendary live trading lock
   2. Clear text contrast
   3. Paper/live trading status reflected in cards and charts
   4. Strong next-step guidance for novice users
========================================================= */

const PAPER_TRADING_BALANCE = 1000;

const STRATEGIES = [
  {
    id: "mean_reversion",
    name: "Conservative",
    emoji: "🛡️",
    risk: "Low",
    bestFor: "Beginners",
    description: "Looks for dips and safer rebounds.",
    plainEnglish: "The bot waits for a price drop, then looks for a rebound.",
  },
  {
    id: "ai_weighted",
    name: "Balanced",
    emoji: "⚖️",
    risk: "Medium",
    bestFor: "Most users",
    description: "Uses a mix of multiple trading signals.",
    plainEnglish: "The bot checks several signals before making a decision.",
  },
  {
    id: "momentum",
    name: "Momentum",
    emoji: "🔥",
    risk: "High",
    bestFor: "Trending markets",
    description: "Follows strong price moves.",
    plainEnglish: "The bot tries to ride strong moves when the market is moving fast.",
  },
  {
    id: "arbitrage",
    name: "Arbitrage",
    emoji: "🔄",
    risk: "Low",
    bestFor: "Advanced users",
    description: "Looks for price differences across venues.",
    plainEnglish: "The bot looks for small price differences between markets.",
  },
];

const usd = (n = 0) => `$${Number(n || 0).toFixed(2)}`;
const pct = (n = 0) => `${Number(n || 0).toFixed(1)}%`;

const normalizeStrategyId = (value) => {
  const v = String(value || "").trim().toLowerCase();

  const aliases = {
    conservative: "mean_reversion",
    "mean reversion": "mean_reversion",
    balanced: "ai_weighted",
    "ai weighted": "ai_weighted",
    ai: "ai_weighted",
    momentum: "momentum",
    arbitrage: "arbitrage",
  };

  return aliases[v] || v || "mean_reversion";
};

const riskClass = (risk) => {
  const r = String(risk || "").toLowerCase();

  if (r === "low") return "border-green-200 bg-green-100 text-green-800";
  if (r === "high") return "border-red-200 bg-red-100 text-red-800";

  return "border-yellow-200 bg-yellow-100 text-yellow-800";
};

const extractSummary = (payload) => {
  if (payload?.summary) return payload.summary;
  if (payload?.data?.summary) return payload.data.summary;
  return {};
};

const extractDailySeries = (payload) => {
  if (Array.isArray(payload?.daily_performance)) return payload.daily_performance;
  if (Array.isArray(payload?.data?.daily_performance)) return payload.data.daily_performance;
  return [];
};

const getStrategyFromResult = (result, fallbackId) => {
  return normalizeStrategyId(
    result?.strategy ||
      result?.current_strategy ||
      result?.data?.strategy ||
      result?.data?.current_strategy ||
      fallbackId
  );
};

const formatTimeLeft = (seconds) => {
  const s = Number(seconds || 0);
  if (s <= 0) return "expired";

  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);

  if (days > 0) return `${days} day${days === 1 ? "" : "s"} ${hours} hr`;
  return `${hours} hour${hours === 1 ? "" : "s"}`;
};

const anonymizeEmail = (email, index = 0) => {
  if (!email) return `member_${1000 + index}`;

  const raw = String(email).toLowerCase();
  let hash = 0;

  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) % 10000;
  }

  return `member_${String(hash).padStart(4, "0")}`;
};

const todayLabel = () =>
  new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

const buildDisplaySeries = ({
  series,
  stats,
  paperTradingEnabled,
  tradingEnabled,
}) => {
  if (Array.isArray(series) && series.length > 0) return series;

  const today = new Date();
  const totalTrades = Number(stats.total_trades || 0);
  const totalPnl = Number(stats.total_pnl || 0);
  const active = paperTradingEnabled || tradingEnabled;

  return Array.from({ length: 7 }).map((_, index) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - index));

    const isToday = index === 6;

    return {
      date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      pnl: isToday ? totalPnl : 0,
      trades: isToday ? Math.max(totalTrades, active ? 1 : 0) : 0,
    };
  });
};

/* ================= UI HELPERS ================= */

function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="mb-4 text-lg font-extrabold text-slate-950">{children}</h3>;
}

function StatusPill({ children, tone = "slate" }) {
  const classes = {
    green: "border-green-200 bg-green-100 text-green-800",
    red: "border-red-200 bg-red-100 text-red-800",
    amber: "border-amber-200 bg-amber-100 text-amber-900",
    blue: "border-blue-200 bg-blue-100 text-blue-800",
    purple: "border-purple-200 bg-purple-100 text-purple-800",
    slate: "border-slate-200 bg-slate-100 text-slate-800",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${
        classes[tone] || classes.slate
      }`}
    >
      {children}
    </span>
  );
}

function PrimaryButton({ children, onClick, disabled = false, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, disabled = false, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-extrabold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function WarningButton({ children, onClick, disabled = false, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl bg-amber-500 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function DangerButton({ children, onClick, disabled = false, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, helper }) {
  return (
    <Card>
      <div className="text-sm font-bold text-slate-600">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-slate-950">{value}</div>
      {helper && <div className="mt-1 text-sm font-medium text-slate-500">{helper}</div>}
    </Card>
  );
}

/* ================= API MODAL ================= */

function ApiKeysModal({ open, onClose, onSaved }) {
  const [saving, setSaving] = useState("");
  const [alpacaPaper, setAlpacaPaper] = useState({ apiKey: "", secret: "" });
  const [alpacaLive, setAlpacaLive] = useState({ apiKey: "", secret: "" });
  const [okxPaper, setOkxPaper] = useState({
    apiKey: "",
    secret: "",
    passphrase: "",
  });
  const [okxLive, setOkxLive] = useState({
    apiKey: "",
    secret: "",
    passphrase: "",
  });

  if (!open) return null;

  const saveAlpaca = async (mode) => {
    const payload = mode === "paper" ? alpacaPaper : alpacaLive;

    if (!payload.apiKey || !payload.secret) {
      alert("Please fill in both Alpaca fields.");
      return;
    }

    setSaving(`alpaca-${mode}`);

    try {
      const result = await BotAPI.connectAlpaca({
        api_key: payload.apiKey.trim(),
        api_secret: payload.secret.trim(),
        mode,
      });

      if (!result?.success) {
        throw new Error(result?.error || "Failed to save Alpaca keys.");
      }

      alert(`Alpaca ${mode} keys saved.`);

      if (mode === "paper") setAlpacaPaper({ apiKey: "", secret: "" });
      if (mode === "live") setAlpacaLive({ apiKey: "", secret: "" });

      await onSaved?.();
    } catch (err) {
      alert(err?.message || "Failed to save Alpaca keys.");
    } finally {
      setSaving("");
    }
  };

  const saveOKX = async (mode) => {
    const payload = mode === "paper" ? okxPaper : okxLive;

    if (!payload.apiKey || !payload.secret || !payload.passphrase) {
      alert("Please fill in all OKX fields.");
      return;
    }

    setSaving(`okx-${mode}`);

    try {
      const result = await BotAPI.connectOKX({
        api_key: payload.apiKey.trim(),
        api_secret: payload.secret.trim(),
        passphrase: payload.passphrase.trim(),
        mode,
      });

      if (!result?.success) {
        throw new Error(result?.error || "Failed to save OKX keys.");
      }

      alert(`OKX ${mode} keys saved.`);

      if (mode === "paper") {
        setOkxPaper({ apiKey: "", secret: "", passphrase: "" });
      }

      if (mode === "live") {
        setOkxLive({ apiKey: "", secret: "", passphrase: "" });
      }

      await onSaved?.();
    } catch (err) {
      alert(err?.message || "Failed to save OKX keys.");
    } finally {
      setSaving("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-950">
              Connect API Keys
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Add OKX for crypto and Alpaca for stocks. Use paper keys first.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl px-3 py-1 text-3xl font-extrabold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            ×
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
          🔒 Security tip: create restricted API keys. Trading permission is okay.
          Withdrawals should stay disabled.
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="bg-slate-50">
            <h3 className="mb-4 text-lg font-extrabold text-slate-950">
              📈 Alpaca — Stocks
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <KeyBox
                title="Paper Keys"
                fields={[
                  {
                    placeholder: "API Key",
                    value: alpacaPaper.apiKey,
                    onChange: (v) => setAlpacaPaper({ ...alpacaPaper, apiKey: v }),
                  },
                  {
                    placeholder: "Secret Key",
                    value: alpacaPaper.secret,
                    type: "password",
                    onChange: (v) => setAlpacaPaper({ ...alpacaPaper, secret: v }),
                  },
                ]}
                button="Save Paper Keys"
                loading={saving === "alpaca-paper"}
                onSave={() => saveAlpaca("paper")}
              />

              <KeyBox
                title="Live Keys"
                fields={[
                  {
                    placeholder: "API Key",
                    value: alpacaLive.apiKey,
                    onChange: (v) => setAlpacaLive({ ...alpacaLive, apiKey: v }),
                  },
                  {
                    placeholder: "Secret Key",
                    value: alpacaLive.secret,
                    type: "password",
                    onChange: (v) => setAlpacaLive({ ...alpacaLive, secret: v }),
                  },
                ]}
                button="Save Live Keys"
                loading={saving === "alpaca-live"}
                onSave={() => saveAlpaca("live")}
              />
            </div>
          </Card>

          <Card className="bg-slate-50">
            <h3 className="mb-4 text-lg font-extrabold text-slate-950">
              🔷 OKX — Crypto
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <KeyBox
                title="Paper Keys"
                fields={[
                  {
                    placeholder: "API Key",
                    value: okxPaper.apiKey,
                    onChange: (v) => setOkxPaper({ ...okxPaper, apiKey: v }),
                  },
                  {
                    placeholder: "Secret Key",
                    value: okxPaper.secret,
                    type: "password",
                    onChange: (v) => setOkxPaper({ ...okxPaper, secret: v }),
                  },
                  {
                    placeholder: "Passphrase",
                    value: okxPaper.passphrase,
                    type: "password",
                    onChange: (v) =>
                      setOkxPaper({ ...okxPaper, passphrase: v }),
                  },
                ]}
                button="Save Paper Keys"
                loading={saving === "okx-paper"}
                onSave={() => saveOKX("paper")}
              />

              <KeyBox
                title="Live Keys"
                fields={[
                  {
                    placeholder: "API Key",
                    value: okxLive.apiKey,
                    onChange: (v) => setOkxLive({ ...okxLive, apiKey: v }),
                  },
                  {
                    placeholder: "Secret Key",
                    value: okxLive.secret,
                    type: "password",
                    onChange: (v) => setOkxLive({ ...okxLive, secret: v }),
                  },
                  {
                    placeholder: "Passphrase",
                    value: okxLive.passphrase,
                    type: "password",
                    onChange: (v) => setOkxLive({ ...okxLive, passphrase: v }),
                  },
                ]}
                button="Save Live Keys"
                loading={saving === "okx-live"}
                onSave={() => saveOKX("live")}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KeyBox({ title, fields, button, loading, onSave }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 text-sm font-extrabold text-slate-950">{title}</div>

      <div className="space-y-3">
        {fields.map((field) => (
          <input
            key={field.placeholder}
            type={field.type || "text"}
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        ))}

        <PrimaryButton onClick={onSave} disabled={loading} className="w-full">
          {loading ? "Saving..." : button}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ================= MAIN DASHBOARD SECTIONS ================= */

function NextStepCard({
  alpacaConnected,
  okxConnected,
  paperTradingEnabled,
  tradingEnabled,
  onConnect,
  onStartPaper,
  onStopPaper,
  onStartLive,
  onStopLive,
  loading,
}) {
  const bothConnected = alpacaConnected && okxConnected;

  let tone = "amber";
  let title = "Step 1: Connect your API keys";
  let message =
    "Connect both Alpaca and OKX so Imali can run paper trading and live trading from your dashboard.";
  let action = (
    <WarningButton onClick={onConnect}>Connect API Keys</WarningButton>
  );

  if (bothConnected && !paperTradingEnabled && !tradingEnabled) {
    tone = "blue";
    title = "Step 2: Start paper trading";
    message =
      "Your accounts are connected. Start with virtual money first so you can see how the bot works.";
    action = (
      <PrimaryButton onClick={onStartPaper} disabled={loading}>
        Start Paper Trading
      </PrimaryButton>
    );
  }

  if (paperTradingEnabled && !tradingEnabled) {
    tone = "green";
    title = "Paper trading is active";
    message =
      "Imali is using virtual funds. Watch your charts, trades, and strategy before using real money.";
    action = (
      <div className="flex flex-wrap gap-3">
        <DangerButton onClick={onStopPaper} disabled={loading}>
          Stop Paper
        </DangerButton>
        <WarningButton onClick={onStartLive} disabled={loading}>
          Start Live Trading
        </WarningButton>
      </div>
    );
  }

  if (tradingEnabled) {
    tone = "purple";
    title = "Live trading is active";
    message =
      "Real money trading is turned on. Monitor performance and stop live trading anytime.";
    action = (
      <DangerButton onClick={onStopLive} disabled={loading}>
        Stop Live Trading
      </DangerButton>
    );
  }

  const shell = {
    amber: "border-amber-300 bg-amber-50",
    blue: "border-blue-300 bg-blue-50",
    green: "border-green-300 bg-green-50",
    purple: "border-purple-300 bg-purple-50",
  };

  const text = {
    amber: "text-amber-950",
    blue: "text-blue-950",
    green: "text-green-950",
    purple: "text-purple-950",
  };

  return (
    <div className={`rounded-3xl border p-6 shadow-sm ${shell[tone]}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className={`text-2xl font-extrabold ${text[tone]}`}>{title}</h2>
          <p className={`mt-2 max-w-3xl text-base font-semibold ${text[tone]}`}>
            {message}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill tone={alpacaConnected ? "green" : "amber"}>
              Alpaca {alpacaConnected ? "Connected" : "Needed"}
            </StatusPill>
            <StatusPill tone={okxConnected ? "green" : "amber"}>
              OKX {okxConnected ? "Connected" : "Needed"}
            </StatusPill>
            <StatusPill tone={paperTradingEnabled ? "green" : "slate"}>
              Paper {paperTradingEnabled ? "Active" : "Off"}
            </StatusPill>
            <StatusPill tone={tradingEnabled ? "purple" : "slate"}>
              Live {tradingEnabled ? "Active" : "Off"}
            </StatusPill>
          </div>
        </div>

        <div className="shrink-0">{action}</div>
      </div>
    </div>
  );
}

function QuickStartGuide({ onConnect, onPaper, onLive }) {
  const [expanded, setExpanded] = useState(true);

  const steps = [
    {
      title: "Connect API keys",
      description: "Add Alpaca for stocks and OKX for crypto.",
      action: "Connect Keys",
      onClick: onConnect,
    },
    {
      title: "Start paper trading",
      description: `Practice with $${PAPER_TRADING_BALANCE.toLocaleString()} virtual funds.`,
      action: "Paper Trade",
      onClick: onPaper,
    },
    {
      title: "Choose a strategy",
      description: "Pick Conservative, Balanced, Momentum, or Arbitrage.",
      action: null,
    },
    {
      title: "Go live when ready",
      description: "Turn on live trading after testing with paper trading.",
      action: "Go Live",
      onClick: onLive,
    },
  ];

  return (
    <Card className="border-indigo-200 bg-indigo-50">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎓</span>
          <div>
            <h3 className="text-xl font-extrabold text-indigo-950">
              Quick Start Guide
            </h3>
            <p className="text-sm font-semibold text-indigo-800">
              Follow these steps in order.
            </p>
          </div>
        </div>

        <span className="text-xl font-extrabold text-indigo-700">
          {expanded ? "−" : "+"}
        </span>
      </button>

      {expanded && (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-2xl border border-indigo-100 bg-white p-4"
            >
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-extrabold text-white">
                {index + 1}
              </div>

              <div className="text-base font-extrabold text-slate-950">
                {step.title}
              </div>

              <p className="mt-1 min-h-[44px] text-sm font-medium text-slate-600">
                {step.description}
              </p>

              {step.action && (
                <button
                  onClick={step.onClick}
                  className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-extrabold text-indigo-800 hover:bg-indigo-100"
                >
                  {step.action}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function TradingModeCard({
  title,
  emoji,
  description,
  active,
  disabled,
  activeText,
  inactiveText,
  onStart,
  onStop,
  warning,
}) {
  return (
    <Card
      className={
        active
          ? "border-green-300 bg-green-50"
          : disabled
          ? "bg-slate-50 opacity-90"
          : "bg-white"
      }
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{emoji}</span>
            <h3 className="text-xl font-extrabold text-slate-950">{title}</h3>
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-600">
            {description}
          </p>

          {warning && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
              {warning}
            </p>
          )}

          <div className="mt-4">
            <StatusPill tone={active ? "green" : "slate"}>
              {active ? activeText : inactiveText}
            </StatusPill>
          </div>
        </div>

        <div className="shrink-0">
          {active ? (
            <DangerButton onClick={onStop}>Stop</DangerButton>
          ) : (
            <PrimaryButton onClick={onStart} disabled={disabled}>
              Start
            </PrimaryButton>
          )}
        </div>
      </div>
    </Card>
  );
}

function StrategyCard({
  strategy,
  active,
  saving,
  onSelect,
}) {
  return (
    <button
      onClick={onSelect}
      disabled={saving}
      className={`w-full rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-70 ${
        active
          ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{strategy.emoji}</span>
          <div>
            <div className="text-lg font-extrabold text-slate-950">
              {strategy.name}
            </div>
            <div className="text-xs font-bold text-slate-500">
              Best for: {strategy.bestFor}
            </div>
          </div>
        </div>

        <span
          className={`rounded-full border px-2 py-1 text-xs font-extrabold ${riskClass(
            strategy.risk
          )}`}
        >
          {strategy.risk}
        </span>
      </div>

      <p className="text-sm font-semibold text-slate-700">
        {strategy.description}
      </p>

      <p className="mt-2 text-sm font-medium text-slate-500">
        {strategy.plainEnglish}
      </p>

      <div className="mt-4 border-t border-slate-100 pt-3">
        {active ? (
          <StatusPill tone="purple">{saving ? "Updating..." : "Active Strategy"}</StatusPill>
        ) : (
          <StatusPill tone="slate">Tap to use</StatusPill>
        )}
      </div>
    </button>
  );
}

function ConnectionRow({ title, connected, helper, onConnect }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-base font-extrabold text-slate-950">{title}</div>
        <div className="text-sm font-medium text-slate-500">{helper}</div>
      </div>

      <div className="flex items-center gap-3">
        <StatusPill tone={connected ? "green" : "amber"}>
          {connected ? "Connected" : "Needed"}
        </StatusPill>

        {!connected && (
          <SecondaryButton onClick={onConnect} className="px-3 py-2">
            Connect
          </SecondaryButton>
        )}
      </div>
    </div>
  );
}

function CommunityTrades({ trades }) {
  return (
    <Card>
      <SectionTitle>🌍 Community Trades</SectionTitle>

      {trades.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
          No community trades yet.
        </div>
      ) : (
        <div className="max-h-80 space-y-3 overflow-auto">
          {trades.map((trade, index) => {
            const pnl = Number(trade.pnl_usd || 0);
            const positive = pnl >= 0;

            return (
              <div
                key={trade.id || index}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-slate-950">
                      {trade.symbol || "Unknown"}
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                      {trade.bot || trade.exchange || "bot"}
                    </span>
                  </div>

                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    {anonymizeEmail(trade.user_email, index)}
                  </div>
                </div>

                <div
                  className={`text-sm font-extrabold ${
                    positive ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {usd(pnl)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function HelpfulResources() {
  const resources = [
    {
      title: "📚 Trading Guide",
      desc: "Learn how Imali trades",
      url: "/guides/trading",
    },
    {
      title: "🔧 API Setup",
      desc: "Connect OKX and Alpaca",
      url: "/guides/api-setup",
    },
    {
      title: "❓ FAQ",
      desc: "Common beginner questions",
      url: "/faq",
    },
    {
      title: "💬 Support",
      desc: "Get help",
      url: "/support",
    },
  ];

  return (
    <Card>
      <SectionTitle>📚 Helpful Resources</SectionTitle>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {resources.map((resource) => (
          <a
            key={resource.title}
            href={resource.url}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            <div className="font-extrabold text-slate-950">{resource.title}</div>
            <div className="mt-1 text-sm font-medium text-slate-500">
              {resource.desc}
            </div>
          </a>
        ))}
      </div>
    </Card>
  );
}

function LiveConfirmModal({ open, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h3 className="text-2xl font-extrabold text-slate-950">
          Confirm Live Trading
        </h3>

        <p className="mt-3 text-sm font-semibold text-slate-600">
          Live trading uses real money through your connected exchange accounts.
        </p>

        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <div className="font-extrabold text-amber-950">Risk reminder</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-amber-900">
            <li>You can lose money.</li>
            <li>Start small.</li>
            <li>You can stop live trading anytime.</li>
            <li>Paper trading is safer for testing.</li>
          </ul>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <WarningButton onClick={onConfirm}>Enable Live</WarningButton>
          <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
        </div>
      </div>
    </div>
  );
}

/* ================= MAIN COMPONENT ================= */

export default function MemberDashboard() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const [series, setSeries] = useState([]);

  const [integrations, setIntegrations] = useState({
    wallet_connected: false,
    alpaca_connected: false,
    okx_connected: false,
  });

  const [trial, setTrial] = useState(null);
  const [currentStrategy, setCurrentStrategy] = useState("mean_reversion");
  const [savingStrategy, setSavingStrategy] = useState("");
  const [strategyMessage, setStrategyMessage] = useState("");

  const [communityTrades, setCommunityTrades] = useState([]);
  const [tradingEnabled, setTradingEnabled] = useState(false);
  const [paperTradingEnabled, setPaperTradingEnabled] = useState(false);

  const [showApiModal, setShowApiModal] = useState(false);
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);

  const [togglingTrading, setTogglingTrading] = useState(false);
  const [togglingPaper, setTogglingPaper] = useState(false);

  const loadDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);

    try {
      const me = await BotAPI.getMe(true);

      if (!me?.id && !me?.email) {
        BotAPI.clearToken?.();
        BotAPI.clearApiKey?.();
        nav("/login");
        return;
      }

      setUser(me);
      setTradingEnabled(me?.trading_enabled === true);
      setPaperTradingEnabled(me?.paper_trading_enabled === true);

      const [
        statsResult,
        integrationsResult,
        strategiesResult,
        globalTradesResult,
        trialResult,
      ] = await Promise.allSettled([
        BotAPI.getUserTradingStats(30, true),
        BotAPI.getIntegrationStatus(true),
        BotAPI.getTradingStrategies(true),
        BotAPI.getGlobalTrades({ limit: 20, skipCache: true }),
        BotAPI.getTrialStatus ? BotAPI.getTrialStatus(true) : Promise.resolve(null),
      ]);

      const statsPayload =
        statsResult.status === "fulfilled" ? statsResult.value : null;

      const integrationsPayload =
        integrationsResult.status === "fulfilled" ? integrationsResult.value : null;

      const strategiesPayload =
        strategiesResult.status === "fulfilled" ? strategiesResult.value : null;

      const tradesPayload =
        globalTradesResult.status === "fulfilled"
          ? globalTradesResult.value
          : null;

      const trialPayload =
        trialResult.status === "fulfilled" ? trialResult.value : null;

      const summary = extractSummary(statsPayload);
      const dailySeries = extractDailySeries(statsPayload);

      setStats(summary);
      setSeries(dailySeries);

      setIntegrations(
        integrationsPayload || {
          wallet_connected: false,
          alpaca_connected: false,
          okx_connected: false,
        }
      );

      setCurrentStrategy(
        normalizeStrategyId(
          strategiesPayload?.current_strategy ||
            strategiesPayload?.data?.current_strategy ||
            me?.strategy ||
            "mean_reversion"
        )
      );

      setCommunityTrades(
        Array.isArray(tradesPayload?.trades) ? tradesPayload.trades : []
      );

      setTrial(
        trialPayload || {
          trial_status: "trial",
          paper_trading_enabled: me?.paper_trading_enabled === true,
          seconds_remaining: 0,
        }
      );
    } catch (err) {
      console.error("Failed to load member dashboard:", err);

      if (String(err?.message || "").toLowerCase().includes("invalid")) {
        BotAPI.clearToken?.();
        BotAPI.clearApiKey?.();
        nav("/login");
        return;
      }

      setStats({});
      setSeries([]);
      setCommunityTrades([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alpacaConnected = !!integrations.alpaca_connected;
  const okxConnected = !!integrations.okx_connected;
  const bothConnected = alpacaConnected && okxConnected;

  const displaySeries = useMemo(
    () =>
      buildDisplaySeries({
        series,
        stats,
        paperTradingEnabled,
        tradingEnabled,
      }),
    [series, stats, paperTradingEnabled, tradingEnabled]
  );

  const displayStats = useMemo(() => {
    const active = paperTradingEnabled || tradingEnabled;

    return {
      total_pnl: Number(stats.total_pnl || 0),
      win_rate: Number(stats.win_rate || 0),
      total_trades: Math.max(Number(stats.total_trades || 0), active ? 1 : 0),
      wins: Number(stats.wins || 0),
      losses: Number(stats.losses || 0),
      current_streak: Number(stats.current_streak || 0),
    };
  }, [stats, paperTradingEnabled, tradingEnabled]);

  const readiness = useMemo(() => {
    let score = 0;

    if (alpacaConnected) score += 25;
    if (okxConnected) score += 25;
    if (paperTradingEnabled) score += 20;
    if (currentStrategy) score += 15;
    if (tradingEnabled) score += 15;

    return Math.min(100, score);
  }, [
    alpacaConnected,
    okxConnected,
    paperTradingEnabled,
    currentStrategy,
    tradingEnabled,
  ]);

  const achievements = useMemo(() => {
    const unlocked = [];

    if (displayStats.total_trades > 0) unlocked.push("first_trade");
    if (displayStats.current_streak >= 7) unlocked.push("streak_7");
    if (displayStats.total_trades >= 50) unlocked.push("trades_50");
    if (displayStats.total_pnl > 0) unlocked.push("profitable");
    if (bothConnected) unlocked.push("api_ready");

    return unlocked;
  }, [displayStats, bothConnected]);

  const lineData = useMemo(
    () => ({
      labels: displaySeries.map((p) => p.date || todayLabel()),
      datasets: [
        {
          label: "PnL",
          data: displaySeries.map((p) => Number(p.pnl || 0)),
          borderColor: "#4f46e5",
          backgroundColor: "rgba(79, 70, 229, 0.12)",
          fill: true,
          tension: 0.35,
        },
      ],
    }),
    [displaySeries]
  );

  const doughnutData = useMemo(() => {
    const wins = Number(displayStats.wins || 0);
    const losses = Number(displayStats.losses || 0);

    return {
      labels: ["Wins", "Losses"],
      datasets: [
        {
          data: wins + losses > 0 ? [wins, losses] : [1, 0],
          backgroundColor: ["#10b981", "#ef4444"],
          borderWidth: 0,
        },
      ],
    };
  }, [displayStats]);

  const barData = useMemo(
    () => ({
      labels: displaySeries.slice(-7).map((p) => p.date || todayLabel()),
      datasets: [
        {
          label: "Trades",
          data: displaySeries.slice(-7).map((p) => Number(p.trades || 0)),
          backgroundColor: "#6366f1",
        },
      ],
    }),
    [displaySeries]
  );

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#0f172a",
          font: {
            weight: "bold",
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#334155" },
        grid: { color: "rgba(148, 163, 184, 0.25)" },
      },
      y: {
        ticks: { color: "#334155" },
        grid: { color: "rgba(148, 163, 184, 0.25)" },
      },
    },
  };

  const handleTogglePaperTrading = async (enabled) => {
    if (enabled && !bothConnected) {
      setShowApiModal(true);
      return;
    }

    setTogglingPaper(true);

    try {
      if (BotAPI.togglePaperTrading) {
        const result = await BotAPI.togglePaperTrading(enabled);

        if (result?.success === false) {
          throw new Error(result?.error || "Failed to update paper trading.");
        }
      }

      setPaperTradingEnabled(enabled);

      setUser((prev) =>
        prev ? { ...prev, paper_trading_enabled: enabled } : prev
      );

      setStats((prev) => ({
        ...prev,
        total_trades: Math.max(Number(prev.total_trades || 0), enabled ? 1 : 0),
      }));

      await loadDashboard(true);
    } catch (err) {
      alert(err?.message || "Failed to update paper trading.");
    } finally {
      setTogglingPaper(false);
    }
  };

  const handleToggleTrading = async (enabled) => {
    if (enabled && !bothConnected) {
      setShowApiModal(true);
      return;
    }

    setTogglingTrading(true);

    try {
      const result = await BotAPI.toggleTrading(enabled);

      if (result?.success === false) {
        throw new Error(result?.error || "Failed to update live trading.");
      }

      setTradingEnabled(enabled);

      setUser((prev) => (prev ? { ...prev, trading_enabled: enabled } : prev));

      setStats((prev) => ({
        ...prev,
        total_trades: Math.max(Number(prev.total_trades || 0), enabled ? 1 : 0),
      }));

      await loadDashboard(true);
    } catch (err) {
      alert(err?.message || "Failed to update live trading.");
    } finally {
      setTogglingTrading(false);
      setShowLiveConfirm(false);
    }
  };

  const handleStrategyChange = async (strategy) => {
    if (strategy.id === currentStrategy) return;

    const previous = currentStrategy;

    setSavingStrategy(strategy.id);
    setStrategyMessage("");
    setCurrentStrategy(strategy.id);

    try {
      const result = await BotAPI.updateUserStrategy(strategy.id);

      if (result?.success === false) {
        throw new Error(result?.error || "Failed to update strategy.");
      }

      const saved = getStrategyFromResult(result, strategy.id);

      setCurrentStrategy(saved);
      setUser((prev) => (prev ? { ...prev, strategy: saved } : prev));
      setStrategyMessage(`${strategy.name} strategy is now active.`);
    } catch (err) {
      setCurrentStrategy(previous);
      setStrategyMessage(err?.message || "Failed to update strategy.");
    } finally {
      setSavingStrategy("");
      setTimeout(() => setStrategyMessage(""), 3500);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6 text-center">
        <div>
          <div className="text-2xl font-extrabold text-slate-950">
            Loading your dashboard…
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-500">
            Getting your trading status, stats, and connections.
          </div>
        </div>
      </div>
    );
  }

  const activeStrategy =
    STRATEGIES.find((s) => s.id === currentStrategy) || STRATEGIES[0];

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-950 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-950">
              Welcome back 👋
            </h1>

            <p className="mt-2 max-w-3xl text-base font-semibold text-slate-600">
              Start with paper trading, watch the charts, then turn on live
              trading when you are ready.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusPill tone={paperTradingEnabled ? "green" : "slate"}>
                Paper {paperTradingEnabled ? "Active" : "Off"}
              </StatusPill>

              <StatusPill tone={tradingEnabled ? "purple" : "slate"}>
                Live {tradingEnabled ? "Active" : "Off"}
              </StatusPill>

              <StatusPill tone={bothConnected ? "green" : "amber"}>
                Setup {bothConnected ? "Complete" : "Needs Keys"}
              </StatusPill>

              <StatusPill tone="blue">
                Strategy: {activeStrategy.name}
              </StatusPill>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <SecondaryButton onClick={() => loadDashboard(true)} disabled={refreshing}>
              {refreshing ? "Refreshing..." : "Refresh"}
            </SecondaryButton>

            <SecondaryButton onClick={() => setShowApiModal(true)}>
              Connect API Keys
            </SecondaryButton>

            <SecondaryButton onClick={() => nav("/billing-dashboard")}>
              Billing
            </SecondaryButton>
          </div>
        </div>

        {/* Main beginner status */}
        <NextStepCard
          alpacaConnected={alpacaConnected}
          okxConnected={okxConnected}
          paperTradingEnabled={paperTradingEnabled}
          tradingEnabled={tradingEnabled}
          onConnect={() => setShowApiModal(true)}
          onStartPaper={() => handleTogglePaperTrading(true)}
          onStopPaper={() => handleTogglePaperTrading(false)}
          onStartLive={() => setShowLiveConfirm(true)}
          onStopLive={() => handleToggleTrading(false)}
          loading={togglingTrading || togglingPaper}
        />

        <QuickStartGuide
          onConnect={() => setShowApiModal(true)}
          onPaper={() => handleTogglePaperTrading(true)}
          onLive={() => setShowLiveConfirm(true)}
        />

        {/* Trial / status */}
        <Card className="border-blue-200 bg-blue-50">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-blue-950">
                🎯 Paper Trading
              </h2>
              <p className="mt-1 text-sm font-bold text-blue-900">
                {paperTradingEnabled
                  ? `Active with $${PAPER_TRADING_BALANCE.toLocaleString()} virtual funds.`
                  : `Available with $${PAPER_TRADING_BALANCE.toLocaleString()} virtual funds.`}
                {trial?.seconds_remaining
                  ? ` Trial time left: ${formatTimeLeft(trial.seconds_remaining)}.`
                  : ""}
              </p>
            </div>

            <StatusPill tone={paperTradingEnabled ? "green" : "blue"}>
              {paperTradingEnabled ? "Active" : "Ready"}
            </StatusPill>
          </div>
        </Card>

        {/* Trading Controls */}
        <div className="grid gap-5 xl:grid-cols-2">
          <TradingModeCard
            title="Paper Trading"
            emoji="📝"
            description={`Practice with $${PAPER_TRADING_BALANCE.toLocaleString()} virtual money. No real money is used.`}
            active={paperTradingEnabled}
            disabled={!bothConnected || togglingPaper}
            activeText="Paper Trading Active"
            inactiveText={bothConnected ? "Ready to Start" : "Connect Keys First"}
            onStart={() => handleTogglePaperTrading(true)}
            onStop={() => handleTogglePaperTrading(false)}
            warning={!bothConnected ? "Connect both OKX and Alpaca first." : ""}
          />

          <TradingModeCard
            title="Live Trading"
            emoji="💰"
            description="Trade with real funds through your connected exchange accounts."
            active={tradingEnabled}
            disabled={!bothConnected || togglingTrading}
            activeText="Live Trading Active"
            inactiveText={bothConnected ? "Ready When You Are" : "Connect Keys First"}
            onStart={() => setShowLiveConfirm(true)}
            onStop={() => handleToggleTrading(false)}
            warning={
              !bothConnected
                ? "Connect both OKX and Alpaca first."
                : "Live trading uses real money. Start small."
            }
          />
        </div>

        {/* Readiness */}
        <Card>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <SectionTitle>📊 Trading Readiness</SectionTitle>
              <p className="-mt-2 text-sm font-semibold text-slate-600">
                This score helps beginners know how complete their setup is.
              </p>
            </div>

            <div className="text-3xl font-extrabold text-slate-950">
              {readiness}%
            </div>
          </div>

          <div className="mt-4 h-4 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full ${
                readiness >= 80
                  ? "bg-green-500"
                  : readiness >= 50
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${readiness}%` }}
            />
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Stat
            label="Total Profit"
            value={usd(displayStats.total_pnl)}
            helper={tradingEnabled ? "Live + closed trades" : "Paper/live closed trades"}
          />
          <Stat
            label="Win Rate"
            value={pct(displayStats.win_rate)}
            helper="Closed trades"
          />
          <Stat
            label="Trades"
            value={displayStats.total_trades}
            helper={paperTradingEnabled || tradingEnabled ? "Trading active" : "No active trading yet"}
          />
          <Stat
            label="Current Mode"
            value={tradingEnabled ? "Live" : paperTradingEnabled ? "Paper" : "Setup"}
            helper="Your bot status"
          />
        </div>

        {/* Strategy */}
        <Card>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle>🎯 Choose Your Strategy</SectionTitle>

            {strategyMessage && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-extrabold text-indigo-800">
                {strategyMessage}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {STRATEGIES.map((strategy) => (
              <StrategyCard
                key={strategy.id}
                strategy={strategy}
                active={currentStrategy === strategy.id}
                saving={savingStrategy === strategy.id}
                onSelect={() => handleStrategyChange(strategy)}
              />
            ))}
          </div>
        </Card>

        {/* Charts */}
        <div className="grid gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <SectionTitle>📈 PnL Performance</SectionTitle>
            <div className="h-72">
              <Line data={lineData} options={chartOptions} />
            </div>
          </Card>

          <Card>
            <SectionTitle>🥇 Win / Loss</SectionTitle>
            <div className="h-72">
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      labels: {
                        color: "#0f172a",
                        font: { weight: "bold" },
                      },
                    },
                  },
                }}
              />
            </div>
          </Card>
        </div>

        <Card>
          <SectionTitle>📊 Trade Count — Last 7 Days</SectionTitle>
          <div className="h-72">
            <Bar data={barData} options={chartOptions} />
          </div>
        </Card>

        {/* Connections + Community */}
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <SectionTitle>🔌 Required Connections</SectionTitle>

            <div className="space-y-3">
              <ConnectionRow
                title="Alpaca"
                connected={alpacaConnected}
                helper="Needed for stock trading."
                onConnect={() => setShowApiModal(true)}
              />

              <ConnectionRow
                title="OKX"
                connected={okxConnected}
                helper="Needed for crypto trading."
                onConnect={() => setShowApiModal(true)}
              />

              <ConnectionRow
                title="Wallet"
                connected={!!integrations.wallet_connected}
                helper="Optional for DeFi features."
                onConnect={() => nav("/activation")}
              />
            </div>
          </Card>

          <CommunityTrades trades={communityTrades} />
        </div>

        {/* Features */}
        <Card>
          <SectionTitle>✅ Available Features</SectionTitle>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              {
                title: "Paper Trading",
                desc: "Practice before risking real money.",
                status: "Unlocked",
              },
              {
                title: "Live Trading",
                desc: "Available after API setup.",
                status: bothConnected ? "Ready" : "Needs Keys",
              },
              {
                title: "Stocks",
                desc: "Trade through Alpaca.",
                status: alpacaConnected ? "Ready" : "Needs Alpaca",
              },
              {
                title: "Crypto Spot",
                desc: "Trade through OKX.",
                status: okxConnected ? "Ready" : "Needs OKX",
              },
              {
                title: "Strategies",
                desc: "Choose Conservative, Balanced, Momentum, or Arbitrage.",
                status: "Available",
              },
              {
                title: "Support",
                desc: "Beginner help and setup resources.",
                status: "Available",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-extrabold text-slate-950">
                      {feature.title}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-600">
                      {feature.desc}
                    </div>
                  </div>

                  <StatusPill
                    tone={
                      feature.status.includes("Needs")
                        ? "amber"
                        : feature.status === "Ready"
                        ? "green"
                        : "blue"
                    }
                  >
                    {feature.status}
                  </StatusPill>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Achievements */}
        <Card>
          <SectionTitle>🏆 Achievements</SectionTitle>

          <div className="flex flex-wrap gap-3">
            {ACHIEVEMENTS.map((achievement) => {
              const unlocked = achievements.includes(achievement.id);

              return (
                <div
                  key={achievement.id}
                  className={`rounded-2xl border px-4 py-3 text-sm font-extrabold ${
                    unlocked
                      ? "border-green-300 bg-green-50 text-green-800"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  {achievement.icon} {achievement.label}
                </div>
              );
            })}
          </div>
        </Card>

        <HelpfulResources />

        {/* Main action buttons */}
        <div className="grid gap-4 md:grid-cols-3">
          <PrimaryButton onClick={() => nav("/trade-demo")}>
            Paper Trade Demo
          </PrimaryButton>

          <WarningButton
            onClick={() => {
              if (!bothConnected) setShowApiModal(true);
              else setShowLiveConfirm(true);
            }}
          >
            Start Live Trading
          </WarningButton>

          <SecondaryButton onClick={() => nav("/activation")}>
            Complete Activation
          </SecondaryButton>
        </div>
      </div>

      <ApiKeysModal
        open={showApiModal}
        onClose={() => setShowApiModal(false)}
        onSaved={() => loadDashboard(true)}
      />

      <LiveConfirmModal
        open={showLiveConfirm}
        onCancel={() => setShowLiveConfirm(false)}
        onConfirm={() => handleToggleTrading(true)}
      />
    </div>
  );
}