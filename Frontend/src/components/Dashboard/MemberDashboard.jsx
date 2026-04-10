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

/* ---------------------------------------------
 * UI config only
 * ------------------------------------------- */
const STRATEGIES = [
  { value: "safe", label: "Safe & Steady", icon: "🐢", description: "Low risk, small but steady gains" },
  { value: "balanced", label: "Balanced", icon: "⚖️", description: "Mix of safe and growth" },
  { value: "growth", label: "Growth", icon: "📈", description: "More risk for bigger wins" },
  { value: "aggressive", label: "Aggressive", icon: "🔥", description: "High risk, high reward" },
  { value: "ai_weighted", label: "AI Weighted", icon: "🧠", description: "AI-guided signal weighting" },
  { value: "mean_reversion", label: "Mean Reversion", icon: "🔁", description: "Looks for price pullbacks" },
  { value: "momentum", label: "Momentum", icon: "🚀", description: "Follows strong moves" },
  { value: "volume_spike", label: "Volume Spike", icon: "📊", description: "Looks for unusual activity" },
];

const PLANS = [
  { value: "starter", label: "Starter", icon: "🎟️", priceLabel: "Free", color: "blue", features: ["Stock Trading", "Paper Trading"] },
  { value: "pro", label: "Pro", icon: "⭐", priceLabel: "$19/month", color: "purple", features: ["Stock Trading", "Crypto Trading", "Live Trading"] },
  { value: "elite", label: "Elite", icon: "👑", priceLabel: "$49/month", color: "amber", features: ["Everything + DEX Sniper", "Futures Trading"] },
  { value: "bundle", label: "All Access", icon: "🎁", priceLabel: "$199/month", color: "emerald", features: ["Everything + Priority Support", "Early Access"] },
];

/* ---------------------------------------------
 * Helpers
 * ------------------------------------------- */
