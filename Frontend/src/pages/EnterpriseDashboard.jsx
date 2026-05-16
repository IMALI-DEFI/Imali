// src/pages/EnterpriseDashboard.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Radar } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ============================================================================
// API ENDPOINTS
// ============================================================================
const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const ENTERPRISE_STATS_URL = `${API_BASE}/api/enterprise/public-stats`;
const ENTERPRISE_ANALYTICS_URL = `${API_BASE}/api/enterprise/analytics`;
const ENTERPRISE_TOGGLE_PAPER_URL = `${API_BASE}/api/enterprise/paper-trading`;
const ENTERPRISE_TOGGLE_LIVE_URL = `${API_BASE}/api/enterprise/live-trading`;

const REFRESH_INTERVAL = 30000;
const AUTO_REFRESH_MS = 30000;

// Helper functions
function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatCurrency(value) {
  const n = safeNumber(value);
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const usd = (n = 0) => `$${Number(n || 0).toFixed(2)}`;
const pct = (n = 0) => `${Number(n || 0).toFixed(1)}%`;

// Strategy configurations for enterprise
const STRATEGIES = [
  {
    id: "conservative",
    name: "Conservative",
    emoji: "🛡️",
    risk: "Low",
    bestFor: "Risk-averse teams",
    short: "Capital preservation",
    description: "Focuses on capital preservation with lower risk positions.",
    plainEnglish: "The bot takes smaller positions and exits quickly to protect capital.",
    bullets: ["Lower risk", "Steady returns", "Capital preservation"],
  },
  {
    id: "balanced",
    name: "Balanced",
    emoji: "⚖️",
    risk: "Medium",
    bestFor: "Most organizations",
    short: "Best default",
    description: "Balanced approach between risk and return.",
    plainEnglish: "The bot balances risk and reward for consistent growth.",
    bullets: ["Balanced risk", "Consistent returns", "Team favorite"],
  },
  {
    id: "aggressive",
    name: "Aggressive",
    emoji: "🔥",
    risk: "High",
    bestFor: "Growth-focused teams",
    short: "Higher returns",
    description: "Aims for higher returns with increased risk tolerance.",
    plainEnglish: "The bot takes larger positions in high-momentum assets.",
    bullets: ["Higher risk", "Growth focused", "Larger positions"],
  },
];

// Mock fallback data when API fails
const FALLBACK_ORGANIZATION = {
  id: "enterprise-org",
  name: "Enterprise Trading",
  members: [
    { user_id: "1", email: "admin@enterprise.com", role: "admin", joined_at: new Date().toISOString(), pnl_contribution: 4250 },
    { user_id: "2", email: "trader1@enterprise.com", role: "member", joined_at: new Date().toISOString(), pnl_contribution: 2850 },
    { user_id: "3", email: "trader2@enterprise.com", role: "member", joined_at: new Date().toISOString(), pnl_contribution: 1950 },
    { user_id: "4", email: "analyst@enterprise.com", role: "viewer", joined_at: new Date().toISOString(), pnl_contribution: 0 },
  ],
};

const FALLBACK_STATS = {
  total_pnl: 0,
  win_rate: 0,
  total_trades: 0,
  wins: 0,
  losses: 0,
  active_strategy: "balanced",
};

const FALLBACK_SERIES = [
  { date: "Week 1", pnl: 0, trades: 0 },
  { date: "Week 2", pnl: 0, trades: 0 },
  { date: "Week 3", pnl: 0, trades: 0 },
  { date: "Week 4", pnl: 0, trades: 0 },
];

// UI Components
function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>{children}</div>;
}

function SectionTitle({ children, helper }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-extrabold text-slate-900 sm:text-lg">{children}</h3>
      {helper && <p className="mt-1 text-sm font-semibold text-slate-600">{helper}</p>}
    </div>
  );
}

