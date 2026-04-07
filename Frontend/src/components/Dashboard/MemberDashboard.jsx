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
  ArcElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

// Constants
const STRATEGIES = [
  { value: "mean_reversion", label: "Conservative", icon: "🛡️", risk: 1, description: "Lower risk, steady returns" },
  { value: "ai_weighted", label: "Balanced", icon: "🤖", risk: 2, description: "AI-optimized risk/reward" },
  { value: "momentum", label: "Growth", icon: "📈", risk: 3, description: "Higher risk, higher potential" },
  { value: "volume_spike", label: "Aggressive", icon: "🔥", risk: 4, description: "Maximum risk" },
];

const PLANS = [
  { value: "starter", label: "Starter", icon: "🎟️", price: 0, features: ["OKX Spot", "Stock Bot"], color: "blue", priceLabel: "Free" },
  { value: "pro", label: "Pro", icon: "⭐", price: 19, features: ["OKX Spot", "Stock Bot", "Staking"], color: "purple", priceLabel: "$19/mo" },
  { value: "elite", label: "Elite", icon: "👑", price: 49, features: ["OKX Spot", "Stock Bot", "DEX Sniper", "Futures", "Staking"], color: "amber", priceLabel: "$49/mo" },
  { value: "stock", label: "Stocks", icon: "📈", price: 79, features: ["Stock Bot", "DEX Sniper"], color: "emerald", priceLabel: "$79/mo" },
  { value: "bundle", label: "Bundle", icon: "🧩", price: 199, features: ["OKX Spot", "Stock Bot", "DEX Sniper", "Futures", "Staking"], color: "amber", priceLabel: "$199/mo" },
];

// Helper functions
const safeNumber = (v, f = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : f;
};

const safeExtract = (response, fallback = null) => {
  if (!response) return fallback;
  if (response.data && typeof response.data === 'object') return response.data;
  return response;
};

const normalizeArray = (v) => (Array.isArray(v) ? v : []);

