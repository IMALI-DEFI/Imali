// src/pages/member/MemberDashboard.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BotAPI from "../../utils/BotAPI";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const STRATEGY_MAP = {
  mean_reversion: {
    id: "mean_reversion",
    label: "Conservative",
    emoji: "🛡️",
    description: "Looks for dips and safe rebounds.",
    details: "Lower risk. Better for steady moves and smaller swings.",
    riskLevel: "Low",
    backendName: "Mean Reversion",
  },
  ai_weighted: {
    id: "ai_weighted",
    label: "Balanced",
    emoji: "⚖️",
    description: "Smart mix of signals.",
    details: "Balanced risk and reward. Good default strategy.",
    riskLevel: "Medium",
    backendName: "AI Weighted",
  },
  momentum: {
    id: "momentum",
    label: "Aggressive",
    emoji: "🔥",
    description: "Follows strong market trends.",
    details: "Higher risk. Designed for bigger moves.",
    riskLevel: "High",
    backendName: "Momentum",
  },
  arbitrage: {
    id: "arbitrage",
    label: "Arbitrage",
    emoji: "🔄",
    description: "Uses price differences across venues.",
    details: "Usually lower risk when supported by the exchange setup.",
    riskLevel: "Low",
    backendName: "Arbitrage",
  },
};

const PLANS = [
  {
    value: "starter",
    label: "Starter",
    icon: "🎟️",
    priceLabel: "Free",
    color: "blue",
    features: ["Stock Trading", "Paper Trading"],
  },
  {
    value: "pro",
    label: "Pro",
    icon: "⭐",
    priceLabel: "$19/month",
    color: "purple",
    features: ["Stock Trading", "Crypto Trading", "Live Trading"],
  },
  {
    value: "elite",
    label: "Elite",
    icon: "👑",
    priceLabel: "$49/month",
    color: "amber",
    features: ["Everything + DEX Sniper", "Futures Trading"],
  },
  {
    value: "bundle",
    label: "All Access",
    icon: "🎁",
    priceLabel: "$199/month",
    color: "emerald",
    features: ["Everything + Priority Support", "Early Access"],
  },
];

const defaultDashboardData = {
  trades: [],
  positions: [],
  executions: [],
  stats: {
    total_trades: 0,
    total_pnl: 0,
    wins: 0,
    losses: 0,
    win_rate: 0,
    avg_pnl: 0,
    best_trade: 0,
    worst_trade: 0,
    avg_score: 0,
    avg_confidence: 0,
  },
  dailyPerformance: [],
  integrations: {
    wallet_connected: false,
    alpaca_connected: false,
    okx_connected: false,
  },
};

const safeNumber = (v, fallback = 0) => {
  const num = Number(v);
  return Number.isFinite(num) ? num : fallback;
};

