// src/pages/AdminPanel.jsx
import React, { useEffect, useState, useCallback, Suspense, lazy, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

/* -------------------- Error Boundary -------------------- */
class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[AdminPanel] Tab "${this.props.tabName}" crashed:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <div className="mb-4 text-6xl animate-pulse">💥</div>
          <h3 className="mb-3 text-xl font-bold text-red-300">
            {this.props.tabName} failed to load
          </h3>
          <p className="mx-auto mb-6 max-w-md text-sm text-white/70">
            {this.state.error?.message || "An unexpected error occurred while loading this section."}
          </p>
          <button
            onClick={this.handleReset}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium transition hover:bg-indigo-500"
          >
            Try Again ({this.state.retryCount})
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* -------------------- Loading Fallback -------------------- */
const TabLoader = ({ name }) => (
  <div className="flex min-h-[300px] flex-col items-center justify-center py-12">
    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
    <p className="text-sm text-white/60">Loading {name}...</p>
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
const TreasuryManagement = lazy(() => import("../admin/TreasuryManagement.jsx"));
const CexManagement = lazy(() => import("../admin/CexManagement.jsx"));
const StocksManagement = lazy(() => import("../admin/StocksManagement.jsx"));
const MarketingAutomationTab = lazy(() => import("../admin/MarketingAutomation.jsx"));
const ReportsTab = lazy(() => import("../admin/ReportsTab.jsx"));

/* -------------------- Config -------------------- */
const API_BASE = (process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com").replace(/\/+$/, "");

/* -------------------- API Helper -------------------- */
const getAuthToken = () => BotAPI.getToken();

const adminFetch = async (endpoint, options = {}, retries = 3) => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const safeEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${API_BASE}${safeEndpoint}`, {
        method: options.method || "GET",
        ...options,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          ...(options.headers || {}),
        },
      });

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After')) || Math.pow(2, attempt) * 5;
        console.log(`Rate limited. Retry after ${retryAfter}s (attempt ${attempt + 1}/${retries})`);
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
        throw new Error(`Rate limited. Please wait ${retryAfter} seconds.`);
      }

      if (response.status === 401) {
        throw new Error("Authentication failed. Please log in again.");
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || data.error || `Request failed (${response.status})`);
      }

      return data;
    } catch (error) {
      lastError = error;
      if (attempt < retries && !error.message.includes('429') && !error.message.includes('401')) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

/* -------------------- Tab Sections with Correct Endpoints -------------------- */
const TAB_SECTIONS = [
  {
    id: "dashboard",
    name: "Dashboard",
    emoji: "📊",
    description: "See the health and activity of your platform.",
    tabs: [
      {
        key: "overview",
        label: "Overview",
        emoji: "✨",
        component: DashboardOverview,
        description: "Main numbers and summary cards.",
        help: "Start here to get a quick snapshot of platform performance. Key metrics include total users, total trades, total PnL, and win rate.",
        actions: [
          { id: "refresh", label: "Refresh Metrics", icon: "🔄", endpoint: "/api/admin/metrics", method: "GET" },
        ],
      },
      {
        key: "health",
        label: "System Health",
        emoji: "🏥",
        component: SystemHealth,
        description: "Check if services are running correctly.",
        help: "Monitor backend services, database connectivity, and API health.",
        actions: [
          { id: "refresh", label: "Check Health", icon: "🔄", endpoint: "/api/health/detailed", method: "GET" },
        ],
      },
    ],
  },
  {
    id: "users",
    name: "Users",
    emoji: "👥",
    description: "Manage accounts and user data.",
    tabs: [
      {
        key: "users",
        label: "All Users",
        emoji: "👥",
        component: UserManagement,
        description: "View and manage user accounts.",
        help: "Search for users by email. View user details, edit tiers, enable/disable trading, and revoke API keys.",
        actions: [
          { id: "refresh", label: "Refresh List", icon: "🔄", endpoint: "/api/admin/users?page=1&limit=50", method: "GET" },
        ],
      },
    ],
  },
  {
    id: "trading",
    name: "Trading",
    emoji: "📈",
    description: "Monitor trading activity.",
    tabs: [
      {
        key: "trades",
        label: "All Trades",
        emoji: "📊",
        component: lazy(() => import("../admin/TradesManagement.jsx")),
        description: "View all platform trades.",
        help: "See all trades across the platform. Filter by status, bot, or user. Export data for analysis.",
        actions: [
          { id: "refresh", label: "Refresh Trades", icon: "🔄", endpoint: "/api/admin/trades?page=1&limit=50", method: "GET" },
        ],
      },
      {
        key: "reports",
        label: "Reports",
        emoji: "📋",
        component: ReportsTab,
        description: "Generate trade and user reports.",
        help: "Generate detailed reports on trading activity. Export as CSV for external analysis.",
        actions: [
          { id: "trade-report", label: "Trade Report", icon: "📊", endpoint: "/api/admin/reports/trades", method: "GET" },
          { id: "user-report", label: "User Report", icon: "👥", endpoint: "/api/admin/reports/users", method: "GET" },
        ],
      },
    ],
  },
  {
    id: "money",
    name: "Money",
    emoji: "💰",
    description: "Handle payments and financial actions.",
    tabs: [
      {
        key: "withdrawals",
        label: "Withdrawals",
        emoji: "💰",
        component: WithdrawalManagement,
        description: "Approve or review withdrawal requests.",
        help: "Review pending withdrawal requests. Verify user balances and approve or reject.",
        actions: [
          { id: "refresh", label: "Refresh", icon: "🔄", endpoint: "/api/admin/withdrawals", method: "GET" },
        ],
      },
      {
        key: "fees",
        label: "Fees",
        emoji: "💸",
        component: FeeDistributor,
        description: "Manage fee flows and distributions.",
        help: "View collected fees and distribution history.",
        actions: [
          { id: "history", label: "Fee History", icon: "📜", endpoint: "/api/billing/fee-history", method: "GET" },
        ],
      },
      {
        key: "treasury",
        label: "Treasury",
        emoji: "🏦",
        component: TreasuryManagement,
        description: "Manage platform-held funds.",
        help: "Monitor treasury balances across chains.",
        actions: [
          { id: "stats", label: "Treasury Stats", icon: "📊", endpoint: "/api/admin/treasury/stats", method: "GET" },
        ],
      },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    emoji: "📢",
    description: "Promote the platform and grow your audience.",
    tabs: [
      {
        key: "automation",
        label: "Auto Posts",
        emoji: "🤖",
        component: MarketingAutomationTab,
        description: "Schedule automated marketing posts.",
        help: "Create and manage automated posts to Telegram, Twitter, and Discord.",
        actions: [
          { id: "refresh", label: "Refresh Jobs", icon: "🔄", endpoint: "/api/admin/automation/jobs", method: "GET" },
        ],
      },
      {
        key: "promos",
        label: "Promo Codes",
        emoji: "🎟️",
        component: PromoManagement,
        description: "Create and manage discount codes.",
        help: "Generate new promo codes with custom discounts and expiration dates.",
        actions: [
          { id: "refresh", label: "Refresh", icon: "🔄", endpoint: "/api/admin/promo/list", method: "GET" },
        ],
      },
      {
        key: "referrals",
        label: "Referrals",
        emoji: "🧲",
        component: ReferralAnalytics,
        description: "Track user invite performance.",
        help: "View top referrers and referral conversion rates.",
        actions: [
          { id: "stats", label: "Referral Stats", icon: "📊", endpoint: "/api/admin/referrals/stats", method: "GET" },
        ],
      },
      {
        key: "social",
        label: "Social Manager",
        emoji: "📱",
        component: SocialManager,
        description: "Manage social media activity.",
        help: "Connect and manage multiple social accounts.",
        actions: [
          { id: "refresh", label: "Refresh", icon: "🔄", endpoint: "/api/admin/social/posts", method: "GET" },
        ],
      },
    ],
  },
  {
    id: "advanced",
    name: "Advanced",
    emoji: "⚙️",
    description: "Technical platform controls.",
    tabs: [
      {
        key: "token",
        label: "Token",
        emoji: "🪙",
        component: TokenManagement,
        description: "Mint, burn, and manage token actions.",
        help: "Control token supply: mint new tokens or burn existing ones.",
        actions: [
          { id: "stats", label: "Token Stats", icon: "📊", endpoint: "/api/admin/token/stats", method: "GET" },
        ],
      },
      {
        key: "audit",
        label: "Audit Logs",
        emoji: "📋",
        component: AuditLogs,
        description: "Review admin actions and events.",
        help: "See a chronological log of all admin actions.",
        actions: [
          { id: "refresh", label: "Refresh Logs", icon: "🔄", endpoint: "/api/admin/audit-logs", method: "GET" },
        ],
      },
      {
        key: "access",
        label: "Permissions",
        emoji: "🔐",
        component: AccessControl,
        description: "Control admin access and roles.",
        help: "Manage which users have admin access.",
        actions: [
          { id: "check", label: "Check Access", icon: "🔍", endpoint: "/api/admin/check", method: "GET" },
        ],
      },
    ],
  },
];

const ALL_TABS = TAB_SECTIONS.flatMap((section) => section.tabs);

/* -------------------- UI Components -------------------- */
const SectionBadge = ({ emoji, name, description }) => (
  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-4 transition hover:border-white/20">
    <div className="mb-2 flex items-center gap-2">
      <span className="text-2xl">{emoji}</span>
      <h3 className="font-semibold">{name}</h3>
    </div>
    <p className="text-sm text-white/65">{description}</p>
  </div>
);

function SidebarButton({ tab, isActive, onClick, badge, busy }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={[
        "w-full rounded-xl border px-3 py-3 text-left transition-all duration-200",
        isActive
          ? "border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
          : "border-transparent bg-transparent hover:border-white/10 hover:bg-white/5",
        busy ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      ].join(" ")}
      title={tab.description}
    >
      <div className="flex items-start gap-3">
        <span className="pt-0.5 text-xl">{tab.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{tab.label}</span>
            {badge ? (
              <span className="animate-pulse rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-300">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-white/45">{tab.description}</p>
        </div>
      </div>
    </button>
  );
}

function ActionButton({ action, onAction, busy }) {
  return (
    <button
      onClick={() => onAction(action)}
      disabled={busy}
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      ) : (
        <span>{action.icon}</span>
      )}
      <span>{action.label}</span>
    </button>
  );
}

export default function AdminPanel({ forceOwner = false }) {
  const { account } = useWallet();
  const { user, isAdmin: isAdminFromAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState("overview");
  const [tabResetKey, setTabResetKey] = useState(0);
  const [busyAction, setBusyAction] = useState({});
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [actionHistory, setActionHistory] = useState([]);

  const isDevelopment = process.env.NODE_ENV === "development" || window.location.hostname === "localhost";
  const BYPASS = isDevelopment && process.env.REACT_APP_BYPASS_OWNER === "1";
  const TEST_BYPASS = location.pathname.startsWith("/test/admin");

  const allowAccess = forceOwner || BYPASS || TEST_BYPASS || isAdminFromAuth;

  const activeTab = useMemo(() => {
    return ALL_TABS.find((tab) => tab.key === active) || ALL_TABS[0];
  }, [active]);

  const showToast = useCallback((message, type = "success", duration = 4000) => {
    setToast({ message, type });
    if (window.__imaliToastTimer) window.clearTimeout(window.__imaliToastTimer);
    window.__imaliToastTimer = window.setTimeout(() => setToast(null), duration);
  }, []);

  const logAction = useCallback((actionName, status, details = {}) => {
    setActionHistory((prev) => [
      { id: Date.now(), action: actionName, status, timestamp: new Date().toISOString(), details },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const resetCurrentTab = useCallback(() => setTabResetKey((prev) => prev + 1), []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await adminFetch("/api/admin/metrics", { method: "GET" });
      setStats({
        totalUsers: data.users?.total || 0,
        totalTrades: data.trades?.total || 0,
        totalPnl: data.pnl?.total || 0,
        winRate: data.trades?.win_rate || 0,
        pendingWithdrawals: data.revenue?.pending_withdrawals || 0,
        openTickets: data.tickets?.length || 0,
        activePromos: data.promos?.length || 0,
        waitlistCount: data.waitlist?.length || 0,
        activeJobs: data.automation?.active_jobs || 0,
        totalRevenue: data.revenue?.total_fees || 0,
        activeBots: data.bots?.active || 0,
      });
    } catch (err) {
      console.error("[AdminPanel] Stats fetch error:", err);
      if (err.message?.includes('401')) {
        showToast("Session expired. Please log in again.", "error");
        BotAPI.clearToken();
        navigate("/login");
      }
    }
  }, [showToast, navigate]);

  const handleAction = useCallback(async (action, payload = null, overrideEndpoint = null) => {
    const endpoint = overrideEndpoint || action?.endpoint;
    const method = action?.method || "GET";
    const actionKey = `${activeTab.key}:${action?.id || "custom"}`;
    const actionName = `${activeTab.label} ${action?.label || action?.id || "Action"}`;

    if (!endpoint) {
      showToast("No endpoint defined for this action.", "error");
      throw new Error("No endpoint defined.");
    }

    try {
      setBusyAction((prev) => ({ ...prev, [actionKey]: true }));
      logAction(actionName, "started", { endpoint, method, payload });

      const data = await adminFetch(endpoint, { method, ...(payload ? { body: JSON.stringify(payload) } : {}) });

      logAction(actionName, "success", { data });
      showToast(`${actionName} completed successfully.`, "success");

      if (action?.id === "refresh" || action?.id === "stats") fetchStats();
      return data;
    } catch (err) {
      const errorMessage = err?.message || `${actionName} failed.`;
      logAction(actionName, "error", { error: errorMessage });
      if (errorMessage.includes('401')) {
        showToast("Session expired. Please log in again.", "error");
        BotAPI.clearToken();
        navigate("/login");
      } else if (!errorMessage.includes('429')) {
        showToast(errorMessage, "error");
      }
      throw err;
    } finally {
      setBusyAction((prev) => {
        const next = { ...prev };
        delete next[actionKey];
        return next;
      });
    }
  }, [activeTab, fetchStats, logAction, showToast, navigate]);

  const navigateToTab = useCallback((tabKey) => {
    setActive(tabKey);
    setMobileMenuOpen(false);
    setTabResetKey(0);
  }, []);

  const renderTab = useCallback((tab) => {
    const Component = tab.component;
    return (
      <TabErrorBoundary tabName={tab.label} onReset={resetCurrentTab}>
        <Suspense fallback={<TabLoader name={tab.label} />}>
          <Component
            key={`${tab.key}-${tabResetKey}`}
            apiBase={API_BASE}
            account={account}
            busyAction={busyAction}
            showToast={showToast}
            handleAction={handleAction}
            onAction={(actionConfig, payload) => handleAction(actionConfig, payload)}
            stats={stats}
            refreshStats={fetchStats}
            resetTab={resetCurrentTab}
            actionHistory={actionHistory}
          />
        </Suspense>
      </TabErrorBoundary>
    );
  }, [account, actionHistory, busyAction, fetchStats, handleAction, resetCurrentTab, showToast, stats, tabResetKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setChecking(false);
      if (!isAdminFromAuth && !forceOwner && !BYPASS && !TEST_BYPASS) {
        setError("You do not have admin access.");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [isAdminFromAuth, forceOwner, BYPASS, TEST_BYPASS]);

  if (checking && !allowAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-950 to-black px-4 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <h2 className="mb-2 text-xl font-semibold">Checking access...</h2>
          <p className="text-sm text-white/55">Verifying admin permissions...</p>
        </div>
      </div>
    );
  }

  if (!allowAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-950 to-black px-6 text-white">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="mb-4 text-7xl">🔒</div>
          <h2 className="mb-2 text-2xl font-bold">Admin Only</h2>
          <p className="mb-6 text-white/65">{error || "This area is restricted to platform administrators."}</p>
          <button onClick={() => navigate("/dashboard")} className="w-full rounded-xl bg-emerald-600 px-6 py-3 font-medium transition hover:bg-emerald-500">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-950 to-black text-white">
      {toast && (
        <div className={`fixed right-4 top-4 z-[70] max-w-[92vw] rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${
          toast.type === "error" ? "border-red-500/40 bg-red-600/90" : "border-emerald-500/40 bg-emerald-600/90"
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-sm">{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-sm opacity-70 hover:opacity-100">✕</button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-gray-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen((prev) => !prev)} className="rounded-xl border border-white/10 bg-white/5 p-2 transition hover:bg-white/10 lg:hidden">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-xl font-bold text-transparent">IMALI Admin Panel</h1>
              <p className="hidden text-xs text-white/45 sm:block">Manage users, trades, finances, and platform settings.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {stats && (
              <div className="hidden items-center gap-2 lg:flex">
                <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs text-blue-300">👥 {stats.totalUsers} users</span>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-300">💰 ${stats.totalPnl?.toFixed(2)}</span>
              </div>
            )}
            <button onClick={() => navigate("/dashboard")} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white">
              Exit
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <aside className="absolute left-0 top-0 h-full w-[88%] max-w-sm overflow-y-auto border-r border-white/10 bg-gray-950 px-4 pb-6 pt-20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Navigation</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white">✕</button>
            </div>
            <div className="space-y-6">
              {TAB_SECTIONS.map((section) => (
                <div key={section.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">{section.emoji}</span>
                    <div>
                      <h3 className="text-sm font-semibold">{section.name}</h3>
                      <p className="text-xs text-white/45">{section.description}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {section.tabs.map((tab) => (
                      <SidebarButton key={tab.key} tab={tab} isActive={active === tab.key} onClick={() => navigateToTab(tab.key)} busy={false} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      <div className="mx-auto flex max-w-[1600px]">
        <aside className="hidden min-h-[calc(100vh-65px)] w-[300px] shrink-0 border-r border-white/10 bg-white/[0.03] lg:block">
          <div className="sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto p-4">
            <div className="space-y-6">
              {TAB_SECTIONS.map((section) => (
                <div key={section.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-lg">{section.emoji}</span>
                    <div>
                      <h3 className="text-sm font-semibold">{section.name}</h3>
                      <p className="text-[11px] text-white/40">{section.description}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {section.tabs.map((tab) => (
                      <SidebarButton key={tab.key} tab={tab} isActive={active === tab.key} onClick={() => navigateToTab(tab.key)} busy={false} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-4 lg:px-6 lg:py-6">
          {stats && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:hidden">
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-center">
                <div className="text-lg font-bold text-blue-300">{stats.totalUsers}</div>
                <div className="text-xs text-white/50">Users</div>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center">
                <div className="text-lg font-bold text-emerald-300">${stats.totalPnl?.toFixed(2)}</div>
                <div className="text-xs text-white/50">Total PnL</div>
              </div>
              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-3 text-center">
                <div className="text-lg font-bold text-purple-300">{stats.winRate || 0}%</div>
                <div className="text-xs text-white/50">Win Rate</div>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-center">
                <div className="text-lg font-bold text-amber-300">{stats.totalTrades || 0}</div>
                <div className="text-xs text-white/50">Trades</div>
              </div>
            </div>
          )}

          <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <span className="text-4xl">{activeTab.emoji}</span>
                <div>
                  <h2 className="text-2xl font-bold">{activeTab.label}</h2>
                  <p className="mt-1 text-sm text-white/55">{activeTab.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={resetCurrentTab} className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/20">
                  Reset Tab
                </button>
                <button onClick={fetchStats} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20">
                  Refresh All
                </button>
              </div>
            </div>
          </section>

          {activeTab.actions?.length > 0 && (
            <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h3 className="text-lg font-semibold">Quick Actions</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeTab.actions.map((action) => (
                  <ActionButton key={action.id} action={action} onAction={handleAction} busy={busyAction[`${activeTab.key}:${action.id}`]} />
                ))}
              </div>
            </section>
          )}

          <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
            {renderTab(activeTab)}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">❓</span>
                <h3 className="text-lg font-semibold">How to use this page</h3>
              </div>
              <button onClick={() => setShowHelpPanel((prev) => !prev)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs transition hover:bg-white/10">
                {showHelpPanel ? "Hide help" : "Show help"}
              </button>
            </div>
            {showHelpPanel && (
              <div className="space-y-3">
                <p className="text-sm leading-6 text-white/70">{activeTab.help}</p>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {TAB_SECTIONS.map((section) => (
                    <SectionBadge key={section.id} emoji={section.emoji} name={section.name} description={section.description} />
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className="mt-6 text-center text-[11px] text-white/25">
            Admin Panel • {account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : "No wallet connected"} • Last updated: {new Date().toLocaleTimeString()}
          </div>
        </main>
      </div>
    </div>
  );
}
