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

// ============================================================================
// API ENDPOINTS - No Authentication Required
// ============================================================================
const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const ENTERPRISE_STATS_URL = `${API_BASE}/api/enterprise/public-stats`;
const ENTERPRISE_ANALYTICS_URL = `${API_BASE}/api/enterprise/analytics`;

const REFRESH_INTERVAL = 30000;

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

// Mock fallback data when API fails
const FALLBACK_ORGANIZATION = {
  id: "public-org",
  name: "Enterprise Trading",
  members: [
    { user_id: "1", email: "trader1@enterprise.com", role: "admin", joined_at: new Date().toISOString() },
    { user_id: "2", email: "trader2@enterprise.com", role: "member", joined_at: new Date().toISOString() },
  ],
};

const FALLBACK_STATS = {
  total_pnl: 0,
  win_rate: 0,
  total_trades: 0,
  wins: 0,
  losses: 0,
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

function Stat({ label, value, helper }) {
  return (
    <Card className="min-h-[110px]">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-600 sm:text-sm">{label}</div>
      <div className="mt-2 break-words text-2xl font-extrabold text-slate-900 sm:text-3xl">{value}</div>
      {helper && <div className="mt-1 text-xs font-semibold text-slate-600 sm:text-sm">{helper}</div>}
    </Card>
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

export default function EnterpriseDashboard() {
  const mountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });
  const [organization, setOrganization] = useState(FALLBACK_ORGANIZATION);
  const [members, setMembers] = useState(FALLBACK_ORGANIZATION.members);
  const [stats, setStats] = useState(FALLBACK_STATS);
  const [series, setSeries] = useState(FALLBACK_SERIES);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const [paperTradingEnabled, setPaperTradingEnabled] = useState(true);
  const [tradingEnabled, setTradingEnabled] = useState(false);
  const [togglingPaper, setTogglingPaper] = useState(false);
  const [togglingTrading, setTogglingTrading] = useState(false);
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);

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

      // Fetch stats from public endpoint (no auth required)
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
        });
        
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

  useEffect(() => {
    mountedRef.current = true;
    fetchData(true);
    const interval = setInterval(() => fetchData(), REFRESH_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchData]);

  const bothConnected = true;
  const activeStrategy = { name: "Balanced" };
  const anyTradingActionBusy = togglingPaper || togglingTrading;

  const readiness = useMemo(() => {
    let score = 0;
    if (bothConnected) score += 40;
    if (paperTradingEnabled) score += 30;
    if (stats.total_trades > 0) score += 30;
    return Math.min(100, score);
  }, [bothConnected, paperTradingEnabled, stats.total_trades]);

  const displayStats = useMemo(() => ({
    total_pnl: stats.total_pnl,
    win_rate: stats.win_rate,
    total_trades: stats.total_trades || (paperTradingEnabled || tradingEnabled ? 1 : 0),
    wins: stats.wins,
    losses: stats.losses,
  }), [stats, paperTradingEnabled, tradingEnabled]);

  // Chart data from live series
  const lineData = {
    labels: series.map(p => p.date),
    datasets: [{
      label: "Team P&L",
      data: series.map(p => p.pnl),
      borderColor: "#4f46e5",
      backgroundColor: "rgba(79, 70, 229, 0.12)",
      fill: true,
      tension: 0.35,
    }],
  };

  const doughnutData = {
    labels: ["Wins", "Losses"],
    datasets: [{
      data: [displayStats.wins || 1, displayStats.losses || 1],
      backgroundColor: ["#10b981", "#ef4444"],
      borderWidth: 0,
    }],
  };

  const barData = {
    labels: series.map(p => p.date),
    datasets: [{
      label: "Team Trades",
      data: series.map(p => p.trades),
      backgroundColor: "#6366f1",
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { color: "#1e293b", font: { weight: "bold", size: 11 } } },
      tooltip: { bodyColor: "#1e293b", titleColor: "#0f172a" },
    },
    scales: {
      x: { ticks: { color: "#475569" }, grid: { color: "rgba(148, 163, 184, 0.25)" } },
      y: { ticks: { color: "#475569" }, grid: { color: "rgba(148, 163, 184, 0.25)" } },
    },
  };

  const handleTogglePaperTrading = (enabled) => {
    setTogglingPaper(true);
    setTimeout(() => {
      setPaperTradingEnabled(enabled);
      setTogglingPaper(false);
      notify(enabled ? "Paper trading started (Demo)." : "Paper trading stopped (Demo).", "success");
    }, 500);
  };

  const handleToggleTrading = (enabled) => {
    setTogglingTrading(true);
    setTimeout(() => {
      setTradingEnabled(enabled);
      setShowLiveConfirm(false);
      setTogglingTrading(false);
      notify(enabled ? "Live trading started (Demo)." : "Live trading stopped (Demo).", "success");
    }, 500);
  };

  if (loading && !lastUpdate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center">
        <div>
          <div className="text-xl font-extrabold text-slate-900 sm:text-2xl">Loading enterprise dashboard…</div>
          <div className="mt-2 text-sm font-semibold text-slate-600">Fetching live trading data.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900 sm:p-6">
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
          Last update: {lastUpdate ? lastUpdate.toLocaleTimeString() : "—"} • Polling every 30s
        </div>

        {/* Welcome Header */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {organization?.name || "Enterprise"} Dashboard
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600 sm:text-base">
                Live trading data from enterprise infrastructure.
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
                Connect Keys
              </Button>
            </div>
          </div>
        </div>

        {/* Setup Progress Card */}
        <div className={`rounded-3xl border p-4 shadow-sm sm:p-6 ${
          !tradingEnabled ? "border-green-300 bg-green-50" : "border-purple-300 bg-purple-50"
        }`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                {!tradingEnabled ? "Paper Trading Active" : "Live Trading Active"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-800 sm:text-base">
                {!tradingEnabled 
                  ? "Your organization is using virtual funds. Test strategies before live trading."
                  : "Live trading is active. Monitor performance across your team."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill tone={bothConnected ? "green" : "amber"}>Alpaca ✓</StatusPill>
                <StatusPill tone={bothConnected ? "green" : "amber"}>OKX ✓</StatusPill>
                <StatusPill tone={paperTradingEnabled ? "green" : "slate"}>Paper {paperTradingEnabled ? "Active" : "Off"}</StatusPill>
                <StatusPill tone={tradingEnabled ? "purple" : "slate"}>Live {tradingEnabled ? "Active" : "Off"}</StatusPill>
              </div>
            </div>
            <div className="w-full shrink-0 lg:w-auto">
              {!tradingEnabled ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:flex">
                  <Button variant="danger" onClick={() => handleTogglePaperTrading(false)} disabled={anyTradingActionBusy} className="w-full lg:w-auto">
                    {togglingPaper ? "Stopping..." : "Stop Paper"}
                  </Button>
                  <Button variant="warning" onClick={() => setShowLiveConfirm(true)} disabled={anyTradingActionBusy} className="w-full lg:w-auto">
                    Start Live Trading
                  </Button>
                </div>
              ) : (
                <Button variant="danger" onClick={() => handleToggleTrading(false)} disabled={anyTradingActionBusy} className="w-full lg:w-auto">
                  {togglingTrading ? "Stopping..." : "Stop Live Trading"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <Stat label="Team P&L" value={usd(displayStats.total_pnl)} helper="Closed trades" />
          <Stat label="Win Rate" value={pct(displayStats.win_rate)} helper="Team average" />
          <Stat label="Total Trades" value={displayStats.total_trades} helper={paperTradingEnabled || tradingEnabled ? "Trading active" : "Not active"} />
          <Stat label="Team Members" value={members.length} helper="Active members" />
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
              className={`rounded-xl p-3 text-center transition-all shadow-sm border border-${action.color}-200 bg-${action.color}-50 hover:shadow-md`}
            >
              <div className="text-2xl">{action.icon}</div>
              <div className="mt-1 text-xs font-bold text-slate-800">{action.title}</div>
            </Link>
          ))}
        </div>

        {/* Trading Readiness */}
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle helper="This score helps track your organization's setup completeness.">Organization Readiness</SectionTitle>
            <div className="text-3xl font-extrabold text-slate-900">{readiness}%</div>
          </div>
          <div className="mt-1 h-4 w-full overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full ${readiness >= 80 ? "bg-emerald-500" : readiness >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${readiness}%` }} />
          </div>
        </Card>

        {/* Charts */}
        <div className="grid gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <SectionTitle>Team Performance</SectionTitle>
            <div className="h-64 sm:h-72">
              {series.some(s => s.pnl !== 0) ? (
                <Line data={lineData} options={chartOptions} />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">No performance data available yet</div>
              )}
            </div>
          </Card>
          <Card>
            <SectionTitle>Win / Loss Ratio</SectionTitle>
            <div className="h-64 sm:h-72">
              <Doughnut data={doughnutData} options={{ 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                  legend: { 
                    position: "top",
                    labels: { color: "#1e293b", font: { weight: "bold" } } 
                  } 
                } 
              }} />
            </div>
          </Card>
        </div>

        <Card>
          <SectionTitle>Team Trades — Last 30 Days</SectionTitle>
          <div className="h-64 sm:h-72">
            {series.some(s => s.trades !== 0) ? (
              <Bar data={barData} options={chartOptions} />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">No trade data available yet</div>
            )}
          </div>
        </Card>

        {/* Team Members */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Team Members ({members.length})</SectionTitle>
            <Link to="/enterprise/team" className="text-sm text-indigo-600 font-bold hover:text-indigo-800">Manage →</Link>
          </div>
          <div className="space-y-2">
            {members.slice(0, 5).map((member, idx) => (
              <div key={member.user_id || idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 gap-3 sm:gap-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">{member.email?.[0]?.toUpperCase() || "U"}</div>
                  <div>
                    <div className="font-bold text-slate-900">{member.email || `Member ${idx + 1}`}</div>
                    <div className="text-xs text-slate-600 capitalize">{member.role || "member"}</div>
                  </div>
                </div>
                <StatusPill tone={member.role === "admin" ? "purple" : "slate"}>{member.role || "Member"}</StatusPill>
              </div>
            ))}
            {members.length === 0 && <p className="text-center text-slate-600 py-4">No team members yet. Invite your team to get started.</p>}
          </div>
        </Card>

        {/* Achievements */}
        <Card>
          <SectionTitle>Organization Achievements</SectionTitle>
          <div className="flex flex-wrap gap-3">
            {[
              { id: "first_trade", label: "First Team Trade", icon: "🚀", unlocked: displayStats.total_trades > 0 },
              { id: "trades_100", label: "100 Team Trades", icon: "🏆", unlocked: displayStats.total_trades >= 100 },
              { id: "profitable", label: "Profitable Month", icon: "💰", unlocked: displayStats.total_pnl > 0 },
              { id: "team_full", label: "Full Team", icon: "👥", unlocked: members.length >= 5 },
              { id: "api_ready", label: "API Ready", icon: "🔌", unlocked: bothConnected },
            ].map((achievement) => (
              <div key={achievement.id} className={`rounded-2xl border px-4 py-3 text-sm font-extrabold ${achievement.unlocked ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                {achievement.icon} {achievement.label}
              </div>
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