const formatMoney = (n) => {
  const num = safeNumber(n);
  const sign = num >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(num).toFixed(2)}`;
};

const formatPlainMoney = (n) => `$${safeNumber(n).toFixed(2)}`;

const timeAgo = (timestamp) => {
  if (!timestamp) return "just now";
  try {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const sec = Math.floor(diffMs / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);

    if (sec < 30) return "just now";
    if (sec < 60) return `${sec} seconds ago`;
    if (min < 60) return `${min} minutes ago`;
    if (hr < 24) return `${hr} hours ago`;
    return `${Math.floor(hr / 24)} days ago`;
  } catch {
    return "—";
  }
};

const getBotIcon = (botName) => {
  const name = String(botName || "").toLowerCase();
  if (name.includes("okx")) return "🔷";
  if (name.includes("futures")) return "📊";
  if (name.includes("stock")) return "📈";
  if (name.includes("sniper")) return "🦄";
  if (name.includes("coinbase")) return "🪙";
  return "🤖";
};

const getStrategyDisplay = (id) => {
  return (
    STRATEGY_MAP[id] || {
      id: id || "ai_weighted",
      label: "Balanced",
      emoji: "⚖️",
      description: "Current trading strategy",
      details: "Strategy details unavailable.",
      riskLevel: "Medium",
      backendName: id || "Strategy",
    }
  );
};

const getStrategyMeta = (value, backendStrategies = []) => {
  const display = getStrategyDisplay(value);
  const fromBackend = backendStrategies.find((s) => s.id === value);

  if (fromBackend) {
    return {
      ...fromBackend,
      name: display.label,
      description: display.description,
      details: display.details,
      risk_level: display.riskLevel,
      emoji: display.emoji,
    };
  }

  return {
    id: value || "ai_weighted",
    name: display.label,
    backend_name: display.backendName,
    description: display.description,
    details: display.details,
    risk_level: display.riskLevel,
    emoji: display.emoji,
  };
};

function StatCard({ title, value, color = "green", hint }) {
  const colors = {
    green: "text-green-700",
    red: "text-red-700",
    purple: "text-purple-700",
    blue: "text-blue-700",
    orange: "text-orange-700",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</div>
      <div className={`mt-1 text-2xl font-bold ${colors[color]}`}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-600">{hint}</div> : null}
    </div>
  );
}

function Section({ title, icon, children, right }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function TradeRow({ trade, showUser = false }) {
  const side = String(trade?.side || "").toLowerCase();
  const pnl = safeNumber(trade?.pnl_usd, 0);
  const symbol = trade?.symbol || "Unknown";
  const bot = trade?.bot || "Bot";
  const isOpen = trade?.status === "open";
  const isPaper = trade?.mode === "paper" || trade?.paper_trading === true;

  let borderColor = "border-l-gray-400";
  let badgeColor = "bg-gray-200 text-gray-800";
  let badgeText = side.toUpperCase() || "TRADE";

  if (isOpen) {
    borderColor = "border-l-blue-600";
    badgeColor = "bg-blue-100 text-blue-800";
    badgeText = "OPEN";
  } else if (side === "buy") {
    borderColor = "border-l-green-600";
    badgeColor = "bg-green-100 text-green-800";
  } else if (side === "sell") {
    borderColor = "border-l-red-600";
    badgeColor = "bg-red-100 text-red-800";
  }

  return (
    <div className={`flex items-center justify-between rounded-xl border border-gray-100 border-l-4 ${borderColor} bg-gray-50 p-3`}>
      <div className="flex items-center gap-3">
        <span className="text-lg">{getBotIcon(bot)}</span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{symbol}</span>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${badgeColor}`}>{badgeText}</span>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                isPaper ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
              }`}
            >
              {isPaper ? "📄 PAPER" : "💚 LIVE"}
            </span>
            {showUser && trade?.user_email ? (
              <span className="text-xs text-gray-500">{trade.user_email.split("@")[0]}</span>
            ) : null}
          </div>
          <div className="text-xs text-gray-600">
            {bot} • {timeAgo(trade?.created_at)}
          </div>
        </div>
      </div>

      <div className="text-right">
        {!isOpen ? (
          <div className={`text-sm font-bold ${pnl >= 0 ? "text-green-700" : "text-red-700"}`}>
            {formatMoney(pnl)}
          </div>
        ) : (
          <div className="text-sm font-medium text-gray-800">{formatPlainMoney(trade?.price)}</div>
        )}
        <div className="text-xs text-gray-500">{trade?.exchange || "—"}</div>
      </div>
    </div>
  );
}

function PositionRow({ position, strategies, onCancel }) {
  const strategyMeta = getStrategyMeta(position?.strategy, strategies);

  return (
    <div className="flex items-center justify-between rounded-xl border border-blue-100 border-l-4 border-l-blue-600 bg-blue-50 p-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-lg">{getBotIcon(position?.bot)}</span>
          <span className="text-sm font-semibold text-gray-900">{position?.symbol || "Unknown"}</span>
          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">OPEN</span>
        </div>
        <div className="text-xs text-gray-700">
          {strategyMeta.name} • {timeAgo(position?.created_at)}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right text-sm text-gray-900">
          <div className="font-medium">{formatPlainMoney(position?.entry_price)}</div>
          <div className="text-xs text-gray-500">Qty: {safeNumber(position?.qty).toFixed(4)}</div>
        </div>

        {onCancel ? (
          <button
            onClick={() => onCancel(position.id)}
            className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}

function BotExecutionRow({ execution, strategies }) {
  const status = String(execution?.status || "").toLowerCase();
  const strategyMeta = getStrategyMeta(execution?.strategy, strategies);

  const badge =
    status === "running" || status === "started"
      ? "bg-green-100 text-green-800"
      : status === "failed" || status === "error"
      ? "bg-red-100 text-red-800"
      : "bg-gray-200 text-gray-800";

  return (
    <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-lg">{getBotIcon(execution?.bot)}</span>
          <span className="text-sm font-semibold text-gray-900">{execution?.bot || "Bot"}</span>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge}`}>
            {execution?.status || "unknown"}
          </span>
        </div>
        <div className="text-xs text-gray-600">
          {strategyMeta.name} • {timeAgo(execution?.created_at || execution?.requested_at)}
        </div>
      </div>

      <div className="text-right text-xs font-medium text-gray-500">
        {execution?.mode || "mode unknown"}
      </div>
    </div>
  );
}

