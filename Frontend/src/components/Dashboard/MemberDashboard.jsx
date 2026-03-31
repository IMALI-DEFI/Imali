// src/pages/member/MemberDashboard.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BotAPI from "../../utils/BotAPI";
import socketService from "../../services/socketService";
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
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
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

/* ===================== CONSTANTS ===================== */
const STRATEGIES = [
  { value: "mean_reversion", label: "Conservative", icon: "🛡️", risk: 1, description: "Lower risk, steady returns" },
  { value: "ai_weighted", label: "Balanced", icon: "🤖", risk: 2, description: "AI-optimized risk/reward" },
  { value: "momentum", label: "Growth", icon: "📈", risk: 3, description: "Higher risk, higher potential" },
  { value: "volume_spike", label: "Aggressive", icon: "🔥", risk: 4, description: "Maximum risk, maximum reward" },
];

const PLANS = [
  { value: "starter", label: "Starter", icon: "🎟️", price: 49, 
    features: ["OKX Spot", "Stock Bot"], 
    color: "blue", priceLabel: "$49/mo" },
  { value: "pro", label: "Pro", icon: "⭐", price: 99, 
    features: ["OKX Spot", "Stock Bot", "Staking", "Yield Farming"], 
    color: "purple", priceLabel: "$99/mo" },
  { value: "elite", label: "Elite", icon: "👑", price: 199, 
    features: ["OKX Spot", "Stock Bot", "DEX Sniper", "Futures", "NFT Marketplace", "Staking", "Yield Farming"], 
    color: "amber", priceLabel: "$199/mo" },
  { value: "stock", label: "Stocks", icon: "📈", price: 79, 
    features: ["Stock Bot", "DEX Sniper"], 
    color: "emerald", priceLabel: "$79/mo" },
  { value: "bundle", label: "Bundle", icon: "🧩", price: 299, 
    features: ["OKX Spot", "Stock Bot", "DEX Sniper", "Futures", "Staking", "Yield Farming", "NFT Marketplace"], 
    color: "amber", priceLabel: "$299/mo" },
];

const TIER_BOTS = {
  starter: ["OKX Spot", "Stock Bot"],
  pro: ["OKX Spot", "Stock Bot", "Staking", "Yield Farming"],
  elite: ["OKX Spot", "Stock Bot", "DEX Sniper", "Futures", "NFT Marketplace", "Staking", "Yield Farming"],
  stock: ["Stock Bot", "DEX Sniper"],
  bundle: ["OKX Spot", "Stock Bot", "DEX Sniper", "Futures", "Staking", "Yield Farming", "NFT Marketplace"],
};

/* ===================== HELPER FUNCTIONS ===================== */
const safeNumber = (v, f = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : f;
};

const safeExtract = (response, fallback = null) => {
  if (!response) return fallback;
  if (response.data && typeof response.data === 'object') {
    return response.data;
  }
  return response;
};

const normalizeArray = (v) => (Array.isArray(v) ? v : []);

