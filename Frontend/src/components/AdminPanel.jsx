// src/components/AdminPanel.jsx
import React, { useEffect, useMemo, useState, useCallback, Suspense, lazy } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import BotAPI from "../utils/BotAPI";

/* -------------------- Error Boundary -------------------- */
class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[AdminPanel] Tab "${this.props.tabName}" crashed:`, error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <div className="text-4xl mb-3">💥</div>
          <h3 className="text-lg font-bold text-red-300 mb-2">
            "{this.props.tabName}" failed to load
          </h3>
          <p className="text-sm text-white/50 mb-4 max-w-md mx-auto">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <details className="text-left max-w-lg mx-auto mb-4">
            <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60">
              Technical Details
            </summary>
            <pre className="mt-2 p-3 bg-black/40 rounded-lg text-[10px] text-red-300/70 overflow-auto max-h-48">
              {this.state.error?.stack || "No stack trace available"}
              {this.state.errorInfo?.componentStack || ""}
            </pre>
          </details>
          <button
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-colors"
          >
            🔄 Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* -------------------- Loading Fallback -------------------- */
const TabLoader = ({ name }) => (
  <div className="p-8 text-center">
    <div className="animate-spin h-8 w-8 border-3 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
    <p className="text-sm text-white/50">Loading {name}…</p>
  </div>
);

/* -------------------- Lazy-loaded admin modules -------------------- */
const DashboardOverview = lazy(() => import("../admin/DashboardOverview.jsx"));
const TokenManagement = lazy(() => import("../admin/TokenManagement.jsx"));
const BuyBackDashboard = lazy(() => import("../admin/BuyBackDashboard.jsx"));
const FeeDistributor = lazy(() => import("../admin/FeeDistributor.jsx"));
const NFTManagement = lazy(() => import("../admin/NFTManagement.jsx"));
const ReferralAnalytics = lazy(() => import("../admin/ReferralAnalytics.jsx"));
const SocialManager = lazy(() => import("../admin/SocialManager.jsx"));
const AccessControl = lazy(() => import("../admin/AccessControl.jsx"));
const UserManagement = lazy(() => import("../admin/UserManagement.jsx"));
const PromoManagement = lazy(() => import("../admin/PromoManagement.jsx"));
const WithdrawalManagement = lazy(() => import("../admin/WithdrawalManagement.jsx"));
const SupportTickets = lazy(() => import("../admin/SupportTickets.jsx"));
const Announcements = lazy(() => import("../admin/Announcements.jsx"));
const WaitlistManagement = lazy(() => import("../admin/WaitlistManagement.jsx"));
const SystemHealth = lazy(() => import("../admin/SystemHealth.jsx"));
const AuditLogs = lazy(() => import("../admin/AuditLogs.jsx"));

/* -------------------- Env Helpers -------------------- */
const IS_BROWSER = typeof window !== "undefined";
const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

const E = (k, fb = "") => {
  if (typeof process !== "undefined" && process.env && process.env[k] !== undefined) {
    return process.env[k] || fb;
  }
  return fb;
};

/* -------------------- API Helper -------------------- */
const adminFetch = async (endpoint, options = {}) => {
  const token = BotAPI.getToken();
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw new Error(data.message || data.error || `Request failed (${response.status})`);
  }
  
  return data;
};

/* -------------------- Tab Definitions -------------------- */
const TABS = [
  { key: "overview", label: "Overview", emoji: "✨", component: DashboardOverview },
  { key: "users", label: "Users", emoji: "👥", component: UserManagement },
  { key: "promos", label: "Promos", emoji: "🎟️", component: PromoManagement },
  { key: "withdrawals", label: "Withdrawals", emoji: "💰", component: WithdrawalManagement },
  { key: "referrals", label: "Referrals", emoji: "🧲", component: ReferralAnalytics },
  { key: "tickets", label: "Support", emoji: "🎫", component: SupportTickets },
  { key: "announcements", label: "Announce", emoji: "📢", component: Announcements },
  { key: "waitlist", label: "Waitlist", emoji: "⏳", component: WaitlistManagement },
  { key: "audit", label: "Audit Logs", emoji: "📋", component: AuditLogs },
  { key: "health", label: "System", emoji: "🏥", component: SystemHealth },
  { key: "token", label: "Token Mgmt", emoji: "🪙", component: TokenManagement },
  { key: "buyback", label: "Buyback", emoji: "♻️", component: BuyBackDashboard },
  { key: "fees", label: "Fee Distributor", emoji: "💸", component: FeeDistributor },
  { key: "treasury", label: "Treasury", emoji: "🏦", component: TreasurySection, sync: true },
  { key: "cex", label: "CEX Funding", emoji: "🏧", component: CexSection, sync: true },
  { key: "stocks", label: "Stocks", emoji: "📈", component: StocksSection, sync: true },
  { key: "nfts", label: "NFTs", emoji: "🧬", component: NFTManagement },
  { key: "social", label: "Social", emoji: "📣", component: SocialManager },
  { key: "access", label: "Access Control", emoji: "🔐", component: AccessControl },
];

/* ==================================================================
   MAIN ADMIN PANEL
================================================================== */
export default function AdminPanel({ forceOwner = false }) {
  const { account } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState("overview");
  const [busyAction, setBusyAction] = useState("");
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);

  const isDevelopment = process.env.NODE_ENV === "development" || window.location.hostname === "localhost";
  const BYPASS = isDevelopment && (E("REACT_APP_BYPASS_OWNER") === "1");
  const TEST_BYPASS = location.pathname.startsWith("/test/admin");

  /* -------------------- Toast helper -------------------- */
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  /* -------------------- Admin check -------------------- */
  useEffect(() => {
    let mounted = true;

    const checkAdminStatus = async () => {
      try {
        if (forceOwner || BYPASS || TEST_BYPASS) {
          if (mounted) setIsAdmin(true);
          setChecking(false);
          return;
        }

        // API admin check
        try {
          const adminCheck = await BotAPI.adminCheck();
          if (adminCheck?.is_admin) {
            if (mounted) setIsAdmin(true);
            setChecking(false);
            return;
          }
        } catch (apiErr) {
          console.warn("[AdminPanel] API admin check failed:", apiErr);
        }

        // Wallet-based check if API fails
        if (!account) {
          if (mounted) setError("Connect your wallet to continue.");
          setChecking(false);
          return;
        }

        // Contract owner check via API (your backend handles this)
        if (mounted) setIsAdmin(false);
        setChecking(false);
      } catch (e) {
        if (mounted) {
          setError(e?.message || "Admin check failed.");
          setChecking(false);
        }
      }
    };

    checkAdminStatus();
  }, [account, forceOwner, BYPASS, TEST_BYPASS]);

  /* -------------------- Fetch dashboard stats -------------------- */
  useEffect(() => {
    const allowAccess = forceOwner || BYPASS || TEST_BYPASS || isAdmin;
    if (!allowAccess) return;

    let mounted = true;

    const fetchStats = async () => {
      try {
        const [users, withdrawals, tickets, promos, waitlist] = await Promise.allSettled([
          BotAPI.adminGetUsers({ limit: 1 }),
          adminFetch("/api/admin/withdrawals?status=pending"),
          adminFetch("/api/admin/support/tickets?status=open"),
          BotAPI.adminListPromos(),
          adminFetch("/api/admin/waitlist"),
        ]);

        if (!mounted) return;

        setStats({
          totalUsers: users.status === "fulfilled" ? (users.value?.users?.length || 0) : 0,
          pendingWithdrawals: withdrawals.status === "fulfilled" ? (withdrawals.value?.withdrawals?.length || 0) : 0,
          openTickets: tickets.status === "fulfilled" ? (tickets.value?.tickets?.length || 0) : 0,
          activePromos: promos.status === "fulfilled" ? (promos.value?.promos?.filter(p => p.active)?.length || 0) : 0,
          waitlistCount: waitlist.status === "fulfilled" ? (waitlist.value?.waitlist?.length || 0) : 0,
        });
      } catch (err) {
        console.error("[AdminPanel] Stats fetch error:", err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isAdmin, forceOwner, BYPASS, TEST_BYPASS]);

  /* -------------------- Action handlers -------------------- */
  const handleProcessFees = useCallback(async (dryRun = true) => {
    try {
      setBusyAction("fees");
      const data = await adminFetch("/api/admin/process-pending-fees", {
        method: "POST",
        body: JSON.stringify({ dry_run: dryRun, limit: 100 }),
      });
      
      if (dryRun) {
        showToast(`📊 Dry run: ${data.processed} fees → $${data.total_amount.toFixed(2)}`);
      } else {
        showToast(`✅ Processed ${data.processed} fees → $${data.total_amount.toFixed(2)}`);
      }
    } catch (err) {
      showToast(err?.message || "Fee processing failed", "error");
    } finally {
      setBusyAction("");
    }
  }, [showToast]);

  const handleAction = useCallback(async (endpoint, method = "POST", body = {}, actionName = "Action") => {
    try {
      setBusyAction(actionName);
      const data = await adminFetch(endpoint, {
        method,
        body: JSON.stringify(body),
      });
      showToast(`✅ ${actionName} completed successfully`);
      return data;
    } catch (err) {
      showToast(err?.message || `${actionName} failed`, "error");
      throw err;
    } finally {
      setBusyAction("");
    }
  }, [showToast]);

  /* -------------------- Tab renderer -------------------- */
  const renderTab = useCallback((tab) => {
    const commonProps = {
      apiBase: API_BASE,
      account,
      onAction: () => {
        // Refresh stats after actions
        setTimeout(() => window.location.reload(), 1000);
      },
      showToast,
      busyAction,
      handleAction,
    };

    // Add specific props for certain tabs
    const extraProps = {
      buyback: { onProcessFees: handleProcessFees },
      fees: { onProcessFees: handleProcessFees },
    };

    const Component = tab.component;
    const props = { ...commonProps, ...(extraProps[tab.key] || {}) };

    if (tab.sync) {
      return (
        <TabErrorBoundary tabName={tab.label} key={tab.key}>
          <Component {...props} />
        </TabErrorBoundary>
      );
    }

    return (
      <TabErrorBoundary tabName={tab.label} key={tab.key}>
        <Suspense fallback={<TabLoader name={tab.label} />}>
          <Component {...props} />
        </Suspense>
      </TabErrorBoundary>
    );
  }, [account, busyAction, handleAction, handleProcessFees, showToast]);

  /* -------------------- Access control -------------------- */
  const allowAccess = forceOwner || BYPASS || TEST_BYPASS || isAdmin;

  if (checking && !allowAccess) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-950 text-white">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Verifying admin access…</h2>
          <p className="text-sm text-white/40 mt-2">Checking API and contract permissions</p>
        </div>
      </div>
    );
  }

  if (!allowAccess) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-950 text-white px-6">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-extrabold mb-2">403 — Admin Only</h2>
          <p className="text-white/70 mb-6">{error || "This area is restricted to administrators."}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold transition-colors"
            >
              Go Home
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-black" />
      <div
        className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl opacity-25"
        style={{ background: "radial-gradient(60% 60% at 50% 50%, #22d3ee55 0%, transparent 60%)" }}
      />
      <div
        className="pointer-events-none absolute top-20 -right-16 h-96 w-96 rounded-full blur-3xl opacity-20"
        style={{ background: "radial-gradient(60% 60% at 50% 50%, #a78bfa55 0%, transparent 60%)" }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full blur-3xl opacity-15"
        style={{ background: "radial-gradient(60% 60% at 50% 50%, #f472b655 0%, transparent 60%)" }}
      />

      {/* Toast notifications */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border shadow-xl text-sm max-w-sm animate-in slide-in-from-right ${
            toast.type === "error"
              ? "bg-red-600/90 border-red-500/50 text-white"
              : "bg-emerald-600/90 border-emerald-500/50 text-white"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-white/60 hover:text-white flex-shrink-0">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur bg-black/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 via-yellow-300 to-pink-300 bg-clip-text text-transparent">
              IMALI Admin
            </h1>
            {stats && (
              <div className="hidden lg:flex items-center gap-2 text-xs">
                <span className="px-2 py-1 bg-blue-500/20 rounded-full text-blue-300">
                  👥 {stats.totalUsers}
                </span>
                <span className="px-2 py-1 bg-yellow-500/20 rounded-full text-yellow-300">
                  ⏳ {stats.waitlistCount}
                </span>
                {stats.openTickets > 0 && (
                  <span className="px-2 py-1 bg-red-500/20 rounded-full text-red-300">
                    🎫 {stats.openTickets}
                  </span>
                )}
                {stats.pendingWithdrawals > 0 && (
                  <span className="px-2 py-1 bg-orange-500/20 rounded-full text-orange-300">
                    💰 {stats.pendingWithdrawals}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {account && (
              <div className="hidden sm:block text-xs text-white/70 bg-white/5 px-3 py-1 rounded-full">
                {account.slice(0, 6)}…{account.slice(-4)}
              </div>
            )}
            <button
              onClick={() => navigate("/dashboard")}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Tabs */}
        <div className="mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-1.5 min-w-max">
            {TABS.map((tab) => {
              const isActive = active === tab.key;
              let badge = null;
              if (tab.key === "tickets" && stats?.openTickets > 0) {
                badge = stats.openTickets;
              } else if (tab.key === "withdrawals" && stats?.pendingWithdrawals > 0) {
                badge = stats.pendingWithdrawals;
              }

              return (
                <button
                  key={tab.key}
                  onClick={() => setActive(tab.key)}
                  className={`relative px-3 sm:px-4 py-2 rounded-2xl border text-xs sm:text-sm font-medium transition-all whitespace-nowrap
                    ${
                      isActive
                        ? "bg-white/15 border-white/30 shadow-[0_0_24px_-6px_rgba(255,255,255,0.35)]"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                >
                  <span className="mr-1">{tab.emoji}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  {badge != null && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active tab panel */}
        <section className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-4 sm:p-6 shadow-xl min-h-[500px]">
          {renderTab(TABS.find(t => t.key === active))}
        </section>

        {/* Quick actions */}
        <div className="mt-6 flex flex-wrap gap-3 justify-between items-center">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleProcessFees(true)}
              disabled={busyAction === "fees"}
              className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 text-xs sm:text-sm hover:bg-blue-600/30 disabled:opacity-50 transition-colors"
            >
              {busyAction === "fees" ? "Processing..." : "🔍 Dry Run Fees"}
            </button>
            <button
              onClick={() => handleProcessFees(false)}
              disabled={busyAction === "fees"}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 text-xs sm:text-sm hover:bg-emerald-600/30 disabled:opacity-50 transition-colors"
            >
              {busyAction === "fees" ? "Processing..." : "💰 Process Fees"}
            </button>
            <button
              onClick={() => {
                setStats(null);
                window.location.reload();
              }}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs sm:text-sm hover:bg-white/10 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
          <div className="text-[10px] text-white/30">
            API: {API_BASE}
          </div>
        </div>
      </main>
    </div>
  );
}

