// src/components/Dashboard/MemberDashboard.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BotAPI from "../../utils/BotAPI";
import {
  FaPlay, FaPause, FaSpinner, FaSignOutAlt, FaCircle,
  FaExchangeAlt, FaCheckCircle, FaChartLine, FaInfoCircle,
  FaShieldAlt, FaClock, FaWallet, FaRobot, FaBug,
  FaTimesCircle, FaArrowUp, FaArrowDown, FaKey, FaPlug,
  FaStop, FaDollarSign, FaPercentage
} from "react-icons/fa";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

// ── helpers ──────────────────────────────────────────────────
const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const formatNumber = (n) => Number(n || 0).toLocaleString();

const parseMoney = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const STRATEGIES = [
  { id: "mean_reversion", name: "Conservative", icon: "🛡️", risk: "Low", color: "emerald", description: "Slow, steady trades focused on consistency.", takeProfit: 1.5, stopLoss: 1.5 },
  { id: "ai_weighted", name: "Balanced AI", icon: "🤖", risk: "Medium", color: "blue", description: "AI‑assisted balance between growth and protection.", takeProfit: 2.0, stopLoss: 2.0 },
  { id: "momentum", name: "Growth", icon: "📈", risk: "Higher", color: "orange", description: "Faster opportunities with larger swings.", takeProfit: 2.5, stopLoss: 2.5 },
  { id: "aggressive", name: "Aggressive", icon: "🔥", risk: "High", color: "red", description: "High volatility with larger upside potential.", takeProfit: 3.0, stopLoss: 3.0 },
];

const EXCHANGES = [
  { id: "okx", name: "OKX", icon: "🟡", route: "/connect-okx", color: "yellow" },
  { id: "alpaca", name: "Alpaca", icon: "🦙", route: "/connect-alpaca", color: "blue" },
];

// ── subcomponents ────────────────────────────────────────────

