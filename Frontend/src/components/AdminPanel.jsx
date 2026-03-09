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
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[AdminPanel] Tab "${this.props.tabName}" crashed:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, retryCount: this.state.retryCount + 1 });
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
            Try Again ({this.state.retryCount}/3)
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
const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

/* -------------------- API Helper with Retry Logic -------------------- */
const adminFetch = async (endpoint, options = {}, retries = 2) => {
  const token = BotAPI.getToken?.() || localStorage.getItem("token");

  if (!token) {
    throw new Error("No authentication token found");
  }

  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
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
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
};

/* -------------------- Admin Status Check -------------------- */
const checkAdminStatus = async () => {
  try {
    const data = await adminFetch("/api/admin/check");
    return data?.is_admin === true;
  } catch (error) {
    console.warn("[AdminPanel] Admin check failed:", error);
    return false;
  }
};

/* -------------------- Sections -------------------- */
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
        help: "Start here first. This page gives you the big picture of what is happening on your platform.",
      },
      {
        key: "health",
        label: "System Health",
        emoji: "🏥",
        component: SystemHealth,
        description: "Check if services are running correctly.",
        help: "Use this when you want to make sure the backend, bots, and connected services are healthy.",
      },
    ],
  },
  {
    id: "users",
    name: "Users",
    emoji: "👥",
    description: "Manage accounts and help people using the platform.",
    tabs: [
      {
        key: "users",
        label: "All Users",
        emoji: "👥",
        component: UserManagement,
        description: "View and manage user accounts.",
        help: "Use this to search for users, review accounts, and make account-related changes.",
      },
      {
        key: "tickets",
        label: "Support",
        emoji: "🎫",
        component: SupportTickets,
        description: "Handle support issues and questions.",
        help: "Open this when users need help or when you want to review unresolved issues.",
      },
      {
        key: "waitlist",
        label: "Waitlist",
        emoji: "⏳",
        component: WaitlistManagement,
        description: "Review people waiting to join.",
        help: "Use this to track interest before a user has full access to the platform.",
      },
    ],
  },
  {
    id: "money",
    name: "Money",
    emoji: "💰",
    description: "Handle payments, treasury, and financial actions.",
    tabs: [
      {
        key: "withdrawals",
        label: "Withdrawals",
        emoji: "💰",
        component: WithdrawalManagement,
        description: "Approve or review withdrawal requests.",
        help: "Go here when you need to review money leaving the platform.",
      },
      {
        key: "fees",
        label: "Fees",
        emoji: "💸",
        component: FeeDistributor,
        description: "Manage fee flows and distributions.",
        help: "Use this to understand how collected fees are being split or routed.",
      },
      {
        key: "treasury",
        label: "Treasury",
        emoji: "🏦",
        component: TreasuryManagement,
        description: "Manage platform-held funds.",
        help: "This is the place for treasury balances, reserves, and fund movement controls.",
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
        component: MarketingAutomation,
        description: "Schedule automated marketing posts.",
        help: "Use this to plan recurring content instead of posting everything manually.",
      },
      {
        key: "promos",
        label: "Promo Codes",
        emoji: "🎟️",
        component: PromoManagement,
        description: "Create and manage discount codes.",
        help: "Open this when you want to run a special offer, referral code, or limited-time discount.",
      },
      {
        key: "announcements",
        label: "Announcements",
        emoji: "📣",
        component: Announcements,
        description: "Send updates to users.",
        help: "Use this to share important news, updates, feature launches, or maintenance notices.",
      },
      {
        key: "referrals",
        label: "Referrals",
        emoji: "🧲",
        component: ReferralAnalytics,
        description: "Track user invite performance.",
        help: "This helps you see who is bringing in users and how referrals are performing.",
      },
      {
        key: "social",
        label: "Social Manager",
        emoji: "📱",
        component: SocialManager,
        description: "Manage social media activity.",
        help: "Use this to organize social channels and keep marketing activity in one place.",
      },
    ],
  },
  {
    id: "advanced",
    name: "Advanced",
    emoji: "⚙️",
    description: "More technical platform controls.",
    tabs: [
      {
        key: "token",
        label: "Token",
        emoji: "🪙",
        component: TokenManagement,
        description: "Mint, burn, and manage token actions.",
        help: "Use this for token supply and token-related admin controls.",
      },
      {
        key: "buyback",
        label: "Buyback",
        emoji: "♻️",
        component: BuyBackDashboard,
        description: "Manage token buybacks.",
        help: "This area is for buyback settings, monitoring, and execution.",
      },
      {
        key: "nfts",
        label: "NFTs",
        emoji: "🧬",
        component: NFTManagement,
        description: "Manage NFT tiers and NFT items.",
        help: "Go here when you need to manage NFT access or NFT-related rewards.",
      },
      {
        key: "cex",
        label: "CEX",
        emoji: "🏧",
        component: CexManagement,
        description: "Manage centralized exchange controls.",
        help: "Use this for exchange-related settings, balances, or connected exchange actions.",
      },
      {
        key: "stocks",
        label: "Stocks",
        emoji: "📈",
        component: StocksManagement,
        description: "Manage stock-related trading tools.",
        help: "This page is for stock-side operations if your platform supports them.",
      },
      {
        key: "access",
        label: "Permissions",
        emoji: "🔐",
        component: AccessControl,
        description: "Control admin access and roles.",
        help: "Use this to decide who can see or do certain things in the admin system.",
      },
      {
        key: "audit",
        label: "Audit Logs",
        emoji: "📋",
        component: AuditLogs,
        description: "Review admin actions and events.",
        help: "Open this when you want to see what changes were made and by whom.",
      },
    ],
  },
];