/* -------------------- Placeholder Sections with API Integration -------------------- */
function TreasurySection({ apiBase, account, showToast, handleAction }) {
  const [data, setData] = useState({ balance: 0, staked: 0, pools: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/api/admin/treasury/stats`, {
        headers: { Authorization: `Bearer ${BotAPI.getToken()}` }
      });
      const result = await response.json();
      if (result.success) {
        setData(result);
      }
    } catch (err) {
      console.error("Failed to fetch treasury stats:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-3 border-emerald-500 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-6">🏦 Treasury Management</h3>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-xs text-white/40">Balance</div>
          <div className="text-2xl font-bold mt-1 text-emerald-400">
            ${data.balance.toLocaleString()}
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-xs text-white/40">Staked</div>
          <div className="text-2xl font-bold mt-1 text-blue-400">
            {data.staked.toLocaleString()} IMALI
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-xs text-white/40">Liquidity Pools</div>
          <div className="text-2xl font-bold mt-1">{data.pools}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-xs text-white/40">Pending</div>
          <div className="text-2xl font-bold mt-1 text-yellow-400">
            ${data.pending.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

function CexSection({ apiBase, showToast, handleAction }) {
  const [balances, setBalances] = useState({ okx: {}, alpaca: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/api/admin/cex/balances`, {
        headers: { Authorization: `Bearer ${BotAPI.getToken()}` }
      });
      const result = await response.json();
      if (result.success) {
        setBalances(result);
      }
    } catch (err) {
      console.error("Failed to fetch CEX balances:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-3 border-emerald-500 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-6">🏧 CEX Funding</h3>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🔷</span>
            <h4 className="font-semibold">OKX</h4>
          </div>
          <div className="space-y-2">
            {Object.entries(balances.okx).map(([asset, amount]) => (
              <div key={asset} className="flex justify-between">
                <span className="text-sm text-white/60">{asset}</span>
                <span className="text-sm font-bold">{amount}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📈</span>
            <h4 className="font-semibold">Alpaca</h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-white/60">Cash</span>
              <span className="text-sm font-bold">${balances.alpaca.cash}</span>
            </div>
            {balances.alpaca.stocks && Object.entries(balances.alpaca.stocks).map(([symbol, shares]) => (
              <div key={symbol} className="flex justify-between">
                <span className="text-sm text-white/60">{symbol}</span>
                <span className="text-sm font-bold">{shares} shares</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <button
        onClick={fetchBalances}
        className="mt-4 px-4 py-2 bg-blue-600/20 text-blue-300 rounded-xl text-sm hover:bg-blue-600/30 transition-colors"
      >
        🔄 Refresh Balances
      </button>
    </div>
  );
}

function StocksSection({ apiBase, showToast, handleAction }) {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/api/admin/stocks/positions`, {
        headers: { Authorization: `Bearer ${BotAPI.getToken()}` }
      });
      const result = await response.json();
      if (result.success) {
        setPositions(result.positions || []);
      }
    } catch (err) {
      console.error("Failed to fetch stock positions:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-3 border-emerald-500 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-6">📈 Stocks</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-white/40">
              <th className="pb-2">Symbol</th>
              <th className="pb-2">Shares</th>
              <th className="pb-2">Avg Price</th>
              <th className="pb-2">Current</th>
              <th className="pb-2">Value</th>
              <th className="pb-2">P&L</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {positions.map((pos, i) => {
              const value = pos.shares * pos.current_price;
              const cost = pos.shares * pos.avg_price;
              const pnl = value - cost;
              const pnlPercent = (pnl / cost) * 100;
              
              return (
                <tr key={i} className="border-t border-white/10">
                  <td className="py-2 font-bold">{pos.symbol}</td>
                  <td className="py-2">{pos.shares}</td>
                  <td className="py-2">${pos.avg_price.toFixed(2)}</td>
                  <td className="py-2">${pos.current_price.toFixed(2)}</td>
                  <td className="py-2">${value.toFixed(2)}</td>
                  <td className={`py-2 ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${pnl.toFixed(2)} ({pnlPercent.toFixed(1)}%)
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