const formatUsd = (n) => {
  const num = safeNumber(n);
  const sign = num >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(num).toFixed(2)}`;
};

const formatUsdPlain = (n) => {
  const num = safeNumber(n);
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatCompact = (n) => {
  const num = safeNumber(n);
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(0);
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
    const day = Math.floor(hr / 24);

    if (sec < 30) return "just now";
    if (sec < 60) return `${sec}s ago`;
    if (min < 60) return `${min}m ago`;
    if (hr < 24) return `${hr}h ago`;
    return `${day}d ago`;
  } catch {
    return "—";
  }
};

const getTradeTimestamp = (trade) => {
  return trade?.created_at || trade?.timestamp || trade?.time || trade?.received_at || null;
};

const getTradePnlUsd = (trade) => {
  return trade?.pnl_usd ?? trade?.pnl ?? 0;
};

const getTradePnlPercent = (trade) => {
  return trade?.pnl_percentage ?? trade?.pnl_pct ?? trade?.return_percent ?? 0;
};

const getTradeSide = (trade) => {
  return String(trade?.side || trade?.action || "").toLowerCase();
};

const getTradeBot = (trade) => {
  return trade?.bot || trade?.source || trade?.exchange || trade?.chain || "Unknown";
};

const getTradePrice = (trade) => {
  return trade?.price ?? trade?.entry_price ?? 0;
};

const getTradeQty = (trade) => {
  return trade?.qty ?? trade?.quantity ?? trade?.size ?? 0;
};

const dedupeTrades = (trades) => {
  const seen = new Set();
  const unique = [];

  for (const trade of normalizeArray(trades)) {
    const key = [
      trade?.id || "",
      trade?.symbol || "",
      getTradeSide(trade),
      getTradeTimestamp(trade) || "",
      getTradePrice(trade),
      getTradeQty(trade),
      getTradeBot(trade),
    ].join("|");

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

const tierHasFeature = (userTier, feature) => {
  const tier = normalizeTier(userTier);
  return TIER_BOTS[tier]?.includes(feature) || false;
};

const getBotIcon = (botName) => {
  const name = String(botName || "").toLowerCase();
  if (name.includes('okx')) return "🔷";
  if (name.includes('futures')) return "📊";
  if (name.includes('stock')) return "📈";
  if (name.includes('sniper')) return "🦄";
  if (name.includes('staking')) return "🥩";
  if (name.includes('yield') || name.includes('farming')) return "🌾";
  if (name.includes('nft')) return "🖼️";
  return "🤖";
};

/* ===================== CHART COMPONENTS ===================== */
const tooltipOptions = {
  backgroundColor: 'rgba(17, 24, 39, 0.95)',
  titleColor: '#f3f4f6',
  bodyColor: '#9ca3af',
  borderColor: 'rgba(16, 185, 129, 0.3)',
  borderWidth: 1,
  padding: 12,
  caretSize: 6,
  cornerRadius: 8,
  displayColors: true,
  usePointStyle: true,
};

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
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(16, 185, 129, 0.5)');
            gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
            return gradient;
          },
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: pnlData.map(v => v >= 0 ? '#10b981' : '#ef4444'),
          pointBorderColor: 'white',
          pointBorderWidth: 1,
          borderWidth: 2,
          yAxisID: 'y',
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
          yAxisID: 'y1',
        }
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#9ca3af',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          font: { size: 11 }
        }
      },
      tooltip: tooltipOptions,
    },
    scales: {
      x: {
        grid: { color: 'rgba(75, 85, 99, 0.2)', display: true },
        ticks: { color: '#9ca3af', maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: 'rgba(75, 85, 99, 0.2)' },
        ticks: {
          color: '#9ca3af',
          callback: (value) => `$${formatCompact(value)}`
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: {
          color: '#8b5cf6',
          callback: (value) => `$${formatCompact(value)}`
        },
      }
    },
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2">
          {["daily", "weekly", "monthly"].map((period) => (
            <button
              key={period}
              onClick={() => onTypeChange(period)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                type === period 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setChartType('line')}
            className={`p-1.5 rounded-lg text-sm transition-all ${
              chartType === 'line' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
            title="Line Chart"
          >
            📈
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`p-1.5 rounded-lg text-sm transition-all ${
              chartType === 'bar' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
            title="Bar Chart"
          >
            📊
          </button>
        </div>
      </div>

      <div className="h-64 bg-gradient-to-br from-gray-800/20 to-gray-900/20 rounded-xl p-3 border border-white/10">
        {chartData.length > 0 ? (
          chartType === 'line' ? (
            <Line data={getChartData()} options={chartOptions} />
          ) : (
            <Bar 
              data={{
                ...getChartData(),
                datasets: [{
                  ...getChartData().datasets[0],
                  backgroundColor: getChartData().datasets[0].data.map(v => 
                    v >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'
                  ),
                  borderColor: getChartData().datasets[0].data.map(v => 
                    v >= 0 ? '#10b981' : '#ef4444'
                  ),
                }]
              }} 
              options={chartOptions} 
            />
          )
        ) : (
          <div className="h-full flex items-center justify-center text-white/30">
            No historical data yet
          </div>
        )}
      </div>
    </div>
  );
}

function WinLossChart({ wins, losses }) {
  const data = {
    labels: ['Wins', 'Losses'],
    datasets: [{
      data: [wins, losses],
      backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(239, 68, 68, 0.8)'],
      borderColor: ['#10b981', '#ef4444'],
      borderWidth: 2,
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: tooltipOptions,
    },
    cutout: '65%',
  };

  return (
    <div className="h-32">
      <Doughnut data={data} options={options} />
    </div>
  );
}

/* ===================== UI COMPONENTS ===================== */
const CardShell = ({ title, icon, right, children }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
    {(title || icon || right) && (
      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-base sm:text-lg">{icon}</span>}
          {title && <h3 className="font-semibold text-sm sm:text-base truncate">{title}</h3>}
        </div>
        {right && <div className="flex-shrink-0">{right}</div>}
      </div>
    )}
    {children}
  </div>
);

const CollapsibleCard = ({ title, icon, right, children, defaultOpen = true }) => (
  <details className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden" open={defaultOpen}>
    <summary className="list-none cursor-pointer select-none">
      <div className="flex items-center justify-between gap-2 p-3 sm:p-4">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-base sm:text-lg">{icon}</span>}
          <h3 className="font-semibold text-sm sm:text-base truncate">{title}</h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {right}
          <span className="text-white/40 text-xs">▾</span>
        </div>
      </div>
    </summary>
    <div className="px-3 pb-3 sm:px-4 sm:pb-4">{children}</div>
  </details>
);

const StatCard = ({ title, value, subtext, color = "emerald" }) => {
  const colorClasses = {
    emerald: "text-emerald-400",
    indigo: "text-indigo-400",
    purple: "text-purple-400",
    amber: "text-amber-400",
    red: "text-red-400",
    cyan: "text-cyan-400",
  };

  return (
    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
      <div className="text-xs text-white/50">{title}</div>
      <div className={`text-xl font-bold mt-1 ${colorClasses[color]}`}>{value}</div>
      {subtext && <div className="text-[10px] text-white/30 mt-0.5">{subtext}</div>}
    </div>
  );
};

const MetricRow = ({ label, value, valueClassName = "text-white font-medium" }) => (
  <div className="flex justify-between items-center gap-2 text-xs">
    <span className="text-white/50">{label}</span>
    <span className={valueClassName}>{value}</span>
  </div>
);

const TradeRow = ({ trade }) => {
  const side = getTradeSide(trade);
  const pnlUsd = safeNumber(getTradePnlUsd(trade), 0);
  const pnlPercent = safeNumber(getTradePnlPercent(trade), 0);
  const qty = safeNumber(getTradeQty(trade), 0);
  const price = safeNumber(getTradePrice(trade), 0);
  const symbol = trade?.symbol || "Unknown";
  const bot = getTradeBot(trade);
  const ts = getTradeTimestamp(trade);

  const isBuy = side === "buy" || side === "long";
  const isSell = side === "sell" || side === "short";
  const isClose = side === "close" || side === "exit";
  const isOpen = !isClose && trade?.status === "open" && pnlUsd === 0;

  let borderColor = "border-l-gray-500";
  let bgColor = "bg-white/[0.03]";
  let badgeColor = "bg-gray-500/20 text-gray-300";
  let badgeText = side ? side.toUpperCase() : "UNKNOWN";

  if (isOpen) {
    borderColor = "border-l-blue-500";
    bgColor = "bg-blue-500/5";
    badgeColor = "bg-blue-500/20 text-blue-300";
    badgeText = "OPEN";
  } else if (isClose) {
    borderColor = "border-l-purple-500";
    bgColor = "bg-purple-500/5";
    badgeColor = "bg-purple-500/20 text-purple-300";
    badgeText = "CLOSED";
  } else if (isBuy) {
    borderColor = "border-l-green-500";
    bgColor = "bg-green-500/5";
    badgeColor = "bg-green-500/20 text-green-300";
    badgeText = "BUY";
  } else if (isSell) {
    borderColor = "border-l-red-500";
    bgColor = "bg-red-500/5";
    badgeColor = "bg-red-500/20 text-red-300";
    badgeText = "SELL";
  }

  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm border-l-4 ${borderColor} ${bgColor}`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-base shrink-0">{getBotIcon(bot)}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{symbol}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${badgeColor}`}>{badgeText}</span>
            <span className="text-[10px] text-white/35">{bot}</span>
          </div>
          <div className="text-[10px] text-white/35">
            {timeAgo(ts)} • {formatUsdPlain(price)} • {qty > 0 ? `${qty.toFixed(4)} units` : "—"}
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        {isOpen ? (
          <div className="font-bold text-sm text-blue-400">Open</div>
        ) : pnlUsd !== 0 ? (
          <div>
            <div className={`font-bold text-sm ${pnlUsd > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatUsd(pnlUsd)}
            </div>
            <div className={`text-[10px] ${pnlPercent > 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
              {formatPercent(pnlPercent)}
            </div>
          </div>
        ) : (
          <div className="font-bold text-sm text-white">{formatUsdPlain(price)}</div>
        )}
      </div>
    </div>
  );
};

const DiscoveryCard = ({ discovery }) => {
  const score = safeNumber(discovery?.ai_score ?? discovery?.score, 0);
  const chain = discovery?.chain || "ethereum";
  const age = discovery?.age ?? discovery?.age_blocks ?? 0;
  const pair = discovery?.pair || discovery?.address || discovery?.token || "New token";

  let scoreColor = "text-orange-400";
  if (score >= 0.7) scoreColor = "text-green-400";
  else if (score >= 0.5) scoreColor = "text-yellow-400";

  return (
    <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 text-xs hover:bg-purple-500/10 transition-colors">
      <div className="flex justify-between items-start mb-2 gap-2">
        <span className="font-medium flex items-center gap-1 min-w-0">
          <span className="text-base shrink-0">🦄</span>
          <span className="capitalize truncate">{chain}</span>
        </span>
        <span className="text-white/40 text-[10px] shrink-0">{age} blocks</span>
      </div>
      <div className="text-white/60 font-mono text-[10px] mb-2 truncate">{pair}</div>
      <div className="flex justify-between items-center gap-2">
        <div>
          <span className="text-white/40">AI Score</span>
          <span className={`ml-2 font-bold ${scoreColor}`}>{score.toFixed(2)}</span>
        </div>
        {score >= 0.7 ? (
          <span className="text-[8px] bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
            Ready
          </span>
        ) : null}
      </div>
    </div>
  );
};

const FeatureLock = ({ feature, children }) => {
  const { user } = useAuth();
  const tier = normalizeTier(user?.tier);
  const hasFeature = tierHasFeature(tier, feature);
  
  if (hasFeature) return children;
  
  return (
    <div className="relative group">
      <div className="opacity-50 pointer-events-none blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Link 
          to="/pricing" 
          className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs border border-amber-500/30 text-amber-300 hover:bg-black/70 transition-all"
        >
          🔒 Upgrade to Unlock
        </Link>
      </div>
    </div>
  );
};

const BotStatusCard = ({ bot }) => {
  const isOnline = bot?.status === "operational" || bot?.status === "scanning";
  const botName = bot?.name || "Unknown";
  
  return (
    <CardShell title={botName} icon={getBotIcon(botName)}>
      <MetricRow 
        label="Status" 
        value={isOnline ? "Online" : "Offline"} 
        valueClassName={isOnline ? "text-green-400" : "text-red-400"} 
      />
      {botName.includes("Futures") && (
        <>
          <MetricRow label="Pairs" value={bot?.metrics?.pairs || 150} />
          <MetricRow label="Positions" value={bot?.positions || 0} />
        </>
      )}
      {botName.includes("Stock") && (
        <>
          <MetricRow label="Symbols" value={bot?.symbols || 500} />
          <MetricRow label="Mode" value={bot?.mode || "paper"} />
        </>
      )}
      {botName.includes("Sniper") && (
        <>
          <MetricRow label="Discoveries" value={bot?.discoveries || 0} valueClassName="text-purple-400" />
          <MetricRow label="Networks" value={bot?.active_networks?.join(", ") || "—"} />
        </>
      )}
      {botName.includes("OKX") && (
        <>
          <MetricRow label="Positions" value={bot?.positions || 0} />
          <MetricRow label="Trades" value={bot?.total_trades || 0} />
        </>
      )}
    </CardShell>
  );
};

/* ===================== MAIN DASHBOARD ===================== */
export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, activation, token } = useAuth();

  // State for all data from API
  const [dashboardData, setDashboardData] = useState({
    trades: [],
    discoveries: [],
    bots: [],
    analytics: {
      summary: {
        total_trades: 0,
        total_pnl: 0,
        win_rate: 0,
        wins: 0,
        losses: 0
      }
    },
    historical: { daily: [], weekly: [], monthly: [] }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [historicalType, setHistoricalType] = useState("daily");
  const [activeTab, setActiveTab] = useState("all");
  const [isConnected, setIsConnected] = useState(false);
  const [livePnlUpdate, setLivePnlUpdate] = useState(null);

  const mountedRef = useRef(true);
  const tradesRef = useRef([]);
  const pnlRef = useRef(0);

  // Update trades ref when dashboard data changes
  useEffect(() => {
    tradesRef.current = dashboardData.trades;
  }, [dashboardData.trades]);

  // Update pnl ref when analytics changes
  useEffect(() => {
    pnlRef.current = dashboardData.analytics?.summary?.total_pnl || 0;
  }, [dashboardData.analytics]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!token) return;

    const initSocket = async () => {
      try {
        await socketService.connect(token);
        setIsConnected(true);
        console.log("[MemberDashboard] Socket.IO connected");

        // Subscribe to trade updates
        socketService.onTrade((trade) => {
          console.log("[MemberDashboard] New trade received:", trade);
          
          if (mountedRef.current) {
            // Add new trade to the list
            const newTrade = {
              ...trade,
              created_at: trade.timestamp || new Date().toISOString()
            };
            
            setDashboardData(prev => ({
              ...prev,
              trades: [newTrade, ...prev.trades].slice(0, 500)
            }));

            // Update analytics summary
            const newPnl = (pnlRef.current || 0) + (trade.pnl || 0);
            const isWin = (trade.pnl || 0) > 0;
            
            setDashboardData(prev => ({
              ...prev,
              analytics: {
                ...prev.analytics,
                summary: {
                  ...prev.analytics?.summary,
                  total_pnl: newPnl,
                  total_trades: (prev.analytics?.summary?.total_trades || 0) + 1,
                  wins: (prev.analytics?.summary?.wins || 0) + (isWin ? 1 : 0),
                  losses: (prev.analytics?.summary?.losses || 0) + (!isWin && trade.pnl !== 0 ? 1 : 0),
                }
              }
            }));

            setLastUpdate(new Date());
          }
        });

        // Subscribe to P&L updates
        socketService.onPnlUpdate((pnlData) => {
          console.log("[MemberDashboard] P&L update received:", pnlData);
          if (mountedRef.current) {
            setLivePnlUpdate(pnlData);
            
            // Update cumulative P&L
            setDashboardData(prev => ({
              ...prev,
              analytics: {
                ...prev.analytics,
                summary: {
                  ...prev.analytics?.summary,
                  total_pnl: pnlData.total_pnl || prev.analytics?.summary?.total_pnl || 0
                }
              }
            }));
          }
        });

      } catch (err) {
        console.error("[MemberDashboard] Socket.IO connection failed:", err);
        setIsConnected(false);
      }
    };

    initSocket();

    return () => {
      socketService.disconnect();
      setIsConnected(false);
    };
  }, [token]);

  // Fetch initial data using BotAPI
  const fetchData = useCallback(async () => {
    try {
      console.log("[MemberDashboard] Fetching dashboard data...");
      
      const [tradesRes, discoveriesRes, botStatusRes, analyticsRes, historicalRes] = await Promise.allSettled([
        (async () => {
          try {
            if (typeof BotAPI.getTrades === 'function') {
              return await BotAPI.getTrades(100);
            } else if (typeof BotAPI.getSniperTrades === 'function') {
              return await BotAPI.getSniperTrades(100);
            }
            return { trades: [] };
          } catch (e) {
            console.warn("[MemberDashboard] Trades fetch failed:", e);
            return { trades: [] };
          }
        })(),
        
        (async () => {
          try {
            if (typeof BotAPI.getDiscoveries === 'function') {
              return await BotAPI.getDiscoveries(20);
            }
            return { discoveries: [] };
          } catch (e) {
            console.warn("[MemberDashboard] Discoveries fetch failed:", e);
            return { discoveries: [] };
          }
        })(),
        
        (async () => {
          try {
            if (typeof BotAPI.getBotStatus === 'function') {
              return await BotAPI.getBotStatus();
            }
            return { bots: [] };
          } catch (e) {
            console.warn("[MemberDashboard] Bot status fetch failed:", e);
            return { bots: [] };
          }
        })(),
        
        (async () => {
          try {
            if (typeof BotAPI.getAnalyticsSummary === 'function') {
              return await BotAPI.getAnalyticsSummary();
            }
            return { summary: {} };
          } catch (e) {
            console.warn("[MemberDashboard] Analytics fetch failed:", e);
            return { summary: {} };
          }
        })(),
        
        (async () => {
          try {
            if (typeof BotAPI.getPublicHistorical === 'function') {
              return await BotAPI.getPublicHistorical();
            }
            const response = await fetch(`/api/public/historical`);
            return await response.json();
          } catch (e) {
            console.warn("[MemberDashboard] Historical fetch failed:", e);
            return { daily: [], weekly: [], monthly: [] };
          }
        })()
      ]);

      if (!mountedRef.current) return;

      const tradesData = tradesRes.status === "fulfilled" ? safeExtract(tradesRes.value) : { trades: [] };
      const discoveriesData = discoveriesRes.status === "fulfilled" ? safeExtract(discoveriesRes.value) : { discoveries: [] };
      const botStatusData = botStatusRes.status === "fulfilled" ? safeExtract(botStatusRes.value) : { bots: [] };
      const analyticsData = analyticsRes.status === "fulfilled" ? safeExtract(analyticsRes.value) : { summary: {} };
      const historicalData = historicalRes.status === "fulfilled" ? historicalRes.value : { daily: [], weekly: [], monthly: [] };

      setDashboardData({
        trades: tradesData?.trades || [],
        discoveries: discoveriesData?.discoveries || [],
        bots: botStatusData?.bots || [],
        analytics: analyticsData,
        historical: historicalData
      });

      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('[MemberDashboard] Failed to fetch data:', err);
      if (mountedRef.current) {
        setError('Failed to fetch live data');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Initial load and periodic refresh (fallback for missed socket events)
  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds as fallback (socket should handle real-time)
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Calculate derived stats from real data
  const allTrades = useMemo(() => {
    return dedupeTrades(dashboardData.trades)
      .sort((a, b) => {
        const tA = new Date(getTradeTimestamp(a) || 0).getTime();
        const tB = new Date(getTradeTimestamp(b) || 0).getTime();
        return tB - tA;
      })
      .slice(0, 50);
  }, [dashboardData.trades]);

  const isOpenTrade = (trade) => {
    const pnl = getTradePnlUsd(trade);
    return trade?.status === "open" || (pnl === 0 && getTradeSide(trade) && !trade?.closed);
  };

  const isClosedTrade = (trade) => {
    const pnl = getTradePnlUsd(trade);
    return pnl !== 0 || trade?.status === "closed" || getTradeSide(trade) === "close";
  };

  const filteredTrades = useMemo(() => {
    if (activeTab === "open") return allTrades.filter(isOpenTrade);
    if (activeTab === "closed") return allTrades.filter(isClosedTrade);
    return allTrades;
  }, [activeTab, allTrades]);

  const tabs = [
    { id: "all", label: "All", icon: "🌐", count: allTrades.length },
    { id: "open", label: "Open", icon: "🟢", count: allTrades.filter(isOpenTrade).length },
    { id: "closed", label: "Closed", icon: "✅", count: allTrades.filter(isClosedTrade).length },
  ];

  const totalPnL = dashboardData.analytics?.summary?.total_pnl || 0;
  const wins = dashboardData.analytics?.summary?.wins || 0;
  const losses = dashboardData.analytics?.summary?.losses || 0;
  const winRate = dashboardData.analytics?.summary?.win_rate || 
    (wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0);

  const todayPnL = useMemo(() => {
    const today = new Date().toDateString();
    return allTrades
      .filter(t => new Date(getTradeTimestamp(t) || 0).toDateString() === today)
      .reduce((sum, t) => sum + safeNumber(getTradePnlUsd(t), 0), 0);
  }, [allTrades]);

  const activeBots = dashboardData.bots.filter(b => 
    b.status === "operational" || b.status === "scanning"
  ).length;

  const sniperBot = dashboardData.bots.find(b => b.name?.includes("Sniper"));
  const okxBot = dashboardData.bots.find(b => b.name?.includes("OKX"));
  const futuresBot = dashboardData.bots.find(b => b.name?.includes("Futures"));
  const stockBot = dashboardData.bots.find(b => b.name?.includes("Stock"));

  const sniperDiscoveries = sniperBot?.discoveries || dashboardData.discoveries.length;
  const okxPositions = okxBot?.positions || 0;

  const tier = normalizeTier(user?.tier);
  const plan = PLANS.find(p => p.value === tier) || PLANS[0];
  const isLive = activation?.has_card_on_file || false;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mx-auto mb-4" />
          <p className="text-white/60">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white/60 mb-4">Please log in to view your dashboard</p>
          <button onClick={() => navigate("/login")} className="px-6 py-2 bg-emerald-600 rounded-xl">
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white">
      <div className="max-w-7xl mx-auto px-3 py-3 sm:p-4 md:p-6 space-y-3 sm:space-y-5">
        
        {/* Connection Status */}
        <div className="flex justify-between items-center gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
            <span className="text-white/60">
              {isConnected ? 'Live updates via WebSocket' : 'Using periodic updates'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/live" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              <span>👁️</span> Public Dashboard
            </Link>
            <span className="text-white/40">
              Last update: {lastUpdate?.toLocaleTimeString() || 'Never'}
            </span>
          </div>
        </div>

        {/* Live P&L Alert */}
        {livePnlUpdate && (
          <div className={`p-3 rounded-2xl text-sm transition-all duration-300 ${
            livePnlUpdate.pnl > 0 
              ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-200'
              : 'bg-red-600/20 border border-red-500/40 text-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <span>⚡ Live Trade Update</span>
              <span className="font-bold">{formatUsd(livePnlUpdate.pnl)}</span>
            </div>
            <div className="text-xs opacity-75 mt-1">
              {livePnlUpdate.symbol} • {formatPercent(livePnlUpdate.pnl_percent)}
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-3 bg-red-600/10 border border-red-500/40 rounded-2xl text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Quick Links */}
        <CardShell>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs text-white/40 mr-1">Quick Links:</span>
            <Link to="/billing" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition-colors">
              <span>💳</span> Billing
            </Link>
            <Link to="/activation" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition-colors">
              <span>⚡</span> Activation
            </Link>
            <Link to="/pricing" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-xs transition-colors">
              <span>⭐</span> Upgrade
            </Link>
          </div>
        </CardShell>

        {/* Header */}
        <CardShell>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold leading-tight min-w-0 truncate">
                  👋 Hey, {user.email?.split('@')[0]}!
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  <span>{plan.icon}</span>
                  <span className="capitalize">{tier}</span>
                </span>
                {isLive ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] sm:text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    ✓ Live Account
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] sm:text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                    📝 Paper Trading
                  </span>
                )}
              </div>
            </div>
            <Link 
              to="/pricing" 
              className="text-xs bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2 rounded-lg hover:from-amber-500 hover:to-orange-500 transition-all"
            >
              Upgrade Plan →
            </Link>
          </div>
        </CardShell>

        {/* Performance Chart */}
        <CardShell title="📈 Performance History" icon="📈">
          <PerformanceChart
            historicalData={dashboardData.historical}
            type={historicalType}
            onTypeChange={setHistoricalType}
          />
        </CardShell>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard title="Total P&L" value={formatUsd(totalPnL)} color={totalPnL >= 0 ? "emerald" : "red"} />
          <StatCard title="Win Rate" value={`${winRate}%`} subtext={`${wins}W / ${losses}L`} color="purple" />
          <StatCard title="Today's P&L" value={formatUsd(todayPnL)} color={todayPnL >= 0 ? "emerald" : "red"} />
          <StatCard title="Active Bots" value={activeBots} subtext="Systems online" color="cyan" />
        </div>

        {/* Bot Cards */}
        <CollapsibleCard title="🤖 Your Trading Bots" icon="🤖" defaultOpen={true}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {okxBot && <BotStatusCard bot={okxBot} />}
            {stockBot && <BotStatusCard bot={stockBot} />}

            <FeatureLock feature="Futures">
              {futuresBot ? (
                <BotStatusCard bot={futuresBot} />
              ) : (
                <CardShell title="Futures" icon="📊">
                  <MetricRow label="Status" value="Ready to deploy" valueClassName="text-amber-400" />
                  <MetricRow label="Pairs" value="199" />
                  <MetricRow label="Leverage" value="Up to 5x" />
                </CardShell>
              )}
            </FeatureLock>

            <FeatureLock feature="DEX Sniper">
              {sniperBot ? (
                <BotStatusCard bot={sniperBot} />
              ) : (
                <CardShell title="DEX Sniper" icon="🦄">
                  <MetricRow label="Status" value="Ready" valueClassName="text-amber-400" />
                  <MetricRow label="Networks" value="ETH, BSC, POLY" />
                  <MetricRow label="Discoveries" value={sniperDiscoveries} />
                </CardShell>
              )}
            </FeatureLock>

            <FeatureLock feature="Staking">
              <CardShell title="Staking" icon="🥩">
                <MetricRow label="Staked" value="$25,000" />
                <MetricRow label="APY" value="8.5%" valueClassName="text-emerald-400" />
                <MetricRow label="Rewards" value="$1,875" />
              </CardShell>
            </FeatureLock>

            <FeatureLock feature="Yield Farming">
              <CardShell title="Yield Farming" icon="🌾">
                <MetricRow label="Value" value="$15,000" />
                <MetricRow label="APY" value="12.2%" valueClassName="text-emerald-400" />
                <MetricRow label="Pools" value="3" />
              </CardShell>
            </FeatureLock>

            <FeatureLock feature="NFT Marketplace">
              <CardShell title="NFTs" icon="🖼️">
                <MetricRow label="Owned" value="12" />
                <MetricRow label="Floor" value="0.85 ETH" />
                <MetricRow label="Volume" value="234 ETH" />
              </CardShell>
            </FeatureLock>
          </div>
        </CollapsibleCard>

        {/* Win/Loss Chart and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <CardShell title="Win/Loss Distribution" icon="📊">
            <WinLossChart wins={wins} losses={losses} />
            <div className="flex justify-center gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span className="text-white/50">Wins {wins}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <span className="text-white/50">Losses {losses}</span>
              </div>
            </div>
          </CardShell>

          <CardShell title="Quick Stats" icon="📊">
            <div className="space-y-2 text-xs">
              <MetricRow label="Total Trades" value={allTrades.length} />
              <MetricRow label="Open Positions" value={allTrades.filter(isOpenTrade).length} />
              <MetricRow label="Win/Loss Ratio" value={(wins / Math.max(losses, 1)).toFixed(2)} />
              <MetricRow label="WebSocket" value={isConnected ? "Connected" : "Disconnected"} valueClassName={isConnected ? "text-green-400" : "text-red-400"} />
            </div>
          </CardShell>

          <CardShell title="System Status" icon="📡">
            <div className="space-y-2 text-xs">
              <MetricRow label="API" value="Connected" valueClassName="text-green-400" />
              <MetricRow label="Real-time" value={isConnected ? "Active" : "Fallback"} valueClassName={isConnected ? "text-green-400" : "text-amber-400"} />
              <MetricRow label="Your Tier" value={tier.toUpperCase()} valueClassName="text-amber-400" />
            </div>
          </CardShell>
        </div>

        {/* DEX Discoveries */}
        {sniperDiscoveries > 0 && tierHasFeature(tier, "DEX Sniper") && (
          <CardShell title="🦄 New Token Discoveries" icon="🦄">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {dashboardData.discoveries.slice(0, 6).map((d, i) => (
                <DiscoveryCard key={i} discovery={d} />
              ))}
            </div>
          </CardShell>
        )}

        {/* Upgrade Prompt */}
        {!tierHasFeature(tier, "Staking") && !tierHasFeature(tier, "Yield Farming") && !tierHasFeature(tier, "NFT Marketplace") && (
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-5 text-center">
            <h3 className="font-bold text-lg mb-2">🚀 Unlock Advanced Features</h3>
            <p className="text-sm text-white/60 mb-4">
              Upgrade to Pro or Elite to access Staking, Yield Farming, NFT Marketplace and more!
            </p>
            <Link 
              to="/pricing" 
              className="inline-block px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl font-semibold hover:from-amber-500 hover:to-orange-500 transition-all"
            >
              View Plans →
            </Link>
          </div>
        )}

        {/* Recent Trades Feed */}
        <CardShell title="📋 Recent Trading Activity" icon="📋">
          {allTrades.length === 0 ? (
            <div className="text-center py-6 text-white/30 text-sm">
              <div className="text-3xl mb-2">📭</div>
              No trades yet
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-1 bg-black/30 rounded-lg p-1 w-fit">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                      activeTab === tab.id
                        ? "bg-emerald-600 text-white"
                        : "text-white/40 hover:text-white/60"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className="ml-1 text-[8px] bg-white/20 px-1.5 rounded-full">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                {filteredTrades.map((trade, i) => (
                  <TradeRow key={`${trade.id || i}`} trade={trade} />
                ))}
              </div>
            </div>
          )}
        </CardShell>

        {/* Footer */}
        <div className="text-center pt-4 border-t border-white/10 flex justify-center gap-4">
          <Link to="/pricing" className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors">
            ⭐ Upgrade Plan
          </Link>
          <Link to="/live" className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors">
            👁️ Public Live Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