const ALL_TABS = TAB_SECTIONS.flatMap((section) => section.tabs);

/* -------------------- Section Badge Component -------------------- */
const SectionBadge = ({ emoji, name, description }) => (
  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-4 hover:border-white/20 transition">
    <div className="mb-2 flex items-center gap-2">
      <span className="text-2xl">{emoji}</span>
      <h3 className="font-semibold">{name}</h3>
    </div>
    <p className="text-sm text-white/65">{description}</p>
  </div>
);

/* -------------------- Sidebar Button -------------------- */
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
        busy ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      ].join(" ")}
      title={tab.description}
    >
      <div className="flex items-start gap-3">
        <span className="pt-0.5 text-xl">{tab.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{tab.label}</span>
            {badge ? (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-300 animate-pulse">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-white/45 line-clamp-2">{tab.description}</p>
        </div>
      </div>
    </button>
  );
}

/* -------------------- Action Button Component -------------------- */
const ActionButton = ({ action, onClick, busy }) => {
  const actionLabels = {
    refresh: { icon: "🔄", label: "Refresh" },
    export: { icon: "📥", label: "Export" },
    search: { icon: "🔍", label: "Search" },
    filter: { icon: "🎯", label: "Filter" },
    approve: { icon: "✅", label: "Approve" },
    reject: { icon: "❌", label: "Reject" },
    create: { icon: "➕", label: "Create" },
    edit: { icon: "✏️", label: "Edit" },
    delete: { icon: "🗑️", label: "Delete" },
    send: { icon: "📤", label: "Send" },
    schedule: { icon: "⏰", label: "Schedule" },
    test: { icon: "🧪", label: "Test" },
    pause: { icon: "⏸️", label: "Pause" },
    resume: { icon: "▶️", label: "Resume" },
    diagnose: { icon: "🔬", label: "Diagnose" },
    distribute: { icon: "📊", label: "Distribute" },
    calculate: { icon: "🧮", label: "Calculate" },
    history: { icon: "📜", label: "History" },
    transfer: { icon: "💸", label: "Transfer" },
    withdraw: { icon: "💰", label: "Withdraw" },
    deposit: { icon: "📥", label: "Deposit" },
    balance: { icon: "⚖️", label: "Balance" },
    trade: { icon: "📈", label: "Trade" },
    position: { icon: "📊", label: "Position" },
    mint: { icon: "🪙", label: "Mint" },
    burn: { icon: "🔥", label: "Burn" },
    execute: { icon: "⚡", label: "Execute" },
    reward: { icon: "🎁", label: "Reward" },
    analyze: { icon: "📊", label: "Analyze" },
    post: { icon: "📱", label: "Post" },
    analytics: { icon: "📈", label: "Analytics" },
    reply: { icon: "💬", label: "Reply" },
    close: { icon: "🔒", label: "Close" },
    assign: { icon: "👤", label: "Assign" },
    email: { icon: "📧", label: "Email" },
    review: { icon: "👁️", label: "Review" },
    add: { icon: "➕", label: "Add" },
    remove: { icon: "➖", label: "Remove" },
    update: { icon: "🔄", label: "Update" }
  };

  const label = actionLabels[action] || { icon: "🔘", label: action };

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium transition hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {busy ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      ) : (
        <span>{label.icon}</span>
      )}
      <span>{label.label}</span>
    </button>
  );
};

