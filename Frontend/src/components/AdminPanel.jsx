// src/components/AdminPanel.jsx
import React, { useEffect, useState, useCallback, Suspense, lazy, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import BotAPI from "../utils/BotAPI";
import MarketingAutomation from "../admin/MarketingAutomation";

/* -------------------- Error Boundary -------------------- */
class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[AdminPanel] Tab "${this.props.tabName}" crashed:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <div className="mb-4 text-6xl">💥</div>
          <h3 className="mb-3 text-xl font-bold text-red-300">
            {this.props.tabName} failed to load
          </h3>
          <p className="mx-auto mb-6 max-w-md text-sm text-white/70">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium transition hover:bg-indigo-500"
          >
            Reload Page
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

/* -------------------- Config -------------------- */
const API_BASE = (process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com").replace(/\/+$/, "");

/* -------------------- API Helper with better error handling -------------------- */
const getAuthToken = () => BotAPI.getToken?.() || localStorage.getItem("token");

const adminFetch = async (endpoint, options = {}) => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, {
    method: options.method || "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = { message: await response.text() };
  }

  if (!response.ok) {
    const errorMessage = data.message || data.error || `Request failed (${response.status})`;
    throw new Error(errorMessage);
  }

  return data;
};

const checkAdminStatus = async () => {
  try {
    const data = await adminFetch("/api/admin/check", { method: "GET" });
    return data?.is_admin === true;
  } catch (error) {
    console.warn("[AdminPanel] Admin check failed:", error);
    return false;
  }
};

/* -------------------- Tab Definitions (simplified actions) -------------------- */
const TAB_SECTIONS = [
  {
    id: "dashboard",
    name: "Dashboard",
    emoji: "📊",
    description: "Platform overview.",
    tabs: [
      {
        key: "overview",
        label: "Overview",
        emoji: "✨",
        component: DashboardOverview,
        description: "Main numbers and summary cards.",
        help: "Start here first. This page gives you the big picture.",
        actions: [
          { id: "refresh", label: "Refresh", icon: "🔄", endpoint: "/api/admin/metrics", method: "GET" },
        ],
      },
      {
        key: "health",
        label: "System Health",
        emoji: "🏥",
        component: SystemHealth,
        description: "Check if services are running correctly.",
        help: "Use this to ensure the backend and bots are healthy.",
        actions: [
          { id: "refresh", label: "Refresh", icon: "🔄", endpoint: "/api/health/detailed", method: "GET" },
        ],
      },
    ],
  },
  {
    id: "users",
    name: "Users",
    emoji: "👥",
    description: "Manage accounts and support.",
    tabs: [
      {
        key: "users",
        label: "All Users",
        emoji: "👥",
        component: UserManagement,
        description: "View and manage user accounts.",
        help: "Search, filter, or export users.",
        actions: [
          { id: "export", label: "Export", icon: "📥", endpoint: "/api/admin/users/export", method: "GET" },
        ],
      },
      {
        key: "tickets",
        label: "Support",
        emoji: "🎫",
        component: SupportTickets,
        description: "Handle support issues.",
        help: "Reply, close, or assign tickets.",
      },
      {
        key: "waitlist",
        label: "Waitlist",
        emoji: "⏳",
        component: WaitlistManagement,
        description: "Review people waiting to join.",
        help: "Approve or email waitlist users.",
        actions: [
          { id: "export", label: "Export", icon: "📥", endpoint: "/api/admin/waitlist/export", method: "GET" },
        ],
      },
    ],
  },
  {
    id: "money",
    name: "Money",
    emoji: "💰",
    description: "Payments and treasury.",
    tabs: [
      {
        key: "withdrawals",
        label: "Withdrawals",
        emoji: "💰",
        component: WithdrawalManagement,
        description: "Approve or review withdrawal requests.",
        help: "Go here to handle money leaving the platform.",
      },
      {
        key: "fees",
        label: "Fees",
        emoji: "💸",
        component: FeeDistributor,
        description: "Manage fee distributions.",
        help: "Process pending fees and view history.",
        actions: [
          { id: "calculate", label: "Dry Run", icon: "🧪", endpoint: "/api/admin/process-pending-fees?dry_run=true", method: "POST" },
          { id: "distribute", label: "Distribute", icon: "📊", endpoint: "/api/admin/process-pending-fees", method: "POST" },
        ],
      },
      {
        key: "treasury",
        label: "Treasury",
        emoji: "🏦",
        component: TreasuryManagement,
        description: "Manage platform-held funds.",
        help: "Transfer, withdraw, or view treasury history.",
      },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    emoji: "📢",
    description: "Promote the platform.",
    tabs: [
      {
        key: "automation",
        label: "Auto Posts",
        emoji: "🤖",
        component: MarketingAutomation,
        description: "Schedule automated marketing posts.",
        help: "Manage recurring social media posts.",
      },
      {
        key: "promos",
        label: "Promo Codes",
        emoji: "🎟️",
        component: PromoManagement,
        description: "Create and manage discount codes.",
        help: "Run special offers and limited-time discounts.",
      },
      {
        key: "announcements",
        label: "Announcements",
        emoji: "📣",
        component: Announcements,
        description: "Send updates to users.",
        help: "Create and schedule platform announcements.",
      },
      {
        key: "referrals",
        label: "Referrals",
        emoji: "🧲",
        component: ReferralAnalytics,
        description: "Track user invite performance.",
        help: "Analyze referral program data.",
      },
      {
        key: "social",
        label: "Social Manager",
        emoji: "📱",
        component: SocialManager,
        description: "Manage social media activity.",
        help: "Post, schedule, and view social analytics.",
      },
    ],
  },
  {
    id: "advanced",
    name: "Advanced",
    emoji: "⚙️",
    description: "Technical controls.",
    tabs: [
      {
        key: "token",
        label: "Token",
        emoji: "🪙",
        component: TokenManagement,
        description: "Mint, burn, and manage tokens.",
        help: "Token supply and admin controls.",
      },
      {
        key: "buyback",
        label: "Buyback",
        emoji: "♻️",
        component: BuyBackDashboard,
        description: "Manage token buybacks.",
        help: "Execute and schedule buybacks.",
      },
      {
        key: "nfts",
        label: "NFTs",
        emoji: "🧬",
        component: NFTManagement,
        description: "Manage NFT tiers and items.",
        help: "Mint, burn, or transfer NFTs.",
      },
      {
        key: "cex",
        label: "CEX",
        emoji: "🏧",
        component: CexManagement,
        description: "Centralized exchange controls.",
        help: "Deposit, withdraw, and check balances.",
      },
      {
        key: "stocks",
        label: "Stocks",
        emoji: "📈",
        component: StocksManagement,
        description: "Stock trading tools.",
        help: "Trade, view positions, and history.",
      },
      {
        key: "access",
        label: "Permissions",
        emoji: "🔐",
        component: AccessControl,
        description: "Control admin access.",
        help: "Add, remove, or update admin roles.",
      },
      {
        key: "audit",
        label: "Audit Logs",
        emoji: "📋",
        component: AuditLogs,
        description: "Review admin actions.",
        help: "Filter, search, and export audit logs.",
      },
    ],
  },
];

const ALL_TABS = TAB_SECTIONS.flatMap((section) => section.tabs);

/* -------------------- Small UI Components -------------------- */
const SectionBadge = ({ emoji, name, description }) => (
  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-4 transition hover:border-white/20">
    <div className="mb-2 flex items-center gap-2">
      <span className="text-2xl">{emoji}</span>
      <h3 className="font-semibold">{name}</h3>
    </div>
    <p className="text-sm text-white/65">{description}</p>
  </div>
);

function SidebarButton({ tab, isActive, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-3 text-left transition-all duration-200 ${
        isActive
          ? "border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
          : "border-transparent bg-transparent hover:border-white/10 hover:bg-white/5"
      }`}
      title={tab.description}
    >
      <div className="flex items-start gap-3">
        <span className="pt-0.5 text-xl">{tab.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{tab.label}</span>
            {badge && (
              <span className="animate-pulse rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-300">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-white/45">{tab.description}</p>
        </div>
      </div>
    </button>
  );
}

function ActionButton({ action, onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      ) : (
        <span>{action.icon}</span>
      )}
      <span>{action.label}</span>
    </button>
  );
}

/* -------------------- Toast Component -------------------- */
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed right-4 top-4 z-[70] max-w-[92vw] rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${
        type === "error"
          ? "border-red-500/40 bg-red-600/90"
          : "border-emerald-500/40 bg-emerald-600/90"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm">{message}</span>
        <button onClick={onClose} className="text-sm opacity-70 transition hover:opacity-100">
          ✕
        </button>
      </div>
    </div>
  );
};

/* -------------------- Main AdminPanel Component -------------------- */
export default function AdminPanel({ forceOwner = false }) {
  const { account } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState("overview");
  const [busyActions, setBusyActions] = useState({});
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [socialStatus, setSocialStatus] = useState(null);

  const isDevelopment = process.env.NODE_ENV === "development" || window.location.hostname === "localhost";
  const BYPASS = isDevelopment && process.env.REACT_APP_BYPASS_OWNER === "1";
  const TEST_BYPASS = location.pathname.startsWith("/test/admin");

  const allowAccess = forceOwner || BYPASS || TEST_BYPASS || isAdmin;

  const activeTab = useMemo(() => ALL_TABS.find((t) => t.key === active) || ALL_TABS[0], [active]);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => setToast(null), []);

  // Admin access check
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        if (forceOwner || BYPASS || TEST_BYPASS) {
          if (mounted) setIsAdmin(true);
          return;
        }
        const token = getAuthToken();
        if (!token) {
          setError("Please log in first.");
          return;
        }
        const admin = await checkAdminStatus();
        if (mounted) {
          setIsAdmin(admin);
          if (!admin) setError("You do not have admin access.");
        }
      } catch (e) {
        console.error(e);
        setError("Could not verify admin permissions.");
      } finally {
        if (mounted) setChecking(false);
      }
    };
    check();
    return () => { mounted = false; };
  }, [forceOwner, BYPASS, TEST_BYPASS]);

  // Fetch stats
  useEffect(() => {
    if (!allowAccess) return;
    let mounted = true;
    const fetchStats = async () => {
      try {
        const data = await adminFetch("/api/admin/metrics", { method: "GET" });
        if (mounted && data) {
          setStats({
            totalUsers: data.users?.total || 0,
            pendingWithdrawals: data.withdrawals?.pending || 0,
            openTickets: data.tickets?.open || 0,
            activePromos: data.promos?.active || 0,
            waitlistCount: data.waitlist?.total || 0,
            activeJobs: data.automation?.active_jobs || 0,
            totalRevenue: data.revenue?.total || 0,
            activeBots: data.bots?.active || 0,
          });
        }
      } catch (err) {
        console.error("[AdminPanel] Stats fetch error:", err);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [allowAccess]);

  // Fetch social status for automation tab
  useEffect(() => {
    if (activeTab.key !== "automation" || !allowAccess) return;
    const fetchSocial = async () => {
      try {
        const data = await adminFetch("/api/admin/social/status", { method: "GET" });
        setSocialStatus(data);
      } catch (err) {
        console.error("[AdminPanel] Failed to fetch social status:", err);
      }
    };
    fetchSocial();
    const interval = setInterval(fetchSocial, 30000);
    return () => clearInterval(interval);
  }, [activeTab.key, allowAccess]);

  // Generic action handler
  const handleAction = useCallback(
    async (action) => {
      const actionId = action.id;
      const actionKey = `${activeTab.key}:${actionId}`;
      setBusyActions((prev) => ({ ...prev, [actionKey]: true }));

      try {
        const data = await adminFetch(action.endpoint, {
          method: action.method || "POST",
          body: action.body || undefined,
        });
        showToast(`${action.label} completed successfully.`, "success");
        return data;
      } catch (err) {
        showToast(err.message || `${action.label} failed.`, "error");
        throw err;
      } finally {
        setBusyActions((prev) => {
          const next = { ...prev };
          delete next[actionKey];
          return next;
        });
      }
    },
    [activeTab.key, showToast]
  );

  // Test social post
  const handleTestSocial = useCallback(
    async (platform) => {
      const actionKey = `testSocial:${platform}`;
      setBusyActions((prev) => ({ ...prev, [actionKey]: true }));

      try {
        const result = await adminFetch("/api/admin/social/test", {
          method: "POST",
          body: {
            platform,
            message: testMessage || `Test post from IMALI Admin at ${new Date().toLocaleString()}`,
          },
        });
        if (result?.success === false) {
          throw new Error(result.error || `Failed to send to ${platform}`);
        }
        showToast(`Test post sent to ${platform}.`, "success");
        // Refresh social status
        const status = await adminFetch("/api/admin/social/status", { method: "GET" });
        setSocialStatus(status);
      } catch (err) {
        showToast(err.message || `Error sending to ${platform}`, "error");
      } finally {
        setBusyActions((prev) => {
          const next = { ...prev };
          delete next[actionKey];
          return next;
        });
      }
    },
    [testMessage, showToast]
  );

  const navigateToTab = useCallback((tabKey) => {
    setActive(tabKey);
    setMobileMenuOpen(false);
  }, []);

  const renderTab = useCallback(
    (tab) => {
      const Component = tab.component;
      return (
        <TabErrorBoundary tabName={tab.label}>
          <Suspense fallback={<TabLoader name={tab.label} />}>
            <Component
              apiBase={API_BASE}
              account={account}
              showToast={showToast}
              handleAction={handleAction}
              stats={stats}
              refreshStats={() => window.location.reload()}
            />
          </Suspense>
        </TabErrorBoundary>
      );
    },
    [account, handleAction, showToast, stats]
  );

  if (checking && !allowAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-950 to-black px-4 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <h2 className="mb-2 text-xl font-semibold">Checking access...</h2>
          <p className="text-sm text-white/55">Verifying admin permissions.</p>
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
          <p className="mb-6 text-white/65">{error || "This area is restricted to administrators."}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full rounded-xl bg-emerald-600 px-6 py-3 font-medium transition hover:bg-emerald-500"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-950 to-black text-white">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-gray-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-xl border border-white/10 bg-white/5 p-2 transition hover:bg-white/10 lg:hidden"
              aria-label="Toggle navigation"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-xl font-bold text-transparent">
                IMALI Admin Panel
              </h1>
              <p className="hidden text-xs text-white/45 sm:block">Manage users, finances, marketing, and more.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {stats && (
              <div className="hidden items-center gap-2 lg:flex">
                <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs text-blue-300">👥 {stats.totalUsers}</span>
                <span className="rounded-full bg-purple-500/15 px-2.5 py-1 text-xs text-purple-300">🤖 {stats.activeJobs}</span>
                {stats.openTickets > 0 && (
                  <span className="animate-pulse rounded-full bg-red-500/15 px-2.5 py-1 text-xs text-red-300">
                    🎫 {stats.openTickets}
                  </span>
                )}
              </div>
            )}
            <button
              onClick={() => navigate("/dashboard")}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              Exit
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <aside
            className="absolute left-0 top-0 h-full w-[88%] max-w-sm overflow-y-auto border-r border-white/10 bg-gray-950 px-4 pb-6 pt-20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Navigation</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white">
                ✕
              </button>
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
                      <SidebarButton
                        key={tab.key}
                        tab={tab}
                        isActive={active === tab.key}
                        onClick={() => navigateToTab(tab.key)}
                        badge={tab.key === "tickets" && stats?.openTickets > 0 ? stats.openTickets : null}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      <div className="mx-auto flex max-w-[1600px]">
        {/* Desktop sidebar */}
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
                      <SidebarButton
                        key={tab.key}
                        tab={tab}
                        isActive={active === tab.key}
                        onClick={() => navigateToTab(tab.key)}
                        badge={tab.key === "tickets" && stats?.openTickets > 0 ? stats.openTickets : null}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-4 lg:px-6 lg:py-6">
          {/* Mobile stats */}
          {stats && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:hidden">
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-center">
                <div className="text-lg font-bold text-blue-300">{stats.totalUsers}</div>
                <div className="text-xs text-white/50">Users</div>
              </div>
              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-3 text-center">
                <div className="text-lg font-bold text-purple-300">{stats.activeJobs}</div>
                <div className="text-xs text-white/50">Jobs</div>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-center">
                <div className="text-lg font-bold text-amber-300">{stats.waitlistCount}</div>
                <div className="text-xs text-white/50">Waitlist</div>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center">
                <div className="text-lg font-bold text-emerald-300">{stats.activePromos}</div>
                <div className="text-xs text-white/50">Promos</div>
              </div>
            </div>
          )}

          {/* Active tab header */}
          <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="text-4xl">{activeTab.emoji}</span>
              <div>
                <h2 className="text-2xl font-bold">{activeTab.label}</h2>
                <p className="mt-1 text-sm text-white/55">{activeTab.description}</p>
              </div>
            </div>
          </section>

          {/* Quick actions */}
          {activeTab.actions?.length > 0 && (
            <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h3 className="text-lg font-semibold">Quick Actions</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeTab.actions.map((action) => (
                  <ActionButton
                    key={action.id}
                    action={action}
                    onClick={() => handleAction(action)}
                    loading={busyActions[`${activeTab.key}:${action.id}`]}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Tab content */}
          <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
            {renderTab(activeTab)}
          </section>

          {/* Integration status for automation tab */}
          {activeTab.key === "automation" && socialStatus && (
            <section className="mb-6 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-cyan-300">🔌 Integration Status</h3>
                <button
                  onClick={async () => {
                    try {
                      const data = await adminFetch("/api/admin/social/status", { method: "GET" });
                      setSocialStatus(data);
                    } catch (err) {
                      showToast("Failed to refresh status", "error");
                    }
                  }}
                  className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs transition hover:bg-cyan-500/20"
                >
                  Refresh
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">📱</span>
                    <h4 className="font-medium">Telegram</h4>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/50">Status:</span>
                      <span className={socialStatus.telegram?.configured ? "text-green-400" : "text-red-400"}>
                        {socialStatus.telegram?.configured ? "✅ Connected" : "❌ Disconnected"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Bot:</span>
                      <span className="text-white/80">{socialStatus.telegram?.bot_name || "Not set"}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">𝕏</span>
                    <h4 className="font-medium">Twitter/X</h4>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/50">Status:</span>
                      <span className={socialStatus.twitter?.configured ? "text-green-400" : "text-red-400"}>
                        {socialStatus.twitter?.configured ? "✅ Connected" : "❌ Disconnected"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">💬</span>
                    <h4 className="font-medium">Discord</h4>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/50">Status:</span>
                      <span className={socialStatus.discord?.configured ? "text-green-400" : "text-red-400"}>
                        {socialStatus.discord?.configured ? "✅ Connected" : "❌ Disconnected"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Quick test for automation tab */}
          {activeTab.key === "automation" && (
            <section className="mb-6 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-cyan-300">Quick Test</h3>
                  <p className="text-sm text-white/70">Send a test message to verify integrations.</p>
                </div>
                <button
                  onClick={() => setTestMessage("")}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200 transition hover:bg-amber-500/20"
                >
                  Reset
                </button>
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-sm text-white/50">Test Message (optional)</label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Leave empty for default message..."
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-cyan-400/40"
                  rows="3"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleTestSocial("telegram")}
                  disabled={busyActions["testSocial:telegram"]}
                  className="flex items-center gap-2 rounded-lg bg-[#26A5E4] px-4 py-2 text-sm font-medium transition hover:bg-[#1E8BC3] disabled:opacity-50"
                >
                  {busyActions["testSocial:telegram"] ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "📱"}
                  Test Telegram
                </button>
                <button
                  onClick={() => handleTestSocial("twitter")}
                  disabled={busyActions["testSocial:twitter"]}
                  className="flex items-center gap-2 rounded-lg bg-[#1DA1F2] px-4 py-2 text-sm font-medium transition hover:bg-[#0C7ABF] disabled:opacity-50"
                >
                  {busyActions["testSocial:twitter"] ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "𝕏"}
                  Test Twitter/X
                </button>
                <button
                  onClick={() => handleTestSocial("discord")}
                  disabled={busyActions["testSocial:discord"]}
                  className="flex items-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-medium transition hover:bg-[#4752C4] disabled:opacity-50"
                >
                  {busyActions["testSocial:discord"] ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "💬"}
                  Test Discord
                </button>
              </div>
            </section>
          )}

          {/* Help section */}
          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">❓</span>
                <h3 className="text-lg font-semibold">How to use this page</h3>
              </div>
              <button
                onClick={() => setShowHelpPanel(!showHelpPanel)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs transition hover:bg-white/10"
              >
                {showHelpPanel ? "Hide" : "Show"}
              </button>
            </div>
            {showHelpPanel && (
              <div className="space-y-3">
                <p className="text-sm leading-6 text-white/70">{activeTab.help}</p>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {TAB_SECTIONS.map((section) => (
                    <SectionBadge
                      key={section.id}
                      emoji={section.emoji}
                      name={section.name}
                      description={section.description}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className="mt-6 text-center text-[11px] text-white/25">
            Admin Panel • {account ? `${account.slice(0,6)}...${account.slice(-4)}` : "No wallet"} • {new Date().toLocaleTimeString()}
          </div>
        </main>
      </div>
    </div>
  );
}