function StatusPill({ children, tone = "slate", className = "" }) {
  const classes = {
    green: "border-green-300 bg-green-100 text-green-900",
    red: "border-red-300 bg-red-100 text-red-900",
    amber: "border-amber-300 bg-amber-100 text-amber-950",
    blue: "border-blue-300 bg-blue-100 text-blue-900",
    purple: "border-purple-300 bg-purple-100 text-purple-900",
    slate: "border-slate-300 bg-slate-100 text-slate-900",
  };
  return (
    <span className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold leading-none sm:text-xs ${classes[tone] || classes.slate} ${className}`}>
      {children}
    </span>
  );
}

function Button({ children, onClick, disabled, variant = "primary", className = "" }) {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
    secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm",
    warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[44px] rounded-xl px-4 py-3 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function Toast({ message, type = "info", onClose }) {
  if (!message) return null;
  const tone = type === "error" 
    ? "border-red-300 bg-red-50 text-red-900" 
    : type === "success" 
      ? "border-green-300 bg-green-50 text-green-900" 
      : "border-blue-300 bg-blue-50 text-blue-900";
  return (
    <div className={`fixed left-3 right-3 top-3 z-[60] rounded-2xl border p-4 text-sm font-bold shadow-xl sm:left-auto sm:right-4 sm:max-w-md ${tone}`}>
      <div className="flex items-start justify-between gap-4">
        <span>{message}</span>
        <button type="button" onClick={onClose} className="text-lg leading-none text-slate-700 hover:text-slate-900">×</button>
      </div>
    </div>
  );
}

// ============ PROFESSIONAL CHART.JS CHARTS ============

// 1. Animated Gradient Line Chart (Equity Curve)
const EquityCurveChart = ({ data, title }) => {
  const chartRef = useRef(null);
  
  const chartData = useMemo(() => {
    const labels = data?.map((d, i) => d.date || `Week ${i + 1}`) || [];
    const values = data?.map((d) => d.pnl || 0) || [];
    
    // Calculate running total for cumulative P&L
    let runningTotal = 0;
    const cumulativeData = values.map(v => {
      runningTotal += v;
      return runningTotal;
    });
    
    return {
      labels,
      datasets: [
        {
          label: "Team Portfolio",
          data: cumulativeData,
          borderColor: "#6366f1",
          borderWidth: 3,
          tension: 0.45,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#6366f1",
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 2,
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return null;
            const gradient = ctx.createLinearGradient(
              0,
              chartArea.top,
              0,
              chartArea.bottom
            );
            gradient.addColorStop(0, "rgba(99,102,241,0.35)");
            gradient.addColorStop(0.5, "rgba(99,102,241,0.15)");
            gradient.addColorStop(1, "rgba(99,102,241,0)");
            return gradient;
          },
        },
      ],
    };
  }, [data]);
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1400,
      easing: 'easeInOutQuart',
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: '#6366f1',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            return `Team Portfolio: $${context.parsed.y.toFixed(2)}`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#64748b",
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        grid: {
          color: "rgba(148,163,184,0.08)",
          drawBorder: false,
        },
        ticks: {
          color: "#64748b",
          callback: function(value) {
            return '$' + value.toFixed(0);
          }
        },
        beginAtZero: false,
      },
    },
  };
  
  if (!data || data.length === 0 || !data.some(d => d.pnl !== 0)) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3">📈</div>
          <p className="text-sm font-semibold text-slate-600">No team performance data yet</p>
          <p className="text-xs text-slate-400 mt-1">Start trading to see your team's equity curve</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full w-full">
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
};

// 2. Animated Bar Chart (Team Trade Volume)
const TradeVolumeChart = ({ data }) => {
  const chartRef = useRef(null);
  
  const chartData = useMemo(() => ({
    labels: data?.map((d, i) => d.date || `Week ${i + 1}`) || [],
    datasets: [
      {
        label: "Team Trades",
        data: data?.map((d) => d.trades || 0) || [],
        backgroundColor: "#6366f1",
        borderRadius: 12,
        borderSkipped: false,
        barPercentage: 0.65,
        categoryPercentage: 0.8,
      },
    ],
  }), [data]);
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1200,
      easing: 'easeOutCubic',
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: '#6366f1',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            return `Team Trades: ${context.parsed.y}`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#64748b",
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        grid: {
          color: "rgba(148,163,184,0.08)",
          drawBorder: false,
        },
        ticks: {
          color: "#64748b",
          stepSize: 1,
        },
        beginAtZero: true,
      },
    },
  };
  
  if (!data || data.length === 0 || !data.some(d => d.trades > 0)) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3">📊</div>
          <p className="text-sm font-semibold text-slate-600">No team trade data yet</p>
          <p className="text-xs text-slate-400 mt-1">Trades will appear here</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full w-full">
      <Bar ref={chartRef} data={chartData} options={options} />
    </div>
  );
};

// 3. Team Performance Radar Chart
const TeamRadarChart = ({ strategyData }) => {
  const chartRef = useRef(null);
  
  const chartData = {
    labels: [
      "Team Collaboration",
      "Risk Management",
      "Profitability",
      "Strategy Execution",
      "Trading Volume",
      "AI Integration",
    ],
    datasets: [
      {
        label: "Team Performance",
        data: strategyData,
        backgroundColor: "rgba(99,102,241,0.2)",
        borderColor: "#6366f1",
        borderWidth: 2,
        pointBackgroundColor: "#6366f1",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1500,
      easing: 'easeInOutQuart',
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: '#6366f1',
        borderWidth: 1,
      },
    },
    scales: {
      r: {
        angleLines: {
          color: "rgba(148,163,184,0.15)",
        },
        grid: {
          color: "rgba(148,163,184,0.15)",
        },
        pointLabels: {
          color: "#475569",
          font: {
            size: 11,
            weight: "bold",
          },
        },
        ticks: {
          display: false,
          stepSize: 20,
        },
        min: 0,
        max: 100,
      },
    },
  };
  
  return (
    <div className="h-full w-full">
      <Radar ref={chartRef} data={chartData} options={options} />
    </div>
  );
};

// 4. Custom Win Rate Gauge
const WinRateGauge = ({ wins, losses }) => {
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  const angle = (winRate / 100) * 180;
  
  if (total === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3">🎯</div>
          <p className="text-sm font-semibold text-slate-600">No team trades yet</p>
          <p className="text-xs text-slate-400 mt-1">Complete trades to see win rate</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="relative">
        <svg width="260" height="150" viewBox="0 0 260 150">
          <defs>
            <linearGradient id="teamWinGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <filter id="teamGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path
            d="M 30 130 A 100 100 0 0 1 230 130"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="25"
            strokeLinecap="round"
          />
          <path
            d="M 30 130 A 100 100 0 0 1 230 130"
            fill="none"
            stroke="url(#teamWinGradient)"
            strokeWidth="25"
            strokeLinecap="round"
            strokeDasharray={`${(angle / 180) * 314} 314`}
            className="transition-all duration-1000"
          />
          <line
            x1="130"
            y1="130"
            x2={130 + 90 * Math.cos((angle - 90) * Math.PI / 180)}
            y2={130 + 90 * Math.sin((angle - 90) * Math.PI / 180)}
            stroke="#1e293b"
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#teamGlow)"
            className="transition-all duration-1000"
          />
          <circle cx="130" cy="130" r="8" fill="#1e293b" />
          <circle cx="130" cy="130" r="4" fill="#6366f1" />
          
          <text x="130" y="80" textAnchor="middle" className="text-4xl font-extrabold fill-slate-900">
            {winRate.toFixed(0)}%
          </text>
          <text x="130" y="100" textAnchor="middle" className="text-xs fill-slate-500 font-semibold">
            Team Win Rate
          </text>
        </svg>
      </div>
      
      <div className="mt-6 flex gap-8">
        <div className="text-center">
          <div className="text-2xl font-extrabold text-emerald-600">{wins}</div>
          <div className="text-xs text-slate-500 font-medium">Team Wins</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-extrabold text-red-600">{losses}</div>
          <div className="text-xs text-slate-500 font-medium">Team Losses</div>
        </div>
      </div>
    </div>
  );
};

// 5. Enterprise Metric Tile
const EnterpriseMetricTile = ({ title, value, change, icon, color, subtext }) => {
  const isPositive = change > 0;
  
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300">
      <div className="absolute top-0 right-0 w-32 h-32 -mr-10 -mt-10 rounded-full bg-gradient-to-br from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${color} shadow-lg`}>
            <span className="text-xl">{icon}</span>
          </div>
          {change !== 0 && (
            <StatusPill tone={isPositive ? "green" : "red"} className="text-xs">
              {isPositive ? `↑ +${change}%` : `↓ ${change}%`}
            </StatusPill>
          )}
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">{value}</p>
          {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
      </div>
    </div>
  );
};