function StrategySelector({ currentStrategy, strategiesList, onStrategyChange }) {
  const [changing, setChanging] = useState(null);
  const [message, setMessage] = useState(null);

  const orderedStrategies = ["mean_reversion", "ai_weighted", "momentum", "arbitrage"]
    .map((id) => STRATEGY_MAP[id])
    .filter((s) => s && strategiesList.some((backend) => backend.id === s.id));

  const activeStrategy = getStrategyDisplay(currentStrategy);

  const handleSelect = async (strategyId) => {
    if (strategyId === currentStrategy) return;

    setChanging(strategyId);
    setMessage(null);

    try {
      const result = await BotAPI.updateUserStrategy(strategyId);
      if (!result?.success) throw new Error(result?.error || "Failed to update strategy");

      setMessage({
        type: "success",
        text: result?.message || "Trading strategy updated.",
      });

      await onStrategyChange(strategyId);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.message || "Could not update strategy.",
      });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setChanging(null);
    }
  };

  const riskBadgeClass = (risk) => {
    if (risk === "Low") return "bg-green-100 text-green-800";
    if (risk === "High") return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-green-700">
              Current strategy
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xl">{activeStrategy.emoji}</span>
              <span className="text-lg font-bold text-gray-900">{activeStrategy.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${riskBadgeClass(activeStrategy.riskLevel)}`}>
                {activeStrategy.riskLevel} Risk
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-700">{activeStrategy.details}</div>
          </div>
        </div>
      </div>

      {message ? (
        <div
          className={`rounded-xl p-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {orderedStrategies.map((strat) => {
          const isActive = currentStrategy === strat.id;
          const isChanging = changing === strat.id;

          return (
            <button
              key={strat.id}
              onClick={() => handleSelect(strat.id)}
              disabled={isChanging}
              className={`rounded-2xl border p-4 text-left transition hover:shadow-md ${
                isActive
                  ? "border-green-500 bg-green-50 ring-2 ring-green-200"
                  : "border-gray-200 bg-white"
              } disabled:opacity-60`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl">{strat.emoji}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${riskBadgeClass(strat.riskLevel)}`}>
                  {strat.riskLevel} Risk
                </span>
              </div>

              <div className="mt-3">
                <div className="text-base font-bold text-gray-900">{strat.label}</div>
                <div className="mt-1 text-sm text-gray-700">{strat.description}</div>
                <div className="mt-2 text-xs text-gray-500">{strat.details}</div>
              </div>

              <div className="mt-4">
                {isActive ? (
                  <div className="rounded-lg bg-green-600 px-3 py-2 text-center text-sm font-semibold text-white">
                    Active
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-100 px-3 py-2 text-center text-sm font-semibold text-gray-900">
                    {isChanging ? "Updating..." : "Use this strategy"}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ExchangeKeyForm({
  title,
  icon,
  connected,
  liveState,
  setLiveState,
  paperState,
  setPaperState,
  onSaveLive,
  onSavePaper,
  saving,
  requiresPassphrase = false,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <div>
            <div className="font-bold text-gray-900">{title}</div>
            <div className="text-xs text-gray-500">
              Save or replace your live and paper credentials.
            </div>
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            connected ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
          }`}
        >
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 text-sm font-bold text-gray-900">Paper Keys</div>
          <div className="space-y-2">
            <input
              type="text"
              value={paperState.apiKey}
              onChange={(e) => setPaperState({ ...paperState, apiKey: e.target.value })}
              placeholder="API Key"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            <input
              type="password"
              value={paperState.secret}
              onChange={(e) => setPaperState({ ...paperState, secret: e.target.value })}
              placeholder="Secret Key"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            {requiresPassphrase ? (
              <input
                type="password"
                value={paperState.passphrase}
                onChange={(e) => setPaperState({ ...paperState, passphrase: e.target.value })}
                placeholder="Passphrase"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            ) : null}
            <button
              onClick={onSavePaper}
              disabled={saving}
              className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Paper Keys"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 text-sm font-bold text-gray-900">Live Keys</div>
          <div className="space-y-2">
            <input
              type="text"
              value={liveState.apiKey}
              onChange={(e) => setLiveState({ ...liveState, apiKey: e.target.value })}
              placeholder="API Key"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            <input
              type="password"
              value={liveState.secret}
              onChange={(e) => setLiveState({ ...liveState, secret: e.target.value })}
              placeholder="Secret Key"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            {requiresPassphrase ? (
              <input
                type="password"
                value={liveState.passphrase}
                onChange={(e) => setLiveState({ ...liveState, passphrase: e.target.value })}
                placeholder="Passphrase"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            ) : null}
            <button
              onClick={onSaveLive}
              disabled={saving}
              className="w-full rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Live Keys"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApiConnectionsModal({ isOpen, onClose, activation, integrations, onRefresh }) {
  const [saving, setSaving] = useState("");

  const [alpacaPaper, setAlpacaPaper] = useState({ apiKey: "", secret: "" });
  const [alpacaLive, setAlpacaLive] = useState({ apiKey: "", secret: "" });

  const [okxPaper, setOkxPaper] = useState({ apiKey: "", secret: "", passphrase: "" });
  const [okxLive, setOkxLive] = useState({ apiKey: "", secret: "", passphrase: "" });

  if (!isOpen) return null;

  const saveAlpaca = async (mode) => {
    const payload = mode === "paper" ? alpacaPaper : alpacaLive;
    if (!payload.apiKey || !payload.secret) {
      alert(`Please enter both ${mode} Alpaca keys.`);
      return;
    }

    setSaving(`alpaca-${mode}`);
    try {
      const result = await BotAPI.connectAlpaca({
        api_key: payload.apiKey,
        api_secret: payload.secret,
        mode,
      });

      if (!result?.success) {
        throw new Error(result?.error || `Failed to save ${mode} Alpaca keys`);
      }

      alert(`Alpaca ${mode} keys saved.`);
      if (mode === "paper") setAlpacaPaper({ apiKey: "", secret: "" });
      if (mode === "live") setAlpacaLive({ apiKey: "", secret: "" });
      await onRefresh?.();
    } catch (err) {
      alert(err?.message || `Could not save ${mode} Alpaca keys.`);
    } finally {
      setSaving("");
    }
  };

  const saveOKX = async (mode) => {
    const payload = mode === "paper" ? okxPaper : okxLive;
    if (!payload.apiKey || !payload.secret || !payload.passphrase) {
      alert(`Please fill all ${mode} OKX fields.`);
      return;
    }

    setSaving(`okx-${mode}`);
    try {
      const result = await BotAPI.connectOKX({
        api_key: payload.apiKey,
        api_secret: payload.secret,
        passphrase: payload.passphrase,
        mode,
      });

      if (!result?.success) {
        throw new Error(result?.error || `Failed to save ${mode} OKX keys`);
      }

      alert(`OKX ${mode} keys saved.`);
      if (mode === "paper") setOkxPaper({ apiKey: "", secret: "", passphrase: "" });
      if (mode === "live") setOkxLive({ apiKey: "", secret: "", passphrase: "" });
      await onRefresh?.();
    } catch (err) {
      alert(err?.message || `Could not save ${mode} OKX keys.`);
    } finally {
      setSaving("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">API & Exchange Keys</h2>
            <p className="mt-1 text-sm text-gray-600">
              Manage paper and live credentials for Alpaca and OKX.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-2xl font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <ExchangeKeyForm
            title="Alpaca"
            icon="📈"
            connected={!!(activation?.alpaca_connected || integrations?.alpaca_connected)}
            liveState={alpacaLive}
            setLiveState={setAlpacaLive}
            paperState={alpacaPaper}
            setPaperState={setAlpacaPaper}
            onSaveLive={() => saveAlpaca("live")}
            onSavePaper={() => saveAlpaca("paper")}
            saving={saving.startsWith("alpaca")}
          />

          <ExchangeKeyForm
            title="OKX"
            icon="🔷"
            connected={!!(activation?.okx_connected || integrations?.okx_connected)}
            liveState={okxLive}
            setLiveState={setOkxLive}
            paperState={okxPaper}
            setPaperState={setOkxPaper}
            onSaveLive={() => saveOKX("live")}
            onSavePaper={() => saveOKX("paper")}
            saving={saving.startsWith("okx")}
            requiresPassphrase={true}
          />
        </div>
      </div>
    </div>
  );
}

function PerformanceChart({ points, period, onChange }) {
  const [chartType, setChartType] = useState("line");

  const chartData = useMemo(() => {
    const rows = Array.isArray(points) ? points : [];
    const labels = rows.map((d) => {
      const date = new Date(d?.date || 0);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const pnlData = rows.map((d) => safeNumber(d?.pnl, 0));
    const tradesData = rows.map((d) => safeNumber(d?.trades, 0));

    let running = 0;
    const cumulative = pnlData.map((v) => {
      running += v;
      return running;
    });

    return {
      labels,
      datasets: [
        {
          label: "Daily PnL",
          data: pnlData,
          borderColor: "#059669",
          backgroundColor: "rgba(5,150,105,0.12)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: "Total PnL Over Time",
          data: cumulative,
          borderColor: "#7c3aed",
          borderDash: [6, 4],
          borderWidth: 2,
          fill: false,
          pointRadius: 0,
        },
        {
          label: "Number of Trades",
          data: tradesData,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.12)",
          fill: false,
          pointRadius: 0,
          hidden: true,
        },
      ],
    };
  }, [points]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { font: { size: 11 }, color: "#111827" },
      },
    },
    scales: {
      x: {
        ticks: { color: "#374151" },
        grid: { color: "#e5e7eb" },
      },
      y: {
        ticks: {
          color: "#374151",
          callback: (v) => `$${v}`,
        },
        grid: { color: "#e5e7eb" },
      },
    },
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {["7d", "30d", "90d"].map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold ${
              period === p ? "bg-green-600 text-white" : "bg-gray-200 text-gray-900"
            }`}
          >
            {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
          </button>
        ))}

        <button
          onClick={() => setChartType(chartType === "line" ? "bar" : "line")}
          className="rounded-lg bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-900"
        >
          {chartType === "line" ? "📊 Bar" : "📈 Line"}
        </button>
      </div>

      <div className="h-64">
        {chartData.labels.length > 0 ? (
          chartType === "line" ? (
            <Line data={chartData} options={options} />
          ) : (
            <Bar data={chartData} options={options} />
          )
        ) : (
          <div className="flex h-full items-center justify-center text-gray-600">
            No trading history yet
          </div>
        )}
      </div>
    </div>
  );
}

function BillingSection({ user, activation }) {
  const tier = user?.tier || "starter";
  const hasCard = activation?.has_card_on_file || activation?.billing_complete;
  const plan = PLANS.find((p) => p.value === tier) || PLANS[0];

  return (
    <Section title="Your Plan & Billing" icon="💳">
      <div className="space-y-4">
        <div
          className={`rounded-2xl border border-gray-200 bg-gradient-to-r p-4 ${
            plan.color === "emerald"
              ? "from-emerald-50 to-green-50"
              : plan.color === "amber"
              ? "from-amber-50 to-orange-50"
              : plan.color === "purple"
              ? "from-purple-50 to-indigo-50"
              : "from-blue-50 to-cyan-50"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{plan.icon}</span>
                <span className="text-lg font-bold text-gray-900">{plan.label}</span>
              </div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{plan.priceLabel}</div>
            </div>

            <Link
              to="/billingDashboard"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:shadow"
            >
              Manage Billing →
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {plan.features.map((feature, index) => (
              <span
                key={index}
                className="rounded-full bg-white/80 px-2 py-1 text-xs font-medium text-gray-900"
              >
                ✓ {feature}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">💳</span>
            <div>
              <div className="text-sm font-semibold text-gray-900">Payment Method</div>
              <div className="text-xs text-gray-600">
                {hasCard ? "Card on file ✓" : "No card added yet"}
              </div>
            </div>
          </div>

          <Link
            to="/billingDashboard"
            className="text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            {hasCard ? "Update Card" : "Add Card →"}
          </Link>
        </div>
      </div>
    </Section>
  );
}

function ConnectionsSection({ activation, integrations, onOpenApiModal }) {
  return (
    <Section title="Connections" icon="🔌">
      <div className="space-y-3">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-900">Alpaca</div>
              <div className="text-xs text-gray-500">Stocks trading connection</div>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                activation?.alpaca_connected || integrations?.alpaca_connected
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {activation?.alpaca_connected || integrations?.alpaca_connected
                ? "Connected"
                : "Not connected"}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-900">OKX</div>
              <div className="text-xs text-gray-500">Crypto exchange connection</div>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                activation?.okx_connected || integrations?.okx_connected
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {activation?.okx_connected || integrations?.okx_connected
                ? "Connected"
                : "Not connected"}
            </span>
          </div>
        </div>

        <button
          onClick={onOpenApiModal}
          className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-black"
        >
          Manage API Keys
        </button>
      </div>
    </Section>
  );
}

function GlobalTradesFeed() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  const fetchGlobalTrades = useCallback(async () => {
    try {
      const result = (await BotAPI.getGlobalTrades?.({ limit: 20 })) || {
        success: false,
        trades: [],
      };

      if (mountedRef.current) {
        if (result.success && Array.isArray(result.trades)) {
          setTrades(result.trades);
          setError("");
        } else {
          setError("Could not load community trades.");
        }
        setLoading(false);
      }
    } catch {
      if (mountedRef.current) {
        setError("Failed to load global trades.");
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchGlobalTrades();

    const interval = setInterval(fetchGlobalTrades, 30000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchGlobalTrades]);

  return (
    <Section title="Community Trades" icon="🌍">
      {loading ? (
        <div className="py-6 text-center text-gray-600">Loading community trades...</div>
      ) : error ? (
        <div className="py-6 text-center text-red-700">{error}</div>
      ) : trades.length === 0 ? (
        <div className="py-6 text-center text-gray-600">No community trades yet.</div>
      ) : (
        <div className="max-h-96 space-y-2 overflow-auto">
          {trades.map((trade, i) => (
            <TradeRow key={trade.id || i} trade={trade} showUser={true} />
          ))}
        </div>
      )}
    </Section>
  );
}

export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, activation, refreshActivation, loading: authLoading } = useAuth();

  const [dashboardData, setDashboardData] = useState(defaultDashboardData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("30d");
  const [showApiModal, setShowApiModal] = useState(false);
  const [strategyOptions, setStrategyOptions] = useState(
    Object.values(STRATEGY_MAP).map((s) => ({ id: s.id, name: s.backendName }))
  );
  const [currentStrategy, setCurrentStrategy] = useState(user?.strategy || "ai_weighted");
  const [cancellingAll, setCancellingAll] = useState(false);

  const mountedRef = useRef(true);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    setCurrentStrategy(user?.strategy || "ai_weighted");
  }, [user?.strategy]);

  const strategyMeta = useMemo(
    () => getStrategyMeta(currentStrategy, strategyOptions),
    [currentStrategy, strategyOptions]
  );

  const loadStrategies = useCallback(async () => {
    try {
      const result = await BotAPI.getTradingStrategies(true);
      if (!mountedRef.current) return;

      if (result?.success && Array.isArray(result.strategies) && result.strategies.length > 0) {
        setStrategyOptions(result.strategies);
        setCurrentStrategy(result.current_strategy || user?.strategy || "ai_weighted");
      }
    } catch (err) {
      console.error("Failed to load strategies:", err);
    }
  }, [user?.strategy]);

  const loadData = useCallback(
    async (silent = false) => {
      if (!user || isFetchingRef.current) return;

      isFetchingRef.current = true;
      if (!silent) setLoading(true);
      setRefreshing(true);

      try {
        const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;

        const [
          tradesRes,
          statsRes,
          positionsRes,
          executionsRes,
          integrationsRes,
          strategiesRes,
        ] = await Promise.allSettled([
          BotAPI.getUserTrades({ limit: 50, skipCache: true }),
          BotAPI.getUserTradingStats(days, true),
          BotAPI.getUserPositions(true),
          BotAPI.getUserBotExecutions(20, true),
          BotAPI.getIntegrationStatus(true),
          BotAPI.getTradingStrategies(true),
        ]);

        if (!mountedRef.current) return;

        const trades =
          tradesRes.status === "fulfilled" && tradesRes.value?.success
            ? Array.isArray(tradesRes.value.trades)
              ? tradesRes.value.trades
              : []
            : [];

        const statsData =
          statsRes.status === "fulfilled" && statsRes.value ? statsRes.value.summary || {} : {};

        const dailyPerformance =
          statsRes.status === "fulfilled" && statsRes.value
            ? Array.isArray(statsRes.value.daily_performance)
              ? statsRes.value.daily_performance
              : []
            : [];

        const positions =
          positionsRes.status === "fulfilled" && positionsRes.value?.success
            ? Array.isArray(positionsRes.value.positions)
              ? positionsRes.value.positions
              : []
            : [];

        const executions =
          executionsRes.status === "fulfilled" && executionsRes.value?.success
            ? Array.isArray(executionsRes.value.executions)
              ? executionsRes.value.executions
              : []
            : [];

        const integrationsRaw =
          integrationsRes.status === "fulfilled" && integrationsRes.value
            ? integrationsRes.value
            : {};

        const integrations = {
          wallet_connected: !!integrationsRaw.wallet_connected,
          alpaca_connected: !!integrationsRaw.alpaca_connected,
          okx_connected: !!integrationsRaw.okx_connected,
        };

        if (strategiesRes.status === "fulfilled" && strategiesRes.value?.success) {
          const fetched = strategiesRes.value.strategies || [];
          if (fetched.length > 0) setStrategyOptions(fetched);
          setCurrentStrategy(strategiesRes.value.current_strategy || user?.strategy || "ai_weighted");
        }

        setDashboardData({
          trades,
          positions,
          executions,
          stats: {
            total_trades: safeNumber(statsData.total_trades, 0),
            total_pnl: safeNumber(statsData.total_pnl, 0),
            wins: safeNumber(statsData.wins, 0),
            losses: safeNumber(statsData.losses, 0),
            win_rate: safeNumber(statsData.win_rate, 0),
            avg_pnl: safeNumber(statsData.avg_pnl, 0),
            best_trade: safeNumber(statsData.best_trade, 0),
            worst_trade: safeNumber(statsData.worst_trade, 0),
            avg_score: safeNumber(statsData.avg_score, 0),
            avg_confidence: safeNumber(statsData.avg_confidence, 0),
          },
          dailyPerformance,
          integrations,
        });

        setError("");
      } catch {
        if (mountedRef.current) {
          setError("Could not load your dashboard data.");
        }
      } finally {
        if (mountedRef.current) {
          setRefreshing(false);
          setLoading(false);
          setInitialized(true);
        }
        isFetchingRef.current = false;
      }
    },
    [period, user]
  );

  const cancelAllPositions = async () => {
    if (!window.confirm("Are you sure you want to cancel all open positions?")) return;

    setCancellingAll(true);
    try {
      const result = await BotAPI.cancelAllPositions?.();
      if (!result?.success) throw new Error(result?.error || "Failed to cancel positions");

      alert("All open positions have been cancelled.");
      await loadData(true);
    } catch (err) {
      alert(err?.message || "Could not cancel positions.");
    } finally {
      setCancellingAll(false);
    }
  };

  const cancelSinglePosition = async (positionId) => {
    if (!window.confirm("Cancel this position?")) return;

    try {
      const result = await BotAPI.cancelPosition?.(positionId);
      if (!result?.success) throw new Error(result?.error || "Failed to cancel position");
      await loadData(true);
    } catch (err) {
      alert(err?.message || "Could not cancel position.");
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (user) loadData(false);
  }, [user, period, loadData]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setInitialized(true);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const timer = setInterval(() => {
      if (!isFetchingRef.current) loadData(true);
    }, 30000);

    return () => clearInterval(timer);
  }, [user, loadData]);

  useEffect(() => {
    if (user) loadStrategies();
  }, [user, loadStrategies]);

  const totalPnL = dashboardData.stats.total_pnl;
  const totalTrades = dashboardData.stats.total_trades;
  const wins = dashboardData.stats.wins;
  const losses = dashboardData.stats.losses;
  const winRate = dashboardData.stats.win_rate;
  const openPositions = dashboardData.positions.length;
  const activeExecutions = dashboardData.executions.filter((e) =>
    ["running", "started", "pending"].includes(String(e?.status || "").toLowerCase())
  ).length;

  const handleStrategyChange = async (newStrategyId) => {
    setCurrentStrategy(newStrategyId);
    await loadData(true);
  };

  if (authLoading || (!initialized && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
          <p className="font-medium text-gray-800">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="text-center">
          <p className="mb-4 font-medium text-gray-800">Please log in to see your dashboard.</p>
          <button
            onClick={() => navigate("/login")}
            className="rounded-xl bg-green-600 px-6 py-2 font-semibold text-white"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                👋 Hey, {user.email?.split("@")[0] || "there"}!
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Here’s a cleaner view of your trading account.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-300 disabled:opacity-50"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>

              <button
                onClick={() => setShowApiModal(true)}
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-black"
              >
                API & Keys
              </button>

              <Link
                to="/billingDashboard"
                className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-300"
              >
                Billing
              </Link>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
            {error}
          </div>
        ) : null}

        <Section title="Trading Strategy" icon="🎯">
          <StrategySelector
            currentStrategy={currentStrategy}
            strategiesList={strategyOptions}
            onStrategyChange={handleStrategyChange}
          />
        </Section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatCard
                title="Total Profit / Loss"
                value={formatMoney(totalPnL)}
                color={totalPnL >= 0 ? "green" : "red"}
                hint={`${totalTrades} total trades`}
              />
              <StatCard
                title="Win Rate"
                value={`${safeNumber(winRate).toFixed(1)}%`}
                color="purple"
                hint={`${wins} wins / ${losses} losses`}
              />
              <StatCard
                title="Open Positions"
                value={openPositions}
                color="blue"
                hint="Trades still running"
              />
              <StatCard
                title="Current Strategy"
                value={`${strategyMeta.emoji || "🎯"} ${strategyMeta.name}`}
                color="orange"
                hint={strategyMeta.details || strategyMeta.description}
              />
            </div>

            <Section title="Performance" icon="📈">
              <PerformanceChart
                points={dashboardData.dailyPerformance}
                period={period}
                onChange={setPeriod}
              />
            </Section>

            <Section
              title="Bot Activity"
              icon="🤖"
              right={<span className="text-xs font-semibold text-gray-500">{activeExecutions} active</span>}
            >
              {dashboardData.executions.length === 0 ? (
                <div className="py-6 text-center font-medium text-gray-600">
                  No recent bot activity yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {dashboardData.executions.slice(0, 6).map((execution, i) => (
                    <BotExecutionRow
                      key={execution.id || i}
                      execution={execution}
                      strategies={strategyOptions}
                    />
                  ))}
                </div>
              )}
            </Section>
          </div>

          <div className="space-y-5">
            <BillingSection user={user} activation={activation} />
            <ConnectionsSection
              activation={activation}
              integrations={dashboardData.integrations}
              onOpenApiModal={() => setShowApiModal(true)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Section
            title="Open Positions"
            icon="📍"
            right={
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">
                  {dashboardData.positions.length} open
                </span>
                {dashboardData.positions.length > 0 ? (
                  <button
                    onClick={cancelAllPositions}
                    disabled={cancellingAll}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {cancellingAll ? "..." : "Cancel All"}
                  </button>
                ) : null}
              </div>
            }
          >
            {dashboardData.positions.length === 0 ? (
              <div className="py-8 text-center font-medium text-gray-600">
                No open positions right now.
              </div>
            ) : (
              <div className="space-y-2">
                {dashboardData.positions.slice(0, 10).map((position, i) => (
                  <PositionRow
                    key={position.id || i}
                    position={position}
                    strategies={strategyOptions}
                    onCancel={() => cancelSinglePosition(position.id)}
                  />
                ))}
              </div>
            )}
          </Section>

          <Section title="Recent Trades" icon="📋">
            {dashboardData.trades.length === 0 ? (
              <div className="py-8 text-center font-medium text-gray-600">No trades yet.</div>
            ) : (
              <div className="max-h-96 space-y-2 overflow-auto">
                {dashboardData.trades.slice(0, 20).map((trade, i) => (
                  <TradeRow key={trade.id || i} trade={trade} showUser={false} />
                ))}
              </div>
            )}
          </Section>
        </div>

        <GlobalTradesFeed />

        <Section title="Account Snapshot" icon="🧾">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tier</div>
              <div className="mt-1 font-bold text-gray-900">{user?.tier || "starter"}</div>
            </div>

            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Trading Enabled
              </div>
              <div className="mt-1 font-bold text-gray-900">
                {activation?.trading_enabled ? "Yes" : "No"}
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Portfolio Value
              </div>
              <div className="mt-1 font-bold text-gray-900">
                {formatPlainMoney(user?.portfolio_value || 0)}
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Required Integrations
              </div>
              <div className="mt-1 font-bold text-gray-900">
                {activation?.tier_required_integration || "—"}
              </div>
            </div>
          </div>
        </Section>

        <div className="border-t border-gray-300 pt-4 text-center">
          <div className="flex justify-center gap-4 text-sm">
            <Link to="/pricing" className="font-semibold text-amber-700">
              Upgrade Plan
            </Link>
            <Link to="/live" className="font-semibold text-green-700">
              Public Dashboard
            </Link>
            <Link to="/support" className="font-semibold text-gray-800">
              Help
            </Link>
          </div>
        </div>
      </div>

      <ApiConnectionsModal
        isOpen={showApiModal}
        onClose={() => setShowApiModal(false)}
        activation={activation}
        integrations={dashboardData.integrations}
        onRefresh={async () => {
          await refreshActivation?.(true);
          await loadData(true);
        }}
      />
    </div>
  );
}