/* -------------------- Test Automation Function -------------------- */
const testSocialPost = async (platform, message) => {
  try {
    const response = await fetch(`${API_BASE}/api/admin/social/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BotAPI.getToken?.() || localStorage.getItem('token')}`
      },
      body: JSON.stringify({ platform, message })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Failed to test ${platform} post:`, error);
    throw error;
  }
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
  const [busyAction, setBusyAction] = useState({});
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false); // Help panel starts collapsed
  const [actionHistory, setActionHistory] = useState([]);
  const [testMessage, setTestMessage] = useState("");

  const isDevelopment =
    process.env.NODE_ENV === "development" || window.location.hostname === "localhost";
  const BYPASS = isDevelopment && process.env.REACT_APP_BYPASS_OWNER === "1";
  const TEST_BYPASS = location.pathname.startsWith("/test/admin");

  const allowAccess = forceOwner || BYPASS || TEST_BYPASS || isAdmin;

  const activeTab = useMemo(() => {
    return ALL_TABS.find((tab) => tab.key === active) || ALL_TABS[0];
  }, [active]);

  /* -------------------- Toast with Auto-hide -------------------- */
  const showToast = useCallback((message, type = "success", duration = 4500) => {
    setToast({ message, type, duration });
    if (window.__imaliToastTimer) {
      window.clearTimeout(window.__imaliToastTimer);
    }
    window.__imaliToastTimer = window.setTimeout(() => setToast(null), duration);
  }, []);

  /* -------------------- Log Action to History -------------------- */
  const logAction = useCallback((actionName, status, details = {}) => {
    setActionHistory(prev => [
      {
        id: Date.now(),
        action: actionName,
        status,
        timestamp: new Date().toISOString(),
        details
      },
      ...prev.slice(0, 49)
    ]);
  }, []);

  /* -------------------- Admin Access Check -------------------- */
  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      try {
        if (forceOwner || BYPASS || TEST_BYPASS) {
          if (mounted) setIsAdmin(true);
          return;
        }

        const token = BotAPI.getToken?.() || localStorage.getItem("token");
        if (!token) {
          if (mounted) setError("Please log in first.");
          return;
        }

        const admin = await checkAdminStatus();
        if (!mounted) return;

        setIsAdmin(admin);
        if (!admin) setError("You do not have admin access.");
      } catch (e) {
        console.error("[AdminPanel] Access check error:", e);
        if (mounted) setError("Could not verify admin permissions.");
      } finally {
        if (mounted) setChecking(false);
      }
    };

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [forceOwner, BYPASS, TEST_BYPASS]);

  /* -------------------- Fetch Dashboard Stats -------------------- */
  useEffect(() => {
    if (!allowAccess) return;

    let mounted = true;

    const fetchStats = async () => {
      try {
        const data = await adminFetch("/api/admin/metrics").catch(() => null);
        if (!mounted || !data) return;

        setStats({
          totalUsers: data.users?.total || 0,
          pendingWithdrawals: data.withdrawals?.pending || 0,
          openTickets: data.tickets?.open || 0,
          activePromos: data.promos?.active || 0,
          waitlistCount: data.waitlist?.total || 0,
          activeJobs: data.automation?.active_jobs || 0,
          totalRevenue: data.revenue?.total || 0,
          activeBots: data.bots?.active || 0
        });
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

  /* -------------------- Universal Action Handler -------------------- */
  const handleAction = useCallback(
    async (endpoint, method = "POST", body = {}, actionName = "Action") => {
      const actionId = `${actionName}-${Date.now()}`;
      
      try {
        setBusyAction(prev => ({ ...prev, [actionId]: true }));
        logAction(actionName, "started", { endpoint, method, body });
        
        const data = await adminFetch(endpoint, {
          method,
          body: JSON.stringify(body),
        });
        
        logAction(actionName, "success", { endpoint, response: data });
        showToast(`${actionName} completed successfully.`, "success");
        
        return data;
      } catch (err) {
        const errorMessage = err?.message || `${actionName} failed.`;
        logAction(actionName, "error", { endpoint, error: errorMessage });
        showToast(errorMessage, "error");
        throw err;
      } finally {
        setBusyAction(prev => {
          const newState = { ...prev };
          delete newState[actionId];
          return newState;
        });
      }
    },
    [showToast, logAction]
  );

  /* -------------------- Test Social Post -------------------- */
  const handleTestSocial = useCallback(async (platform) => {
    try {
      setBusyAction(prev => ({ ...prev, testSocial: true }));
      const defaultMessage = `Test post from IMALI Admin Panel at ${new Date().toLocaleString()}`;
      const message = testMessage || defaultMessage;
      
      const result = await testSocialPost(platform, message);
      
      if (result.success) {
        showToast(`✅ Test post sent to ${platform}`, "success");
      } else {
        showToast(`❌ Failed to send to ${platform}: ${result.error}`, "error");
      }
    } catch (error) {
      showToast(`❌ Error sending to ${platform}: ${error.message}`, "error");
    } finally {
      setBusyAction(prev => ({ ...prev, testSocial: false }));
    }
  }, [testMessage, showToast]);

  /* -------------------- Tab Navigation -------------------- */
  const navigateToTab = useCallback((tabKey) => {
    setActive(tabKey);
    setMobileMenuOpen(false);
  }, []);

  /* -------------------- Tab Renderer -------------------- */
  const renderTab = useCallback(
    (tab) => {
      const Component = tab.component;

      return (
        <TabErrorBoundary tabName={tab.label} key={`${tab.key}-${Date.now()}`}>
          <Suspense fallback={<TabLoader name={tab.label} />}>
            <Component
              apiBase={API_BASE}
              account={account}
              busyAction={busyAction}
              showToast={showToast}
              handleAction={handleAction}
              onAction={(action, data) => handleAction(
                data?.endpoint || `/api/admin/${tab.key}/${action}`,
                data?.method || "POST",
                data?.body || {},
                `${tab.label} ${action}`
              )}
              stats={stats}
            />
          </Suspense>
        </TabErrorBoundary>
      );
    },
    [account, busyAction, handleAction, showToast, stats]
  );

  /* -------------------- Loading State -------------------- */
  if (checking && !allowAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-950 to-black px-4 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <h2 className="mb-2 text-xl font-semibold">Checking access...</h2>
          <p className="text-sm text-white/55">Making sure you are allowed into the admin panel.</p>
        </div>
      </div>
    );
  }

  /* -------------------- Access Denied State -------------------- */
  if (!allowAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-950 to-black px-6 text-white">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="mb-4 text-7xl">🔒</div>
          <h2 className="mb-2 text-2xl font-bold">Admin Only</h2>
          <p className="mb-6 text-white/65">
            {error || "This area is restricted to platform administrators."}
          </p>
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

  /* -------------------- Main Render -------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-950 to-black text-white">
      {/* Toast Notification */}
      {toast ? (
        <div
          className={[
            "fixed right-4 top-4 z-[70] max-w-[92vw] animate-in slide-in-from-right rounded-xl border px-4 py-3 shadow-lg backdrop-blur",
            toast.type === "error"
              ? "border-red-500/40 bg-red-600/90"
              : "border-emerald-500/40 bg-emerald-600/90",
          ].join(" ")}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-sm opacity-70 transition hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-gray-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
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
              <p className="hidden text-xs text-white/45 sm:block">
                Manage users, finances, marketing, and advanced platform tools.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {stats ? (
              <div className="hidden items-center gap-2 lg:flex">
                <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs text-blue-300">
                  👥 {stats.totalUsers} users
                </span>
                <span className="rounded-full bg-purple-500/15 px-2.5 py-1 text-xs text-purple-300">
                  🤖 {stats.activeJobs} jobs
                </span>
                {stats.openTickets > 0 ? (
                  <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs text-red-300 animate-pulse">
                    🎫 {stats.openTickets} tickets
                  </span>
                ) : null}
              </div>
            ) : null}

            <button
              onClick={() => navigate("/dashboard")}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              Exit
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen ? (
        <div 
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" 
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 h-full w-[88%] max-w-sm overflow-y-auto border-r border-white/10 bg-gray-950 px-4 pb-6 pt-20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Navigation</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
              >
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
                        badge={
                          tab.key === "tickets" && stats?.openTickets > 0
                            ? stats.openTickets
                            : null
                        }
                        busy={busyAction[`${tab.key}-loading`]}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      ) : null}

      {/* Main Content */}
      <div className="mx-auto flex max-w-[1600px]">
        {/* Desktop Sidebar */}
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
                        badge={
                          tab.key === "tickets" && stats?.openTickets > 0
                            ? stats.openTickets
                            : null
                        }
                        busy={busyAction[`${tab.key}-loading`]}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 px-4 py-4 lg:px-6 lg:py-6">
          {/* Mobile Stats */}
          {stats ? (
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
          ) : null}

          {/* Selected Tab Header - MOVED TO TOP */}
          <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <span className="text-4xl">{activeTab.emoji}</span>
                <div>
                  <h2 className="text-2xl font-bold">{activeTab.label}</h2>
                  <p className="mt-1 text-sm text-white/55">{activeTab.description}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Tab Content */}
          <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
            {renderTab(activeTab)}
          </section>

          {/* Quick Test Panel - For Automation */}
          {activeTab.key === "automation" && (
            <section className="mb-6 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-4 sm:p-6">
              <h3 className="mb-3 text-lg font-semibold text-cyan-300">Quick Test</h3>
              <p className="mb-4 text-sm text-white/70">
                Send a test message to your connected platforms to verify they're working.
              </p>
              
              <div className="mb-4">
                <label className="mb-2 block text-sm text-white/50">Test Message (optional)</label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Leave empty for default test message..."
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-sm"
                  rows="3"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleTestSocial("telegram")}
                  disabled={busyAction.testSocial}
                  className="flex items-center gap-2 rounded-lg bg-[#26A5E4] px-4 py-2 text-sm font-medium transition hover:bg-[#1E8BC3] disabled:opacity-50"
                >
                  {busyAction.testSocial ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <span>📱</span>
                  )}
                  Test Telegram
                </button>
                
                <button
                  onClick={() => handleTestSocial("twitter")}
                  disabled={busyAction.testSocial}
                  className="flex items-center gap-2 rounded-lg bg-[#1DA1F2] px-4 py-2 text-sm font-medium transition hover:bg-[#0C7ABF] disabled:opacity-50"
                >
                  {busyAction.testSocial ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <span>𝕏</span>
                  )}
                  Test Twitter/X
                </button>
                
                <button
                  onClick={() => handleTestSocial("discord")}
                  disabled={busyAction.testSocial}
                  className="flex items-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-medium transition hover:bg-[#4752C4] disabled:opacity-50"
                >
                  {busyAction.testSocial ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <span>💬</span>
                  )}
                  Test Discord
                </button>
              </div>
            </section>
          )}

          {/* Help Section - MOVED TO BOTTOM */}
          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">❓</span>
                <h3 className="text-lg font-semibold">How to use this page</h3>
              </div>
              <button
                onClick={() => setShowHelpPanel((prev) => !prev)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs transition hover:bg-white/10"
              >
                {showHelpPanel ? "Hide help" : "Show help"}
              </button>
            </div>

            {showHelpPanel ? (
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
            ) : null}
          </section>

          {/* Footer */}
          <div className="mt-6 text-center text-[11px] text-white/25">
            Admin Panel • {account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : "No wallet connected"} • 
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </main>
      </div>
    </div>
  );
}