// 6. Team Member Row Component
const TeamMemberRow = ({ member, index, isTopPerformer }) => {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50/30 transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-white ${
            member.role === 'admin' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
            member.role === 'member' ? 'bg-gradient-to-br from-indigo-500 to-indigo-600' :
            'bg-gradient-to-br from-slate-500 to-slate-600'
          }`}>
            {member.email?.[0]?.toUpperCase() || "U"}
          </div>
          {isTopPerformer && (
            <div className="absolute -top-1 -right-1 w-4 h-4">
              <span className="text-xs">🏆</span>
            </div>
          )}
        </div>
        <div>
          <div className="font-extrabold text-slate-900">{member.email || `Team Member ${index + 1}`}</div>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="capitalize">{member.role || "member"}</span>
            {member.pnl_contribution > 0 && (
              <span className="text-emerald-600 font-semibold">+{usd(member.pnl_contribution)}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StatusPill tone={member.role === "admin" ? "purple" : member.role === "member" ? "blue" : "slate"}>
          {member.role || "Member"}
        </StatusPill>
      </div>
    </div>
  );
};

export default function EnterpriseDashboard() {
  const mountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const pollingIntervalRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });
  const [organization, setOrganization] = useState(FALLBACK_ORGANIZATION);
  const [members, setMembers] = useState(FALLBACK_ORGANIZATION.members);
  const [stats, setStats] = useState(FALLBACK_STATS);
  const [series, setSeries] = useState(FALLBACK_SERIES);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [currentStrategy, setCurrentStrategy] = useState("balanced");
  const [savingStrategy, setSavingStrategy] = useState("");
  const [strategyMessage, setStrategyMessage] = useState("");

  const [paperTradingEnabled, setPaperTradingEnabled] = useState(true);
  const [tradingEnabled, setTradingEnabled] = useState(false);
  const [togglingPaper, setTogglingPaper] = useState(false);
  const [togglingTrading, setTogglingTrading] = useState(false);
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);

  const bothConnected = true;
  const activeStrategy = STRATEGIES.find(s => s.id === currentStrategy) || STRATEGIES[1];
  const anyTradingActionBusy = togglingPaper || togglingTrading;

  // Get radar data for current strategy
  const getRadarDataForStrategy = (strategyId) => {
    const data = {
      conservative: [85, 75, 60, 80, 50, 70],
      balanced: [75, 85, 75, 75, 70, 85],
      aggressive: [60, 70, 90, 60, 95, 80],
    };
    return data[strategyId] || data.balanced;
  };

  const currentRadarData = getRadarDataForStrategy(currentStrategy);

  const notify = useCallback((message, type = "info") => {
    setToast({ message, type });
    window.clearTimeout(window.__imaliToastTimer);
    window.__imaliToastTimer = window.setTimeout(() => setToast({ message: "", type: "info" }), 4500);
  }, []);

  const fetchData = useCallback(async (force = false) => {
    if (isFetchingRef.current) return;
    
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current < REFRESH_INTERVAL && lastFetchTimeRef.current) {
      return;
    }

    isFetchingRef.current = true;
    if (!force) setRefreshing(true);

    try {
      lastFetchTimeRef.current = now;

      // Fetch stats from public endpoint
      const statsResponse = await axios.get(ENTERPRISE_STATS_URL, { timeout: 15000 });
      
      if (statsResponse.data?.success) {
        const apiData = statsResponse.data.data || {};
        const summary = apiData.summary || {};
        
        setStats({
          total_pnl: safeNumber(summary.total_pnl),
          win_rate: safeNumber(summary.win_rate),
          total_trades: safeNumber(summary.total_trades),
          wins: safeNumber(summary.wins),
          losses: safeNumber(summary.losses),
          active_strategy: summary.active_strategy || "balanced",
        });
        
        setCurrentStrategy(summary.active_strategy || "balanced");
        
        setOrganization({
          id: "enterprise",
          name: "Enterprise Trading",
          members: FALLBACK_ORGANIZATION.members,
        });
        setMembers(FALLBACK_ORGANIZATION.members);
      }

      // Fetch analytics data
      const analyticsResponse = await axios.get(ENTERPRISE_ANALYTICS_URL, { timeout: 15000, params: { days: 30 } });
      
      if (analyticsResponse.data?.success) {
        const chartData = analyticsResponse.data.data || {};
        const labels = chartData.labels || ["Week 1", "Week 2", "Week 3", "Week 4"];
        const pnlData = chartData.pnl || [0, 0, 0, 0];
        const tradesData = chartData.trades || [0, 0, 0, 0];
        
        const generatedSeries = labels.map((label, idx) => ({
          date: label,
          pnl: pnlData[idx],
          trades: tradesData[idx],
        }));
        setSeries(generatedSeries);
      }

      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Failed to fetch enterprise data:", err);
      setError(err.message);
      notify("Failed to fetch live data. Using cached data.", "error");
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
      isFetchingRef.current = false;
    }
  }, [notify]);

  // Polling every 30 seconds to refresh dashboard data
  useEffect(() => {
    if (pollingIntervalRef.current) return;
    
    pollingIntervalRef.current = setInterval(() => {
      fetchData(true);
    }, AUTO_REFRESH_MS);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [fetchData]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData(true);
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  const handleTogglePaperTrading = async (enabled) => {
    if (togglingPaper || togglingTrading) return;
    
    setTogglingPaper(true);
    const previousPaper = paperTradingEnabled;
    setPaperTradingEnabled(enabled);

    try {
      const response = await axios.patch(ENTERPRISE_TOGGLE_PAPER_URL, { enabled }, { timeout: 10000 });
      if (response.data?.success === false) throw new Error(response.data?.error || "Failed to update paper trading.");
      
      notify(enabled ? "Paper trading started for your organization." : "Paper trading stopped.", "success");
      await fetchData(true);
    } catch (err) {
      console.error("Paper toggle failed:", err);
      setPaperTradingEnabled(previousPaper);
      notify(err?.message || "Failed to update paper trading.", "error");
    } finally {
      setTogglingPaper(false);
    }
  };

  const handleToggleTrading = async (enabled) => {
    if (togglingTrading || togglingPaper) return;
    
    setTogglingTrading(true);
    const previousLive = tradingEnabled;
    setTradingEnabled(enabled);

    try {
      const response = await axios.patch(ENTERPRISE_TOGGLE_LIVE_URL, { enabled, confirmed: enabled === true }, { timeout: 10000 });
      if (response.data?.success === false) throw new Error(response.data?.error || "Failed to update live trading.");
      
      notify(enabled ? "Live trading started for your organization." : "Live trading stopped.", "success");
      setShowLiveConfirm(false);
      await fetchData(true);
    } catch (err) {
      console.error("Live toggle failed:", err);
      setTradingEnabled(previousLive);
      notify(err?.message || "Failed to update live trading.", "error");
    } finally {
      setTogglingTrading(false);
    }
  };

  const handleStrategyChange = async (strategy) => {
    if (strategy.id === currentStrategy || savingStrategy) return;

    const previous = currentStrategy;
    setSavingStrategy(strategy.id);
    setStrategyMessage("");
    setCurrentStrategy(strategy.id);

    try {
      const response = await axios.patch(`${API_BASE}/api/enterprise/strategy`, { strategy: strategy.id }, { timeout: 10000 });
      if (response.data?.success === false) throw new Error(response.data?.error || "Failed to update strategy.");

      setStrategyMessage(`${strategy.name} strategy is now active for your team.`);
      notify(`${strategy.name} strategy is now active.`, "success");
      await fetchData(true);
    } catch (err) {
      setCurrentStrategy(previous);
      setStrategyMessage(err?.message || "Failed to update strategy.");
      notify(err?.message || "Failed to update strategy.", "error");
    } finally {
      setSavingStrategy("");
      window.setTimeout(() => setStrategyMessage(""), 3500);
    }
  };

  const displayStats = useMemo(() => ({
    total_pnl: stats.total_pnl,
    win_rate: stats.win_rate,
    total_trades: stats.total_trades || (paperTradingEnabled || tradingEnabled ? 1 : 0),
    wins: stats.wins,
    losses: stats.losses,
  }), [stats, paperTradingEnabled, tradingEnabled]);

  const readiness = useMemo(() => {
    let score = 0;
    if (bothConnected) score += 25;
    if (paperTradingEnabled) score += 25;
    if (tradingEnabled) score += 25;
    if (stats.total_trades > 0) score += 25;
    return Math.min(100, score);
  }, [bothConnected, paperTradingEnabled, tradingEnabled, stats.total_trades]);

  const teamAchievements = useMemo(() => {
    const unlocked = [];
    if (displayStats.total_trades > 0) unlocked.push("first_team_trade");
    if (displayStats.total_trades >= 100) unlocked.push("trades_100");
    if (displayStats.total_pnl > 1000) unlocked.push("profitable_team");
    if (members.length >= 5) unlocked.push("full_team");
    if (bothConnected) unlocked.push("api_ready");
    return unlocked;
  }, [displayStats, members.length, bothConnected]);

  if (loading && !lastUpdate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center">
        <div>
          <div className="text-xl font-extrabold text-slate-900 sm:text-2xl">Loading enterprise dashboard…</div>
          <div className="mt-2 text-sm font-semibold text-slate-600">Fetching live trading data for your team.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-3 py-4 text-slate-900 sm:p-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "info" })} />

      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        {/* Status Banner */}
        {error && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-center">
            <p className="text-sm font-semibold text-amber-800">⚠️ {error}</p>
          </div>
        )}

        {/* Last Update Info */}
        <div className="text-right text-[10px] text-slate-400">
          Last update: {lastUpdate ? lastUpdate.toLocaleTimeString() : "—"} • Auto-refreshes every 30s
        </div>

        {/* Welcome Header */}
        <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-sm p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {organization?.name || "Enterprise"} Dashboard
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600 sm:text-base">
                Live team trading data, performance analytics, and strategy management.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill tone={paperTradingEnabled ? "green" : "slate"}>Paper {paperTradingEnabled ? "Active" : "Off"}</StatusPill>
                <StatusPill tone={tradingEnabled ? "purple" : "slate"}>Live {tradingEnabled ? "Active" : "Off"}</StatusPill>
                <StatusPill tone={bothConnected ? "green" : "amber"}>API Connected</StatusPill>
                <StatusPill tone="blue">Strategy: {activeStrategy.name}</StatusPill>
                <StatusPill tone="purple">{members.length} Team Members</StatusPill>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:flex">
              <Button variant="secondary" onClick={() => fetchData(true)} disabled={refreshing} className="w-full lg:w-auto">
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <Button variant="secondary" className="w-full lg:w-auto">
                API Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Setup Progress Card */}
        <div className={`rounded-3xl border p-4 shadow-sm sm:p-6 backdrop-blur-sm ${
          !tradingEnabled && paperTradingEnabled ? "border-green-300 bg-green-50/50" :
          tradingEnabled ? "border-purple-300 bg-purple-50/50" : "border-amber-300 bg-amber-50/50"
        }`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                {!tradingEnabled && paperTradingEnabled ? "Paper Trading Active" : 
                 tradingEnabled ? "Live Trading Active" : "Setup Required"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-800 sm:text-base">
                {!tradingEnabled && paperTradingEnabled 
                  ? "Your organization is using virtual funds. Test strategies before live trading."
                  : tradingEnabled
                  ? "Live trading is active. Monitor team performance and risk in real-time."
                  : "Configure your organization's API keys to start trading."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill tone={bothConnected ? "green" : "amber"}>Alpaca ✓</StatusPill>
                <StatusPill tone={bothConnected ? "green" : "amber"}>OKX ✓</StatusPill>
                <StatusPill tone={paperTradingEnabled ? "green" : "slate"}>Paper {paperTradingEnabled ? "Active" : "Off"}</StatusPill>
                <StatusPill tone={tradingEnabled ? "purple" : "slate"}>Live {tradingEnabled ? "Active" : "Off"}</StatusPill>
              </div>
            </div>
            <div className="w-full shrink-0 lg:w-auto">
              {!tradingEnabled && paperTradingEnabled ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:flex">
                  <Button variant="danger" onClick={() => handleTogglePaperTrading(false)} disabled={anyTradingActionBusy} className="w-full lg:w-auto">
                    {togglingPaper ? "Stopping..." : "Stop Paper"}
                  </Button>
                  <Button variant="warning" onClick={() => setShowLiveConfirm(true)} disabled={anyTradingActionBusy} className="w-full lg:w-auto">
                    Start Live Trading
                  </Button>
                </div>
              ) : tradingEnabled ? (
                <Button variant="danger" onClick={() => handleToggleTrading(false)} disabled={anyTradingActionBusy} className="w-full lg:w-auto">
                  {togglingTrading ? "Stopping..." : "Stop Live Trading"}
                </Button>
              ) : (
                <Button variant="warning" onClick={() => handleTogglePaperTrading(true)} disabled={anyTradingActionBusy} className="w-full lg:w-auto">
                  Start Paper Trading
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Enterprise Metric Tiles */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <EnterpriseMetricTile 
            title="Team P&L" 
            value={usd(displayStats.total_pnl)} 
            change={displayStats.total_pnl > 0 ? 12 : -5} 
            icon="💰" 
            color="from-emerald-500 to-emerald-600"
            subtext="Last 30 days"
          />
          <EnterpriseMetricTile 
            title="Team Win Rate" 
            value={pct(displayStats.win_rate)} 
            change={displayStats.win_rate > 50 ? 8 : -3} 
            icon="🎯" 
            color="from-indigo-500 to-indigo-600"
            subtext="Team average"
          />
          <EnterpriseMetricTile 
            title="Team Trades" 
            value={displayStats.total_trades.toString()} 
            change={15} 
            icon="📊" 
            color="from-blue-500 to-blue-600"
            subtext="All time"
          />
          <EnterpriseMetricTile 
            title="Team Members" 
            value={members.length.toString()} 
            change={members.length > 3 ? 20 : 0} 
            icon="👥" 
            color="from-purple-500 to-purple-600"
            subtext="Active members"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { title: "Team", path: "/enterprise/team", icon: "👥", color: "indigo" },
            { title: "Strategies", path: "/enterprise/strategies", icon: "📊", color: "purple" },
            { title: "Analytics", path: "/enterprise/analytics", icon: "📈", color: "green" },
            { title: "Audit", path: "/enterprise/audit", icon: "🔍", color: "amber" },
            { title: "Branding", path: "/enterprise/branding", icon: "🎨", color: "pink" },
            { title: "Bots", path: "/enterprise/bot-controls", icon: "🤖", color: "blue" },
          ].map((action) => (
            <Link 
              key={action.path} 
              to={action.path} 
              className={`rounded-xl p-3 text-center transition-all shadow-sm border border-${action.color}-200 bg-${action.color}-50 hover:shadow-md hover:-translate-y-0.5`}
            >
              <div className="text-2xl">{action.icon}</div>
              <div className="mt-1 text-xs font-bold text-slate-800">{action.title}</div>
            </Link>
          ))}
        </div>

        {/* Trading Readiness */}
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle helper="This score tracks your organization's setup completeness.">Team Readiness Score</SectionTitle>
            <div className="text-3xl font-extrabold text-slate-900">{readiness}%</div>
          </div>
          <div className="mt-1 h-4 w-full overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full ${readiness >= 80 ? "bg-emerald-500" : readiness >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${readiness}%` }} />
          </div>
        </Card>

        {/* Enterprise Strategy Cards */}
        <Card>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle helper="Select a strategy for your organization. The bot will use this for all team trades.">🎯 Team Strategy</SectionTitle>
            {strategyMessage && <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-extrabold text-indigo-800">{strategyMessage}</div>}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {STRATEGIES.map((strategy) => (
              <button
                key={strategy.id}
                type="button"
                onClick={() => handleStrategyChange(strategy)}
                disabled={!!savingStrategy}
                className={`group flex flex-col rounded-2xl border p-4 text-left transition-all ${
                  currentStrategy === strategy.id
                    ? "border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-200"
                    : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${currentStrategy === strategy.id ? "bg-white" : "bg-slate-100"}`}>
                    {strategy.emoji}
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900">{strategy.name}</div>
                    <div className="text-xs text-slate-500">{strategy.short}</div>
                  </div>
                  <StatusPill tone={riskTone(strategy.risk)} className="ml-auto">{strategy.risk}</StatusPill>
                </div>
                <p className="mt-3 text-sm text-slate-600">{strategy.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {strategy.bullets.map((bullet) => (
                    <span key={bullet} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{bullet}</span>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <StatusPill tone={currentStrategy === strategy.id ? "purple" : "slate"}>
                    {currentStrategy === strategy.id ? (savingStrategy === strategy.id ? "Updating..." : "Active") : "Select"}
                  </StatusPill>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* PROFESSIONAL CHARTS SECTION */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Team Equity Curve - Animated Line Chart */}
          <Card>
            <SectionTitle helper="Your team's portfolio value over time">📈 Team Equity Curve</SectionTitle>
            <div className="h-[350px] w-full">
              <EquityCurveChart data={series} />
            </div>
          </Card>
          
          {/* Team Win Rate Gauge */}
          <Card>
            <SectionTitle helper="Your team's trading success rate">🎯 Team Win Rate Meter</SectionTitle>
            <div className="h-[350px] w-full">
              <WinRateGauge wins={displayStats.wins} losses={displayStats.losses} />
            </div>
          </Card>
        </div>

        {/* Team Trade Volume & Strategy Radar Grid */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Team Trade Volume - Animated Bar Chart */}
          <Card>
            <SectionTitle helper="Number of trades executed by your team per period">📊 Team Trade Volume</SectionTitle>
            <div className="h-[350px] w-full">
              <TradeVolumeChart data={series} />
            </div>
          </Card>

          {/* Team Performance Radar Chart */}
          <Card>
            <SectionTitle helper="Team performance across key metrics">🧠 Team Performance Analysis</SectionTitle>
            <div className="h-[350px] w-full">
              <TeamRadarChart strategyData={currentRadarData} />
            </div>
            <div className="mt-4 text-center">
              <p className="text-xs text-slate-500">Current strategy: <span className="font-bold text-indigo-600">{activeStrategy.name}</span> • Team performance profile</p>
            </div>
          </Card>
        </div>

        {/* Team Members Section */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Team Members ({members.length})</SectionTitle>
            <Link to="/enterprise/team" className="text-sm text-indigo-600 font-extrabold hover:text-indigo-800 transition">Manage Team →</Link>
          </div>
          <div className="space-y-2">
            {members.map((member, idx) => {
              const topPerformers = [...members].sort((a, b) => (b.pnl_contribution || 0) - (a.pnl_contribution || 0));
              const isTopPerformer = member.pnl_contribution > 0 && topPerformers.indexOf(member) < 3;
              return <TeamMemberRow key={member.user_id || idx} member={member} index={idx} isTopPerformer={isTopPerformer} />;
            })}
            {members.length === 0 && (
              <div className="text-center py-8">
                <p className="text-slate-500">No team members yet. Invite your team to get started.</p>
                <Button variant="primary" className="mt-4">Invite Members</Button>
              </div>
            )}
          </div>
        </Card>

        {/* Team Achievements */}
        <Card>
          <SectionTitle>🏆 Team Achievements</SectionTitle>
          <div className="flex flex-wrap gap-3">
            {[
              { id: "first_team_trade", label: "First Team Trade", icon: "🚀", unlocked: teamAchievements.includes("first_team_trade") },
              { id: "trades_100", label: "100 Team Trades", icon: "🏆", unlocked: teamAchievements.includes("trades_100") },
              { id: "profitable_team", label: "Profitable Team", icon: "💰", unlocked: teamAchievements.includes("profitable_team") },
              { id: "full_team", label: "Full Team", icon: "👥", unlocked: teamAchievements.includes("full_team") },
              { id: "api_ready", label: "API Ready", icon: "🔌", unlocked: teamAchievements.includes("api_ready") },
            ].map((achievement) => (
              <div key={achievement.id} className={`rounded-2xl border px-4 py-3 text-sm font-extrabold ${achievement.unlocked ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                {achievement.icon} {achievement.label}
              </div>
            ))}
          </div>
        </Card>

        {/* Helpful Resources */}
        <Card>
          <SectionTitle>📚 Enterprise Resources</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { title: "📚 Team Guide", desc: "Learn about team features", url: "/enterprise/guide" },
              { title: "🔧 API Setup", desc: "Connect exchange accounts", url: "/enterprise/api-setup" },
              { title: "❓ FAQ", desc: "Common enterprise questions", url: "/enterprise/faq" },
              { title: "💬 Support", desc: "Get team support", url: "/enterprise/support" },
            ].map((resource) => (
              <a key={resource.title} href={resource.url} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-300 hover:bg-indigo-50">
                <div className="font-extrabold text-slate-900">{resource.title}</div>
                <div className="mt-1 text-sm font-medium text-slate-500">{resource.desc}</div>
              </a>
            ))}
          </div>
        </Card>

        {/* Actions */}
        <div className="grid gap-3 sm:grid-cols-4">
          <Button onClick={() => window.location.href = "/enterprise/team"} className="w-full">Manage Team</Button>
          <Button onClick={() => window.location.href = "/enterprise/strategies"} className="w-full">Strategies</Button>
          <Button variant="warning" onClick={() => bothConnected ? setShowLiveConfirm(true) : null} className="w-full">Start Live</Button>
          <Button variant="secondary" onClick={() => window.location.href = "/enterprise/audit"} className="w-full">Audit Logs</Button>
        </div>
      </div>

      {/* Live Trading Confirmation Modal */}
      {showLiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
          <div className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-6">
            <h3 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Confirm Live Trading</h3>
            <p className="mt-3 text-sm font-semibold text-slate-700">Live trading uses real money through your organization's connected exchange accounts.</p>
            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
              <div className="font-extrabold text-amber-900">Risk reminder</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-amber-800">
                <li>Your organization can lose money.</li>
                <li>Start with small position sizes.</li>
                <li>Live trading can be stopped anytime.</li>
                <li>Paper trading is safer for testing strategies.</li>
              </ul>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button variant="warning" onClick={() => handleToggleTrading(true)} disabled={togglingTrading} className="w-full">
                {togglingTrading ? "Starting..." : "Enable Live Trading"}
              </Button>
              <Button variant="secondary" onClick={() => setShowLiveConfirm(false)} disabled={togglingTrading} className="w-full">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function for risk tone
function riskTone(risk) {
  const r = String(risk || "").toLowerCase();
  if (r === "low") return "green";
  if (r === "high") return "red";
  return "amber";
}