const safeNumber = (v, f = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : f;
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

const getStrategyMeta = (value) =>
  STRATEGIES.find((s) => s.value === value) || {
    value: value || "balanced",
    label: value || "Balanced",
    icon: "⚙️",
    description: "Current strategy",
  };

/* ---------------------------------------------
 * Small UI blocks
 * ------------------------------------------- */
function StatCard({ title, value, color = "green", hint }) {
  const colors = {
    green: "text-green-600",
    red: "text-red-600",
    purple: "text-purple-600",
    blue: "text-blue-600",
    orange: "text-orange-600",
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
      <div className={`mt-1 text-2xl font-bold ${colors[color]}`}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-400">{hint}</div> : null}
    </div>
  );
}

function Section({ title, icon, children, right }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function TradeRow({ trade }) {
  const side = (trade?.side || "").toLowerCase();
  const pnl = safeNumber(trade?.pnl_usd, 0);
  const symbol = trade?.symbol || "Unknown";
  const bot = trade?.bot || "Bot";
  const isOpen = trade?.status === "open";

  let bgColor = "bg-gray-50";
  let borderColor = "border-l-gray-400";
  let badgeColor = "bg-gray-100 text-gray-700";
  let badgeText = side.toUpperCase() || "TRADE";

  if (isOpen) {
    borderColor = "border-l-blue-500";
    badgeColor = "bg-blue-100 text-blue-700";
    badgeText = "OPEN";
  } else if (side === "buy") {
    borderColor = "border-l-green-500";
    badgeColor = "bg-green-100 text-green-700";
  } else if (side === "sell") {
    borderColor = "border-l-red-500";
    badgeColor = "bg-red-100 text-red-700";
  }

  return (
    <div className={`flex items-center justify-between rounded-lg border-l-4 ${borderColor} ${bgColor} p-3`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{getBotIcon(bot)}</span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{symbol}</span>
            <span className={`rounded px-2 py-0.5 text-xs ${badgeColor}`}>{badgeText}</span>
          </div>
          <div className="text-xs text-gray-400">
            {bot} • {timeAgo(trade?.created_at)}
          </div>
        </div>
      </div>

      <div className="text-right">
        {!isOpen ? (
          <div className={`text-sm font-bold ${pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatMoney(pnl)}
          </div>
        ) : (
          <div className="text-sm text-gray-600">{formatPlainMoney(trade?.price)}</div>
        )}
        <div className="text-xs text-gray-400">{trade?.exchange || "—"}</div>
      </div>
    </div>
  );
}

function PositionRow({ position }) {
  return (
    <div className="flex items-center justify-between rounded-lg border-l-4 border-l-blue-500 bg-blue-50 p-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-lg">{getBotIcon(position?.bot)}</span>
          <span className="text-sm font-medium">{position?.symbol || "Unknown"}</span>
          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">OPEN</span>
        </div>
        <div className="text-xs text-gray-500">
          {position?.strategy || "strategy"} • {timeAgo(position?.created_at)}
        </div>
      </div>

      <div className="text-right text-sm text-gray-700">
        <div>{formatPlainMoney(position?.entry_price)}</div>
        <div className="text-xs text-gray-400">Qty: {safeNumber(position?.qty).toFixed(4)}</div>
      </div>
    </div>
  );
}

function BotExecutionRow({ execution }) {
  const status = String(execution?.status || "").toLowerCase();
  const badge =
    status === "running" || status === "started"
      ? "bg-green-100 text-green-700"
      : status === "failed" || status === "error"
      ? "bg-red-100 text-red-700"
      : "bg-gray-100 text-gray-700";

  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-lg">{getBotIcon(execution?.bot)}</span>
          <span className="text-sm font-medium">{execution?.bot || "Bot"}</span>
          <span className={`rounded px-2 py-0.5 text-xs ${badge}`}>{execution?.status || "unknown"}</span>
        </div>
        <div className="text-xs text-gray-500">
          {execution?.strategy || "—"} • {timeAgo(execution?.created_at || execution?.requested_at)}
        </div>
      </div>

      <div className="text-right text-xs text-gray-400">
        {execution?.mode || "mode unknown"}
      </div>
    </div>
  );
}

/* ---------------------------------------------
 * Real settings panel
 * ------------------------------------------- */
function SettingsPopup({ isOpen, onClose, currentStrategy }) {
  const [selected, setSelected] = useState(currentStrategy || "balanced");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSelected(currentStrategy || "balanced");
    setMessage("");
  }, [currentStrategy, isOpen]);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      // No real update endpoint in current backend, so be honest.
      setMessage("Strategy display updated locally only. Backend save endpoint is not wired yet.");
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Settings</h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Current displayed strategy
          </label>
          <div className="space-y-2">
            {STRATEGIES.map((s) => (
              <button
                key={s.value}
                onClick={() => setSelected(s.value)}
                className={`w-full rounded-lg border p-3 text-left transition-all ${
                  selected === s.value
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{s.icon}</span>
                  <div>
                    <div className="font-medium">{s.label}</div>
                    <div className="text-xs text-gray-500">{s.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {message ? (
          <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">{message}</div>
        ) : null}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-green-600 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------
 * Real API key panel
 * ------------------------------------------- */
function ApiKeysPopup({ isOpen, onClose, apiKey }) {
  const hasApiKey = !!apiKey;

  const copyKey = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      alert("API key copied.");
    } catch {
      alert("Could not copy API key.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">API Key</h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        {!hasApiKey ? (
          <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
            No API key is currently available for this account.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border bg-gray-50 p-3">
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">Current API Key</div>
              <div className="break-all font-mono text-sm text-gray-800">{apiKey}</div>
            </div>
            <button
              onClick={copyKey}
              className="w-full rounded-xl bg-blue-600 py-3 font-medium text-white hover:bg-blue-700"
            >
              Copy API Key
            </button>
            <p className="text-xs text-gray-500">
              This is the real API key returned for your user session. Key creation and deletion endpoints are not wired in this popup yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------
 * Chart from real user stats
 * ------------------------------------------- */
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
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.12)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: "Cumulative PnL",
          data: cumulative,
          borderColor: "#8b5cf6",
          borderDash: [6, 4],
          borderWidth: 2,
          fill: false,
          pointRadius: 0,
        },
        {
          label: "Trades",
          data: tradesData,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59,130,246,0.12)",
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
      legend: { position: "top", labels: { font: { size: 11 } } },
    },
    scales: {
      y: {
        ticks: {
          callback: (v) => `$${v}`,
        },
      },
    },
  };

  return (
    <div>
      <div className="mb-3 flex gap-2">
        {["7d", "30d", "90d"].map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`rounded-lg px-3 py-1 text-xs ${
              period === p ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
          </button>
        ))}
        <button
          onClick={() => setChartType(chartType === "line" ? "bar" : "line")}
          className="rounded-lg bg-gray-100 px-3 py-1 text-xs text-gray-600"
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
          <div className="flex h-full items-center justify-center text-gray-400">
            No trading history yet
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------
 * Real billing section
 * ------------------------------------------- */
function BillingSection({ user, activation }) {
  const tier = user?.tier || "starter";
  const hasCard = activation?.has_card_on_file || activation?.billing_complete;
  const plan = PLANS.find((p) => p.value === tier) || PLANS[0];

  return (
    <Section title="Your Plan & Billing" icon="💳">
      <div className="space-y-4">
        <div
          className={`rounded-xl border bg-gradient-to-r p-4 ${
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
                <span className="text-lg font-bold">{plan.label}</span>
              </div>
              <div className="mt-1 text-2xl font-bold">{plan.priceLabel}</div>
            </div>

            <Link
              to="/pricing"
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium shadow-sm hover:shadow"
            >
              Change Plan →
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {plan.features.map((f, i) => (
              <span key={i} className="rounded-full bg-white/70 px-2 py-1 text-xs">
                ✓ {f}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">💳</span>
            <div>
              <div className="text-sm font-medium">Payment Method</div>
              <div className="text-xs text-gray-500">
                {hasCard ? "Card on file ✓" : "No card added yet"}
              </div>
            </div>
          </div>
          <Link to="/billing" className="text-sm text-blue-600 hover:text-blue-700">
            {hasCard ? "Update Card" : "Add Card →"}
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/billing-dashboard"
            className="flex-1 rounded-lg bg-gray-100 px-4 py-2 text-center text-sm hover:bg-gray-200"
          >
            Billing History
          </Link>
          <Link
            to="/activation"
            className="flex-1 rounded-lg bg-gray-100 px-4 py-2 text-center text-sm hover:bg-gray-200"
          >
            Activation Status
          </Link>
        </div>
      </div>
    </Section>
  );
}

/* ---------------------------------------------
 * Real connections section
 * ------------------------------------------- */
function ConnectionsSection({ activation, integrations, onRefresh }) {
  const [connecting, setConnecting] = useState(null);
  const [walletInput, setWalletInput] = useState("");
  const [okxKeys, setOkxKeys] = useState({ apiKey: "", secret: "", passphrase: "" });
  const [alpacaKeys, setAlpacaKeys] = useState({ apiKey: "", secret: "" });

  const handleConnectWallet = async () => {
    if (!walletInput.startsWith("0x") || walletInput.length !== 42) {
      alert("Wallet address must start with 0x and be 42 characters long.");
      return;
    }

    setConnecting("wallet");
    try {
      const result = await BotAPI.connectWallet({ wallet: walletInput });
      if (!result?.success) throw new Error(result?.error || "Failed to connect wallet");
      alert("Wallet connected.");
      setWalletInput("");
      await onRefresh?.();
    } catch (err) {
      alert(err?.message || "Failed to connect wallet.");
    } finally {
      setConnecting(null);
    }
  };

  const handleConnectOKX = async () => {
    if (!okxKeys.apiKey || !okxKeys.secret || !okxKeys.passphrase) {
      alert("Please fill in all OKX fields.");
      return;
    }

    setConnecting("okx");
    try {
      const result = await BotAPI.connectOKX({
        api_key: okxKeys.apiKey,
        api_secret: okxKeys.secret,
        passphrase: okxKeys.passphrase,
        mode: "paper",
      });
      if (!result?.success) throw new Error(result?.error || "Failed to connect OKX");
      alert("OKX connected.");
      setOkxKeys({ apiKey: "", secret: "", passphrase: "" });
      await onRefresh?.();
    } catch (err) {
      alert(err?.message || "Failed to connect OKX.");
    } finally {
      setConnecting(null);
    }
  };

  const handleConnectAlpaca = async () => {
    if (!alpacaKeys.apiKey || !alpacaKeys.secret) {
      alert("Please fill in both Alpaca fields.");
      return;
    }

    setConnecting("alpaca");
    try {
      const result = await BotAPI.connectAlpaca({
        api_key: alpacaKeys.apiKey,
        api_secret: alpacaKeys.secret,
        mode: "paper",
      });
      if (!result?.success) throw new Error(result?.error || "Failed to connect Alpaca");
      alert("Alpaca connected.");
      setAlpacaKeys({ apiKey: "", secret: "" });
      await onRefresh?.();
    } catch (err) {
      alert(err?.message || "Failed to connect Alpaca.");
    } finally {
      setConnecting(null);
    }
  };

  return (
    <Section title="Connected Accounts" icon="🔌">
      <div className="space-y-4">
        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">💰</span>
            <span className="font-medium">Wallet</span>
            {(activation?.wallet_connected || integrations?.wallet_connected) && (
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                Connected
              </span>
            )}
          </div>

          {!activation?.wallet_connected && !integrations?.wallet_connected ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={walletInput}
                onChange={(e) => setWalletInput(e.target.value)}
                placeholder="0x..."
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
              />
              <button
                onClick={handleConnectWallet}
                disabled={connecting === "wallet"}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700"
              >
                {connecting === "wallet" ? "..." : "Connect"}
              </button>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Wallet connected</div>
          )}

          <a
            href="https://metamask.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-blue-500"
          >
            Need a wallet? Get MetaMask →
          </a>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">🔷</span>
            <span className="font-medium">OKX Exchange</span>
            {(activation?.okx_connected || integrations?.okx_connected) && (
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                Connected
              </span>
            )}
          </div>

          {!activation?.okx_connected && !integrations?.okx_connected ? (
            <div className="space-y-2">
              <input
                type="text"
                value={okxKeys.apiKey}
                onChange={(e) => setOkxKeys({ ...okxKeys, apiKey: e.target.value })}
                placeholder="API Key"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <input
                type="password"
                value={okxKeys.secret}
                onChange={(e) => setOkxKeys({ ...okxKeys, secret: e.target.value })}
                placeholder="Secret Key"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <input
                type="password"
                value={okxKeys.passphrase}
                onChange={(e) => setOkxKeys({ ...okxKeys, passphrase: e.target.value })}
                placeholder="Passphrase"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <button
                onClick={handleConnectOKX}
                disabled={connecting === "okx"}
                className="w-full rounded-lg bg-blue-600 py-2 text-sm text-white hover:bg-blue-700"
              >
                {connecting === "okx" ? "Connecting..." : "Connect OKX"}
              </button>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Connected to OKX</div>
          )}

          <a
            href="https://www.okx.com/account/login?forward=%2Faccount%2Fmy-api"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-blue-500"
          >
            Get OKX API Keys →
          </a>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">📈</span>
            <span className="font-medium">Alpaca Stocks</span>
            {(activation?.alpaca_connected || integrations?.alpaca_connected) && (
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                Connected
              </span>
            )}
          </div>

          {!activation?.alpaca_connected && !integrations?.alpaca_connected ? (
            <div className="space-y-2">
              <input
                type="text"
                value={alpacaKeys.apiKey}
                onChange={(e) => setAlpacaKeys({ ...alpacaKeys, apiKey: e.target.value })}
                placeholder="API Key ID"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <input
                type="password"
                value={alpacaKeys.secret}
                onChange={(e) => setAlpacaKeys({ ...alpacaKeys, secret: e.target.value })}
                placeholder="Secret Key"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <button
                onClick={handleConnectAlpaca}
                disabled={connecting === "alpaca"}
                className="w-full rounded-lg bg-green-600 py-2 text-sm text-white hover:bg-green-700"
              >
                {connecting === "alpaca" ? "Connecting..." : "Connect Alpaca"}
              </button>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Connected to Alpaca</div>
          )}

          <a
            href="https://app.alpaca.markets/signup"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-blue-500"
          >
            Get Alpaca API Keys →
          </a>
        </div>
      </div>
    </Section>
  );
}

/* ---------------------------------------------
 * Main
 * ------------------------------------------- */
export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, activation, refreshActivation, loading: authLoading } = useAuth();

  const [dashboardData, setDashboardData] = useState({
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
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("30d");
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);

  const mountedRef = useRef(true);

  const strategyMeta = useMemo(() => getStrategyMeta(user?.strategy), [user?.strategy]);

  const loadData = useCallback(
    async (silent = false) => {
      if (refreshing) return;

      if (!silent) {
        setLoading(true);
      }

      setRefreshing(true);

      try {
        const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;

        const [tradesRes, statsRes, positionsRes, executionsRes, integrationsRes] =
          await Promise.allSettled([
            BotAPI.getUserTrades({ limit: 50, skipCache: true }),
            BotAPI.getUserTradingStats(days, true),
            BotAPI.getUserPositions(true),
            BotAPI.getUserBotExecutions(20, true),
            BotAPI.getIntegrationStatus(true),
          ]);

        if (!mountedRef.current) return;

        const trades =
          tradesRes.status === "fulfilled" && tradesRes.value?.success
            ? tradesRes.value.trades || []
            : [];

        const statsData =
          statsRes.status === "fulfilled"
            ? statsRes.value?.summary || {}
            : {};

        const dailyPerformance =
          statsRes.status === "fulfilled"
            ? statsRes.value?.daily_performance || []
            : [];

        const positions =
          positionsRes.status === "fulfilled" && positionsRes.value?.success
            ? positionsRes.value.positions || []
            : [];

        const executions =
          executionsRes.status === "fulfilled" && executionsRes.value?.success
            ? executionsRes.value.executions || []
            : [];

        const integrations =
          integrationsRes.status === "fulfilled"
            ? integrationsRes.value || {
                wallet_connected: false,
                alpaca_connected: false,
                okx_connected: false,
              }
            : {
                wallet_connected: false,
                alpaca_connected: false,
                okx_connected: false,
              };

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
      } catch (err) {
        if (mountedRef.current) {
          setError("Could not load your dashboard data.");
        }
      } finally {
        if (mountedRef.current) {
          setRefreshing(false);
          setLoading(false);
        }
      }
    },
    [period, refreshing]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, loadData]);

  useEffect(() => {
    if (!user) return;

    const timer = setInterval(() => {
      loadData(true);
    }, 30000);

    return () => clearInterval(timer);
  }, [user, loadData]);

  const totalPnL = dashboardData.stats.total_pnl;
  const totalTrades = dashboardData.stats.total_trades;
  const wins = dashboardData.stats.wins;
  const losses = dashboardData.stats.losses;
  const winRate = dashboardData.stats.win_rate;
  const openPositions = dashboardData.positions.length;
  const activeExecutions = dashboardData.executions.filter((e) =>
    ["running", "started", "pending"].includes(String(e?.status || "").toLowerCase())
  ).length;

  const apiKey = user?.api_key || BotAPI.getApiKey?.() || null;

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
          <p className="text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <p className="mb-4 text-gray-600">Please log in to see your dashboard.</p>
          <button
            onClick={() => navigate("/login")}
            className="rounded-xl bg-green-600 px-6 py-2 text-white"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                👋 Hey, {user.email?.split("@")[0]}!
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Here&apos;s how your account is doing right now.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
              >
                {refreshing ? "⟳" : "🔄 Refresh"}
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm"
              >
                ⚙️ Settings
              </button>
              <button
                onClick={() => setShowApiKeys(true)}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm"
              >
                🔑 API Key
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/billing" className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm">
            💳 Add Payment
          </Link>
          <Link to="/pricing" className="rounded-lg bg-amber-100 px-3 py-1.5 text-sm text-amber-700">
            ⭐ Upgrade Plan
          </Link>
          <Link to="/activation" className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm">
            ⚡ Activation
          </Link>
          <Link to="/billing-dashboard" className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm">
            📋 Billing History
          </Link>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                title="Total Profit/Loss"
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
                hint="Currently active trades"
              />
              <StatCard
                title="Strategy"
                value={strategyMeta.label}
                color="orange"
                hint={strategyMeta.description}
              />
            </div>

            <Section title="Your Performance" icon="📈">
              <PerformanceChart
                points={dashboardData.dailyPerformance}
                period={period}
                onChange={setPeriod}
              />
            </Section>

            <Section
              title="Bot Activity"
              icon="🤖"
              right={
                <span className="text-xs text-gray-500">
                  {activeExecutions} active
                </span>
              }
            >
              {dashboardData.executions.length === 0 ? (
                <div className="py-6 text-center text-gray-400">
                  No recent bot executions yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {dashboardData.executions.slice(0, 6).map((execution, i) => (
                    <BotExecutionRow key={execution.id || i} execution={execution} />
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
              onRefresh={async () => {
                await refreshActivation?.(true);
                await loadData(true);
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Section
            title="Open Positions"
            icon="📍"
            right={
              <span className="text-xs text-gray-500">{dashboardData.positions.length} open</span>
            }
          >
            {dashboardData.positions.length === 0 ? (
              <div className="py-8 text-center text-gray-400">No open positions right now.</div>
            ) : (
              <div className="space-y-2">
                {dashboardData.positions.slice(0, 10).map((position, i) => (
                  <PositionRow key={position.id || i} position={position} />
                ))}
              </div>
            )}
          </Section>

          <Section title="Recent Trades" icon="📋">
            {dashboardData.trades.length === 0 ? (
              <div className="py-8 text-center text-gray-400">No trades yet.</div>
            ) : (
              <div className="max-h-96 space-y-2 overflow-auto">
                {dashboardData.trades.slice(0, 20).map((trade, i) => (
                  <TradeRow key={trade.id || i} trade={trade} />
                ))}
              </div>
            )}
          </Section>
        </div>

        <Section title="Account Snapshot" icon="🧾">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Tier</div>
              <div className="mt-1 font-semibold text-gray-800">{user?.tier || "starter"}</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Trading Enabled</div>
              <div className="mt-1 font-semibold text-gray-800">
                {activation?.trading_enabled ? "Yes" : "No"}
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Portfolio Value</div>
              <div className="mt-1 font-semibold text-gray-800">
                {formatPlainMoney(user?.portfolio_value || 0)}
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Required Integrations</div>
              <div className="mt-1 font-semibold text-gray-800">
                {activation?.tier_required_integration || "—"}
              </div>
            </div>
          </div>
        </Section>

        <div className="border-t border-gray-200 pt-4 text-center">
          <div className="flex justify-center gap-4 text-sm">
            <Link to="/pricing" className="text-amber-600">
              Upgrade Plan
            </Link>
            <Link to="/live" className="text-green-600">
              Public Dashboard
            </Link>
            <Link to="/support" className="text-gray-500">
              Help
            </Link>
          </div>
        </div>
      </div>

      <SettingsPopup
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentStrategy={user?.strategy || "balanced"}
      />

      <ApiKeysPopup
        isOpen={showApiKeys}
        onClose={() => setShowApiKeys(false)}
        apiKey={apiKey}
      />
    </div>
  );
}