const formatUsd = (n) => {
  const num = safeNumber(n);
  const sign = num >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(num).toFixed(2)}`;
};

const formatPercent = (v, digits = 2) => {
  const num = safeNumber(v);
  return `${num >= 0 ? "+" : ""}${num.toFixed(digits)}%`;
};

const timeAgo = (timestamp) => {
  if (!timestamp) return "—";
  try {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    if (diffMs < 0) return "just now";
    const sec = Math.floor(diffMs / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    if (sec < 30) return "just now";
    if (sec < 60) return `${sec}s ago`;
    if (min < 60) return `${min}m ago`;
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  } catch {
    return "—";
  }
};

const getTradeTimestamp = (trade) => trade?.created_at || trade?.timestamp || trade?.time || null;
const getTradePnlUsd = (trade) => trade?.pnl_usd ?? trade?.pnl ?? 0;
const getTradePnlPercent = (trade) => trade?.pnl_percentage ?? trade?.pnl_pct ?? 0;
const getTradeSide = (trade) => String(trade?.side || trade?.action || "").toLowerCase();
const getTradeBot = (trade) => trade?.bot || trade?.source || "Unknown";
const getTradePrice = (trade) => trade?.price ?? trade?.entry_price ?? 0;

const dedupeTrades = (trades) => {
  const seen = new Set();
  const unique = [];
  for (const trade of normalizeArray(trades)) {
    const key = [trade?.id, trade?.symbol, getTradeSide(trade), getTradeTimestamp(trade), getTradePrice(trade)].join("|");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(trade);
    }
  }
  return unique;
};

const normalizeTier = (tier) => {
  const t = String(tier || "starter").toLowerCase().trim();
  return PLANS.some((p) => p.value === t) ? t : "starter";
};

const getBotIcon = (botName) => {
  const name = String(botName || "").toLowerCase();
  if (name.includes('okx')) return "🔷";
  if (name.includes('futures')) return "📊";
  if (name.includes('stock')) return "📈";
  if (name.includes('sniper')) return "🦄";
  if (name.includes('staking')) return "🥩";
  return "🤖";
};

// Chart Component
function PerformanceChart({ historicalData, type = "daily", onTypeChange }) {
  const [chartType, setChartType] = useState('line');
  const chartData = normalizeArray(historicalData?.[type] || []);
  
  const getChartData = () => {
    if (chartData.length === 0) return { labels: [], datasets: [] };
    const labels = chartData.map(d => {
      const date = new Date(d?.date || d?.timestamp || 0);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    const pnlData = chartData.map(d => safeNumber(d?.pnl, 0));
    const cumulativeData = [];
    let cumulative = 0;
    pnlData.forEach(val => {
      cumulative += val;
      cumulativeData.push(cumulative);
    });
    return {
      labels,
      datasets: [
        {
          label: 'Daily P&L',
          data: pnlData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointBackgroundColor: pnlData.map(v => v >= 0 ? '#10b981' : '#ef4444'),
          borderWidth: 2,
        },
        {
          label: 'Cumulative P&L',
          data: cumulativeData,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
        }
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#6b7280', font: { size: 11 } } },
      tooltip: { backgroundColor: '#1f2937', titleColor: '#f3f4f6', bodyColor: '#9ca3af' }
    },
    scales: {
      x: { grid: { color: 'rgba(75, 85, 99, 0.2)' }, ticks: { color: '#9ca3af' } },
      y: { grid: { color: 'rgba(75, 85, 99, 0.2)' }, ticks: { color: '#9ca3af', callback: (v) => `$${v}` } }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {["daily", "weekly", "monthly"].map((period) => (
          <button key={period} onClick={() => onTypeChange(period)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${type === period ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
        <button onClick={() => setChartType(chartType === 'line' ? 'bar' : 'line')} className="px-3 py-1.5 rounded-lg text-xs bg-gray-100 text-gray-600">
          {chartType === 'line' ? '📊 Bar' : '📈 Line'}
        </button>
      </div>
      <div className="h-64 bg-gray-50 rounded-xl p-3 border border-gray-200">
        {chartData.length > 0 ? (
          chartType === 'line' ? <Line data={getChartData()} options={chartOptions} /> : <Bar data={getChartData()} options={chartOptions} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">No data yet</div>
        )}
      </div>
    </div>
  );
}

// UI Components
const CardShell = ({ title, icon, right, children }) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
    {(title || icon || right) && (
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          {title && <h3 className="font-semibold text-gray-900">{title}</h3>}
        </div>
        {right}
      </div>
    )}
    {children}
  </div>
);

const StatCard = ({ title, value, subtext, color = "emerald" }) => {
  const colors = { emerald: "text-emerald-600", red: "text-red-600", purple: "text-purple-600", cyan: "text-cyan-600", amber: "text-amber-600" };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
      <div className="text-xs text-gray-500">{title}</div>
      <div className={`text-xl font-bold mt-1 ${colors[color]}`}>{value}</div>
      {subtext && <div className="text-xs text-gray-400 mt-0.5">{subtext}</div>}
    </div>
  );
};

const TradeRow = ({ trade }) => {
  const side = getTradeSide(trade);
  const pnlUsd = safeNumber(getTradePnlUsd(trade), 0);
  const pnlPercent = safeNumber(getTradePnlPercent(trade), 0);
  const symbol = trade?.symbol || "Unknown";
  const bot = getTradeBot(trade);
  const ts = getTradeTimestamp(trade);
  const isOpen = trade?.status === "open" && pnlUsd === 0;
  
  let borderColor = "border-l-gray-400";
  let badgeColor = "bg-gray-100 text-gray-600";
  let badgeText = side.toUpperCase() || "UNKNOWN";
  
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
    <div className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm border-l-4 ${borderColor} bg-gray-50`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-base">{getBotIcon(bot)}</span>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{symbol}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${badgeColor}`}>{badgeText}</span>
            <span className="text-xs text-gray-400">{bot}</span>
          </div>
          <div className="text-xs text-gray-400">{timeAgo(ts)}</div>
        </div>
      </div>
      <div className="text-right">
        {!isOpen && pnlUsd !== 0 ? (
          <>
            <div className={`font-bold text-sm ${pnlUsd > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatUsd(pnlUsd)}</div>
            <div className={`text-xs ${pnlPercent > 0 ? 'text-green-500' : 'text-red-500'}`}>{formatPercent(pnlPercent)}</div>
          </>
        ) : (
          <div className="font-bold text-sm text-gray-700">{formatUsd(getTradePrice(trade))}</div>
        )}
      </div>
    </div>
  );
};

// Settings Modal Component
function SettingsModal({ isOpen, onClose, currentStrategy, onStrategyChange, user }) {
  const [selectedStrategy, setSelectedStrategy] = useState(currentStrategy);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    setUpdating(true);
    setMessage("");
    try {
      // Call API to update strategy
      const response = await BotAPI.updateStrategy?.(selectedStrategy);
      if (response?.success) {
        setMessage("Strategy updated successfully!");
        onStrategyChange(selectedStrategy);
        setTimeout(() => onClose(), 1500);
      } else {
        setMessage("Failed to update strategy");
      }
    } catch (err) {
      setMessage("Error updating strategy");
    } finally {
      setUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Trading Strategy</label>
            <select 
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            >
              {STRATEGIES.map(s => (
                <option key={s.value} value={s.value}>{s.label} - {s.description}</option>
              ))}
            </select>
          </div>
          
          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.includes("success") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {message}
            </div>
          )}
          
          <button
            onClick={handleSave}
            disabled={updating}
            className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {updating ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// API Keys Modal
function ApiKeysModal({ isOpen, onClose }) {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadApiKeys();
    }
  }, [isOpen]);

  const loadApiKeys = async () => {
    try {
      const keys = await BotAPI.listApiKeys?.() || [];
      setApiKeys(keys);
    } catch (err) {
      console.error("Failed to load API keys:", err);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const result = await BotAPI.createApiKey?.({ name: newKeyName, permissions: ["read"] });
      if (result?.success) {
        await loadApiKeys();
        setNewKeyName("");
      }
    } catch (err) {
      console.error("Failed to create API key:", err);
    } finally {
      setCreating(false);
    }
  };

  const revokeApiKey = async (keyId) => {
    if (!confirm("Are you sure you want to revoke this API key?")) return;
    try {
      await BotAPI.revokeApiKey?.(keyId);
      await loadApiKeys();
    } catch (err) {
      console.error("Failed to revoke API key:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">API Keys</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={createApiKey}
              disabled={creating || !newKeyName.trim()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Key"}
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No API keys yet</div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{key.name}</div>
                  <div className="text-xs text-gray-500">Created: {new Date(key.created_at).toLocaleDateString()}</div>
                </div>
                <button
                  onClick={() => revokeApiKey(key.id)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Main Dashboard Component
export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, activation, refreshActivation } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    trades: [],
    discoveries: [],
    bots: [],
    analytics: { summary: { total_trades: 0, total_pnl: 0, win_rate: 0, wins: 0, losses: 0 } },
    historical: { daily: [], weekly: [], monthly: [] }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [historicalType, setHistoricalType] = useState("daily");
  const [activeTab, setActiveTab] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState(user?.strategy || "ai_weighted");

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchData = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    
    try {
      const [tradesRes, discoveriesRes, botStatusRes, analyticsRes, historicalRes] = await Promise.allSettled([
        BotAPI.getUserTrades?.({ limit: 100 }).catch(() => ({ trades: [] })),
        BotAPI.getDiscoveries?.(20).catch(() => ({ discoveries: [] })),
        BotAPI.getBotStatus?.().catch(() => ({ bots: [] })),
        BotAPI.getAnalyticsSummary?.().catch(() => ({ summary: {} })),
        BotAPI.getPublicHistorical?.().catch(() => ({ daily: [], weekly: [], monthly: [] }))
      ]);

      if (!mountedRef.current) return;

      setDashboardData({
        trades: dedupeTrades(tradesRes.status === "fulfilled" ? tradesRes.value?.trades || [] : []),
        discoveries: discoveriesRes.status === "fulfilled" ? discoveriesRes.value?.discoveries || [] : [],
        bots: botStatusRes.status === "fulfilled" ? botStatusRes.value?.bots || [] : [],
        analytics: analyticsRes.status === "fulfilled" ? analyticsRes.value : { summary: {} },
        historical: historicalRes.status === "fulfilled" ? historicalRes.value : { daily: [], weekly: [], monthly: [] }
      });
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      if (mountedRef.current) setError('Failed to load data');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [refreshing]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const allTrades = useMemo(() => {
    return dedupeTrades(dashboardData.trades)
      .sort((a, b) => new Date(getTradeTimestamp(b) || 0) - new Date(getTradeTimestamp(a) || 0))
      .slice(0, 50);
  }, [dashboardData.trades]);

  const isOpenTrade = (trade) => trade?.status === "open" || (getTradePnlUsd(trade) === 0 && getTradeSide(trade) && !trade?.closed);
  const isClosedTrade = (trade) => getTradePnlUsd(trade) !== 0 || trade?.status === "closed";

  const filteredTrades = useMemo(() => {
    if (activeTab === "open") return allTrades.filter(isOpenTrade);
    if (activeTab === "closed") return allTrades.filter(isClosedTrade);
    return allTrades;
  }, [activeTab, allTrades]);

  const totalPnL = dashboardData.analytics?.summary?.total_pnl || 0;
  const wins = dashboardData.analytics?.summary?.wins || 0;
  const losses = dashboardData.analytics?.summary?.losses || 0;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  const activeBots = dashboardData.bots.filter(b => b.status === "operational" || b.status === "scanning").length;
  const sniperDiscoveries = dashboardData.discoveries.length;
  const tier = normalizeTier(user?.tier);
  const plan = PLANS.find(p => p.value === tier) || PLANS[0];
  const isLive = activation?.has_card_on_file || false;

  const handleRefresh = () => fetchData();
  const handleStrategyChange = (newStrategy) => setCurrentStrategy(newStrategy);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to view your dashboard</p>
          <button onClick={() => navigate("/login")} className="px-6 py-2 bg-emerald-600 text-white rounded-xl">Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">👋 Hey, {user.email?.split('@')[0]}!</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                  <span>{plan.icon}</span>
                  <span className="capitalize">{tier}</span>
                </span>
                {isLive ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-green-100 text-green-700">✓ Live</span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-amber-100 text-amber-700">📝 Paper</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleRefresh} disabled={refreshing} className="text-sm text-gray-500 hover:text-gray-700">
                {refreshing ? "⟳" : "🔄 Refresh"}
              </button>
              <button onClick={() => setShowSettings(true)} className="text-sm bg-gray-100 px-3 py-1.5 rounded-lg">
                ⚙️ Settings
              </button>
              <button onClick={() => setShowApiKeys(true)} className="text-sm bg-gray-100 px-3 py-1.5 rounded-lg">
                🔑 API Keys
              </button>
              <Link to="/pricing" className="text-sm bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 rounded-lg text-white">Upgrade →</Link>
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-2">Last update: {lastUpdate?.toLocaleTimeString() || 'Never'}</div>
        </div>

        {/* Quick Links */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <Link to="/billing-dashboard" className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm">💳 Billing Dashboard</Link>
            <Link to="/billing" className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm">💰 Change Payment Method</Link>
            <Link to="/activation" className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm">⚡ Activation Status</Link>
            <Link to="/pricing" className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-sm">⭐ Upgrade Plan</Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">{error}</div>
        )}

        {/* Performance Chart */}
        <CardShell title="Performance History" icon="📈">
          <PerformanceChart historicalData={dashboardData.historical} type={historicalType} onTypeChange={setHistoricalType} />
        </CardShell>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard title="Total P&L" value={formatUsd(totalPnL)} color={totalPnL >= 0 ? "emerald" : "red"} />
          <StatCard title="Win Rate" value={`${winRate}%`} subtext={`${wins}W / ${losses}L`} color="purple" />
          <StatCard title="Active Bots" value={activeBots} color="cyan" />
          <StatCard title="Strategy" value={STRATEGIES.find(s => s.value === currentStrategy)?.label || "Balanced"} color="blue" />
        </div>

        {/* Bot Status */}
        <CardShell title="Your Trading Bots" icon="🤖">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {dashboardData.bots.slice(0, 4).map((bot, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getBotIcon(bot.name)}</span>
                  <span className="font-medium text-gray-900">{bot.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Status:</span>
                  <span className={bot.status === "operational" ? "text-green-600" : "text-gray-600"}>{bot.status || "Online"}</span>
                </div>
              </div>
            ))}
          </div>
        </CardShell>

        {/* DEX Discoveries */}
        {sniperDiscoveries > 0 && (
          <CardShell title="New Token Discoveries" icon="🦄">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {dashboardData.discoveries.slice(0, 6).map((d, i) => (
                <div key={i} className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm">
                  <div className="font-medium truncate">{d.token || d.address || "New token"}</div>
                  <div className="text-xs text-gray-500 mt-1">Score: {d.score || d.ai_score || "—"}</div>
                </div>
              ))}
            </div>
          </CardShell>
        )}

        {/* Recent Trades */}
        <CardShell title="Recent Trading Activity" icon="📋">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-3">
            {[
              { id: "all", label: "All", count: allTrades.length },
              { id: "open", label: "Open", count: allTrades.filter(isOpenTrade).length },
              { id: "closed", label: "Closed", count: allTrades.filter(isClosedTrade).length }
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === tab.id ? "bg-emerald-600 text-white" : "text-gray-600"}`}>
                {tab.label} {tab.count > 0 && <span className="ml-1">({tab.count})</span>}
              </button>
            ))}
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredTrades.length === 0 ? (
              <div className="text-center py-6 text-gray-400">No trades yet</div>
            ) : (
              filteredTrades.map((trade, i) => <TradeRow key={trade.id || i} trade={trade} />)
            )}
          </div>
        </CardShell>

        {/* Footer */}
        <div className="text-center pt-4 border-t border-gray-200 flex justify-center gap-4 text-sm">
          <Link to="/pricing" className="text-amber-600 hover:text-amber-700">Upgrade Plan</Link>
          <Link to="/live" className="text-emerald-600 hover:text-emerald-700">Public Dashboard</Link>
          <Link to="/billing-dashboard" className="text-blue-600 hover:text-blue-700">Billing</Link>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentStrategy={currentStrategy}
        onStrategyChange={handleStrategyChange}
        user={user}
      />

      {/* API Keys Modal */}
      <ApiKeysModal 
        isOpen={showApiKeys}
        onClose={() => setShowApiKeys(false)}
      />
    </div>
  );
}