// 1. API Key Management Card
const ApiKeyCard = ({ exchange, connection, onConnect, onDisconnect, onTest }) => {
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    await onTest?.();
    setTesting(false);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{exchange.icon}</span>
          <h3 className="font-bold">{exchange.name}</h3>
          {connection.connected && (
            <span className="flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
              <FaCheckCircle size={10} /> Connected
            </span>
          )}
        </div>
        <div className={`text-xs px-2 py-1 rounded-full ${connection.mode === 'live' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
          {connection.mode === 'live' ? 'LIVE' : 'PAPER'}
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-white/40">API Key:</span>
          <span className="font-mono">{connection.apiKeyMasked || 'Not connected'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Trading Permission:</span>
          <span className={connection.tradingPermission !== false ? "text-emerald-400" : "text-red-400"}>
            {connection.tradingPermission !== false ? '✅ Enabled' : '❌ Disabled'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Withdrawal:</span>
          <span className="text-red-400">❌ Disabled (recommended)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Balance:</span>
          <span className="font-bold">{formatMoney(connection.balance)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Last Verified:</span>
          <span>{connection.lastVerified || 'Not yet'}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        <button
          onClick={() => onConnect?.()}
          className="flex-1 bg-cyan-600 hover:bg-cyan-500 rounded-xl py-2 text-sm font-bold transition flex items-center justify-center gap-1"
        >
          <FaKey size={12} /> Update Keys
        </button>
        <button
          onClick={handleTest}
          disabled={testing}
          className="flex-1 bg-white/10 hover:bg-white/20 rounded-xl py-2 text-sm font-bold transition flex items-center justify-center gap-1"
        >
          {testing ? <FaSpinner className="animate-spin" /> : <FaPlug size={12} />} Test
        </button>
        {connection.connected && (
          <button
            onClick={() => onDisconnect?.()}
            className="px-4 bg-red-600/20 hover:bg-red-600/30 rounded-xl py-2 text-sm font-bold transition text-red-400"
          >
            <FaTimesCircle size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

// 2. Open Positions Card
const OpenPositionsCard = ({ positions, onClosePosition }) => {
  if (!positions?.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-center text-white/40">
        <FaRobot className="text-4xl mx-auto mb-2 opacity-30" />
        <p>No open positions</p>
        <p className="text-xs mt-1">Start the bot to begin trading</p>
      </div>
    );
  }

  const totalPnl = positions.reduce((sum, p) => sum + (p.pnl_usd || 0), 0);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold">📂 Open Positions</h3>
        <span className="text-xs text-white/40">{positions.length} positions</span>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {positions.map((pos) => (
          <div key={pos.id} className="border-b border-white/10 pb-2 last:border-0">
            <div className="flex justify-between items-center">
              <span className="font-bold">{pos.symbol}</span>
              <span className={`text-sm ${(pos.pnl_usd || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(pos.pnl_usd || 0) >= 0 ? '+' : ''}{formatMoney(pos.pnl_usd)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>Entry: {formatMoney(pos.price)}</span>
              <span>Current: {formatMoney(pos.current_price || pos.price)}</span>
              <span>PnL: {((pos.pnl_percent || 0) || 0).toFixed(2)}%</span>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onClosePosition?.(pos.id)}
                className="text-xs bg-red-600/20 hover:bg-red-600/30 px-3 py-1 rounded-full transition"
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-white/10 flex justify-between font-bold">
        <span>Total Open PnL:</span>
        <span className={totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
          {totalPnl >= 0 ? '+' : ''}{formatMoney(totalPnl)}
        </span>
      </div>
    </div>
  );
};

// 3. Bot Status Card
const BotStatusCard = ({ bot, onStart, onStop, isStarting }) => {
  const statusConfig = {
    running: { color: 'emerald', text: 'RUNNING', icon: '🟢' },
    stopped: { color: 'gray', text: 'STOPPED', icon: '⚫' },
    error: { color: 'red', text: 'ERROR', icon: '🔴' },
  };
  const status = bot?.isRunning ? 'running' : bot?.error ? 'error' : 'stopped';
  const config = statusConfig[status];

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">🤖 Bot Status</h3>
        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-${config.color}-500/20 text-${config.color}-400`}>
          <span>{config.icon}</span>
          {config.text}
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-white/40">Strategy:</span>
          <span className="font-bold">{bot?.strategy || 'Not selected'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Mode:</span>
          <span className={bot?.mode === 'live' ? 'text-red-400' : 'text-yellow-400'}>
            {bot?.mode?.toUpperCase() || 'PAPER'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Exchange:</span>
          <span>{bot?.exchange?.toUpperCase() || 'OKX'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Scanning:</span>
          <span>{bot?.scanningCount || 14} Symbols</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Open Positions:</span>
          <span>{bot?.openPositions || 0} / {bot?.maxPositions || 3}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Next Scan:</span>
          <span>{bot?.nextScan || '12 sec'}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        {!bot?.isRunning ? (
          <button
            onClick={onStart}
            disabled={isStarting}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 rounded-xl py-2 font-bold transition flex items-center justify-center gap-2"
          >
            {isStarting ? <FaSpinner className="animate-spin" /> : <FaPlay />} Start Bot
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex-1 bg-red-600 hover:bg-red-500 rounded-xl py-2 font-bold transition flex items-center justify-center gap-2"
          >
            <FaStop /> Stop Bot
          </button>
        )}
      </div>
    </div>
  );
};

// 4. Account Allocation Card
const AllocationCard = ({ usdtAvailable, openValue, holdings }) => {
  const total = usdtAvailable + openValue;
  const usdtPct = total ? (usdtAvailable / total) * 100 : 100;
  const openPct = total ? (openValue / total) * 100 : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <h3 className="font-bold mb-4">💰 Portfolio Allocation</h3>

      <div className="flex justify-between text-sm mb-2">
        <span>USDT Available</span>
        <span className="font-bold">{formatMoney(usdtAvailable)} ({usdtPct.toFixed(1)}%)</span>
      </div>
      <div className="flex justify-between text-sm mb-4">
        <span>Open Positions</span>
        <span className="font-bold">{formatMoney(openValue)} ({openPct.toFixed(1)}%)</span>
      </div>

      <div className="h-2 rounded-full overflow-hidden bg-white/10 mb-4">
        <div className="h-full bg-emerald-500" style={{ width: `${usdtPct}%` }} />
      </div>

      {holdings?.length > 0 && (
        <div className="space-y-1 mt-4 pt-3 border-t border-white/10">
          <div className="text-xs text-white/40 mb-2">Holdings Breakdown:</div>
          {holdings.slice(0, 5).map((h) => (
            <div key={h.symbol} className="flex justify-between text-xs">
              <span>{h.symbol}</span>
              <span>{formatMoney(h.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 5. Activity Feed
const ActivityFeed = ({ activities }) => {
  if (!activities?.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <h3 className="font-bold mb-4">📋 Activity Feed</h3>
        <div className="text-center text-white/40 py-8">
          <FaRobot className="text-3xl mx-auto mb-2 opacity-30" />
          <p className="text-sm">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <h3 className="font-bold mb-4">📋 Activity Feed</h3>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {activities.map((act, i) => (
          <div key={act.id || i} className="flex items-start gap-3 text-sm">
            <div className="w-16 text-xs text-white/30 flex-shrink-0">{act.time}</div>
            <div className="flex-1">
              <span className="font-bold">{act.action}</span>
              {act.details && (
                <div className="text-xs text-white/50">{act.details}</div>
              )}
            </div>
            {act.pnl && (
              <div className={`font-bold text-xs flex-shrink-0 ${act.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {act.pnl >= 0 ? '+' : ''}{formatMoney(act.pnl)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// 6. Risk Settings Card
const RiskSettingsCard = ({ settings, onUpdate }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (key, value) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    onUpdate?.(updated);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <h3 className="font-bold mb-4">⚙️ Risk Settings</h3>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-white/40">Trade Size (% of balance)</span>
            <span className="font-bold">{Math.round((localSettings.tradePct || 0.15) * 100)}%</span>
          </div>
          <input
            type="range"
            min="5"
            max="30"
            step="5"
            value={(localSettings.tradePct || 0.15) * 100}
            onChange={(e) => handleChange('tradePct', e.target.value / 100)}
            className="w-full"
          />
        </div>

        <div className="flex justify-between">
          <span className="text-white/40">Max Positions:</span>
          <span className="font-bold">{localSettings.maxPositions || 3}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-white/40">Min Trade:</span>
          <span className="font-bold">{formatMoney(localSettings.minTradeUsd || 5)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-white/40">Take Profit:</span>
          <span className="text-emerald-400 font-bold">{(localSettings.takeProfitPct || 0.025) * 100}%</span>
        </div>

        <div className="flex justify-between">
          <span className="text-white/40">Stop Loss:</span>
          <span className="text-red-400 font-bold">{(localSettings.stopLossPct || 0.025) * 100}%</span>
        </div>
      </div>
    </div>
  );
};

// 7. Emergency Controls
const EmergencyControls = ({ onStopBot, onCloseAll, onSellToUsdt, isProcessing }) => {
  const [confirming, setConfirming] = useState(null);

  const handleAction = async (action, handler) => {
    if (confirming === action) {
      await handler?.();
      setConfirming(null);
    } else {
      setConfirming(action);
      setTimeout(() => setConfirming(null), 5000);
    }
  };

  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
      <h3 className="font-bold mb-4 text-red-400 flex items-center gap-2">
        <FaShieldAlt /> Emergency Controls
      </h3>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => handleAction('stop', onStopBot)}
          disabled={isProcessing}
          className={`px-4 py-2 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
            confirming === 'stop'
              ? 'bg-red-600 text-white'
              : 'bg-red-600/20 hover:bg-red-600/30 text-red-400'
          }`}
        >
          {confirming === 'stop' ? 'Click again to confirm' : <FaStop />} Stop Bot
        </button>
        <button
          onClick={() => handleAction('close', onCloseAll)}
          disabled={isProcessing}
          className={`px-4 py-2 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
            confirming === 'close'
              ? 'bg-orange-600 text-white'
              : 'bg-orange-600/20 hover:bg-orange-600/30 text-orange-400'
          }`}
        >
          {confirming === 'close' ? 'Click again to confirm' : <FaTimesCircle />} Close All Positions
        </button>
        <button
          onClick={() => handleAction('sell', onSellToUsdt)}
          disabled={isProcessing}
          className={`px-4 py-2 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
            confirming === 'sell'
              ? 'bg-yellow-600 text-white'
              : 'bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400'
          }`}
        >
          {confirming === 'sell' ? 'Click again to confirm' : <FaDollarSign />} Sell Everything to USDT
        </button>
      </div>
      <p className="text-xs text-white/30 mt-3">⚠️ Emergency actions require double-confirmation</p>
    </div>
  );
};

// 8. Setup Progress Card
const SetupProgressCard = ({ steps }) => {
  const completed = steps.filter(s => s.completed).length;
  const percent = (completed / steps.length) * 100;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold">Setup Progress</h3>
        <span className="text-xs text-white/40">{completed} / {steps.length} Complete</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-white/10 mb-4">
        <div className="h-full bg-cyan-500" style={{ width: `${percent}%` }} />
      </div>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            {step.completed ? (
              <FaCheckCircle className="text-emerald-400" size={14} />
            ) : (
              <FaCircle className="text-white/20" size={14} />
            )}
            <span className={step.completed ? 'text-white/80' : 'text-white/40'}>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 9. Performance Card (Real)
const PerformanceCard = ({ stats }) => {
  const winRate = stats.wins + stats.losses > 0
    ? (stats.wins / (stats.wins + stats.losses)) * 100
    : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <h3 className="font-bold mb-4">📈 Real Performance</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-white/40">Realized PnL</div>
          <div className={`text-xl font-bold ${stats.realizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatMoney(stats.realizedPnl)}
          </div>
        </div>
        <div>
          <div className="text-xs text-white/40">Unrealized PnL</div>
          <div className={`text-xl font-bold ${stats.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatMoney(stats.unrealizedPnl)}
          </div>
        </div>
        <div>
          <div className="text-xs text-white/40">Total PnL</div>
          <div className={`text-xl font-bold ${stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatMoney(stats.totalPnl)}
          </div>
        </div>
        <div>
          <div className="text-xs text-white/40">Win Rate</div>
          <div className="text-xl font-bold text-white">{winRate.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-xs text-white/40">Trades</div>
          <div className="text-xl font-bold text-white">{formatNumber(stats.totalTrades)}</div>
        </div>
        <div>
          <div className="text-xs text-white/40">Wins / Losses</div>
          <div className="text-sm font-bold">
            <span className="text-emerald-400">{stats.wins}</span>
            <span className="text-white/40"> / </span>
            <span className="text-red-400">{stats.losses}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 10. Exchange Asset Breakdown
const AssetBreakdownCard = ({ assets }) => {
  if (!assets?.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <h3 className="font-bold mb-4">💰 Assets</h3>
        <div className="text-center text-white/40 py-6">No assets loaded</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <h3 className="font-bold mb-4">💰 Assets</h3>
      <div className="space-y-2">
        {assets.map((asset) => (
          <div key={asset.ccy} className="flex justify-between text-sm">
            <span className="font-mono">{asset.ccy}</span>
            <span className="font-bold">{formatMoney(asset.usdValue)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────
export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // State
  const [activeExchange, setActiveExchange] = useState("okx");
  const [running, setRunning] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState(STRATEGIES[1]);
  const [connections, setConnections] = useState({});
  const [positions, setPositions] = useState([]);
  const [botStatus, setBotStatus] = useState({});
  const [stats, setStats] = useState({ realizedPnl: 0, unrealizedPnl: 0, totalPnl: 0, wins: 0, losses: 0, totalTrades: 0 });
  const [activities, setActivities] = useState([]);
  const [assets, setAssets] = useState([]);
  const [riskSettings, setRiskSettings] = useState({ tradePct: 0.15, maxPositions: 3, minTradeUsd: 8, takeProfitPct: 0.025, stopLossPct: 0.025 });
  const [equityHistory, setEquityHistory] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [openValue, setOpenValue] = useState(0);

  const fetchAllData = useCallback(async () => {
    try {
      const [balances, positionsData, botData, statsData, tradesData, assetsData] = await Promise.all([
        BotAPI.getExchangeBalance?.(),
        BotAPI.getOpenPositions?.(),
        BotAPI.getTradingBotStatus?.(),
        BotAPI.getLiveTradingStats?.(),
        BotAPI.getLiveTradeHistory?.(20),
        BotAPI.getExchangeBalance?.(),
      ]);

      // Update balances
      const okxBalance = balances?.data?.okx_available_usdt || 0;
      setCurrentBalance(okxBalance);

      // Update positions
      const posList = positionsData?.data?.positions || positionsData?.positions || [];
      setPositions(posList);
      const posValue = posList.reduce((sum, p) => sum + (p.qty * p.price), 0);
      setOpenValue(posValue);

      // Update bot status
      const bots = botData?.data?.bots || botData?.data || [];
      const activeBot = bots.find(b => b.exchange === activeExchange && b.isRunning);
      setRunning(!!activeBot);
      setBotStatus(activeBot || {});

      // Update stats
      const summary = statsData?.data?.summary || statsData?.summary || {};
      setStats({
        realizedPnl: parseMoney(summary.realized_pnl || summary.total_pnl || 0),
        unrealizedPnl: parseMoney(summary.unrealized_pnl || 0),
        totalPnl: parseMoney(summary.total_pnl || 0),
        wins: Number(summary.wins || 0),
        losses: Number(summary.losses || 0),
        totalTrades: Number(summary.total_trades || 0),
      });

      // Update activities feed
      const trades = tradesData?.trades || tradesData?.data?.trades || [];
      setActivities(trades.slice(0, 20).map(t => ({
        id: t.id,
        time: new Date(t.created_at).toLocaleTimeString(),
        action: `${t.side?.toUpperCase()} ${t.symbol}`,
        details: t.strategy ? `${t.strategy} strategy` : '',
        pnl: t.pnl_usd,
      })));

      // Update assets breakdown
      const okxAssets = balances?.data?.okx_assets || [];
      setAssets(okxAssets.filter(a => a.usdValue > 0.01 && a.ccy !== 'USDT').slice(0, 10));

      // Update equity history
      setEquityHistory(prev => {
        const now = new Date().toLocaleTimeString();
        const newPoint = { time: now, equity: currentBalance + posValue };
        const updated = [...prev, newPoint];
        return updated.slice(-30);
      });

    } catch (err) {
      console.error("fetchAllData:", err);
    }
  }, [activeExchange, currentBalance]);

  // Setup progress steps
  const setupSteps = [
    { label: "Account Created", completed: !!user },
    { label: "API Connected", completed: connections[activeExchange]?.connected },
    { label: "Balance Verified", completed: currentBalance > 0 },
    { label: "Strategy Selected", completed: !!currentStrategy },
    { label: "Live Trading Started", completed: running },
  ];

  // Handlers
  const handleStartBot = async () => {
    setIsProcessing(true);
    try {
      const result = await BotAPI.startTradingBot?.(activeExchange, currentStrategy.id, "live");
      if (result?.success) {
        await fetchAllData();
      } else {
        alert(result?.error || "Failed to start bot");
      }
    } catch (err) {
      alert("Start error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopBot = async () => {
    setIsProcessing(true);
    try {
      await BotAPI.stopTradingBot?.(activeExchange);
      await fetchAllData();
    } catch (err) {
      alert("Stop error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseAllPositions = async () => {
    setIsProcessing(true);
    try {
      await BotAPI.closeAllPositions?.();
      await fetchAllData();
    } catch (err) {
      alert("Error closing positions: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSellToUsdt = async () => {
    setIsProcessing(true);
    try {
      alert("This feature requires manual action on OKX for security");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateRiskSettings = async (newSettings) => {
    setRiskSettings(newSettings);
    // Optionally save to backend
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 10000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Equity chart data
  const chartData = {
    labels: equityHistory.map(h => h.time),
    datasets: [{
      label: 'Account Equity',
      data: equityHistory.map(h => h.equity),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.3,
      fill: true,
    }],
  };

  if (isInitialLoad && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <FaSpinner className="animate-spin text-4xl text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white pb-8">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-emerald-600 to-cyan-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚀</span>
          <div>
            <p className="font-bold">IMALI Trading Dashboard</p>
            <p className="text-xs text-white/80">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/30 rounded-full px-3 py-1 text-xs font-bold">
            <FaCircle className={`h-2 w-2 ${running ? 'text-emerald-400 animate-pulse' : 'text-gray-400'}`} />
            {running ? 'BOT RUNNING' : 'BOT OFF'}
          </div>
          <button onClick={logout} className="flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-bold hover:bg-red-500">
            <FaSignOutAlt size={12} /> Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Exchange Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {EXCHANGES.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setActiveExchange(ex.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                activeExchange === ex.id
                  ? "bg-cyan-600 text-white"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
            >
              <span>{ex.icon}</span> {ex.name}
            </button>
          ))}
        </div>

        {/* Top Row - Key Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ApiKeyCard
            exchange={EXCHANGES.find(e => e.id === activeExchange)}
            connection={connections[activeExchange] || {}}
            onConnect={() => navigate(`/connect-${activeExchange}`)}
            onDisconnect={() => {}}
            onTest={() => fetchAllData()}
          />
          <BotStatusCard
            bot={{ ...botStatus, isRunning: running, strategy: currentStrategy.name }}
            onStart={handleStartBot}
            onStop={handleStopBot}
            isStarting={isProcessing}
          />
        </div>

        {/* Second Row - Positions and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OpenPositionsCard positions={positions} onClosePosition={() => {}} />
          <ActivityFeed activities={activities} />
        </div>

        {/* Performance Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PerformanceCard stats={stats} />
          <AllocationCard usdtAvailable={currentBalance} openValue={openValue} holdings={assets} />
        </div>

        {/* Equity Chart */}
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <h3 className="font-bold mb-4">📈 Equity History</h3>
          <div className="h-64">
            <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        {/* Settings and Emergency Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RiskSettingsCard settings={riskSettings} onUpdate={handleUpdateRiskSettings} />
          <EmergencyControls
            onStopBot={handleStopBot}
            onCloseAll={handleCloseAllPositions}
            onSellToUsdt={handleSellToUsdt}
            isProcessing={isProcessing}
          />
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AssetBreakdownCard assets={assets} />
          <SetupProgressCard steps={setupSteps} />
        </div>

        {/* Strategy Selector */}
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <h3 className="font-bold mb-4">🎯 Trading Strategies</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STRATEGIES.map((strat) => (
              <button
                key={strat.id}
                onClick={() => !running && setCurrentStrategy(strat)}
                disabled={running}
                className={`p-4 rounded-xl border text-left transition ${
                  currentStrategy.id === strat.id
                    ? `border-${strat.color}-400 bg-${strat.color}-500/10`
                    : 'border-white/10 hover:bg-white/5'
                } ${running ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="text-2xl mb-1">{strat.icon}</div>
                <div className="font-bold">{strat.name}</div>
                <div className="text-xs text-white/50">{strat.risk} Risk</div>
                <p className="text-xs mt-2 text-white/40">{strat.description}</p>
              </button>
            ))}
          </div>
          {running && <p className="mt-3 text-xs text-yellow-400">Stop the bot to change strategy</p>}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-white/30 pt-4">
          Live trading involves real risk. Only trade what you can afford to lose.
          <br />
          Bot version 2.0 | Take Profit: {Math.round(riskSettings.takeProfitPct * 100)}% | Stop Loss: {Math.round(riskSettings.stopLossPct * 100)}%
        </div>
      </div>
    </div>
  );
}
