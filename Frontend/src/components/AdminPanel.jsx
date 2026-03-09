// src/components/AdminPanel.jsx
import React, { useEffect, useState, useCallback, Suspense, lazy } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import BotAPI from "../utils/BotAPI";
import MarketingAutomation from '../admin/MarketingAutomation';

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
        <div className="p-4 sm:p-6 text-center">
          <div className="text-5xl mb-4">💥</div>
          <h3 className="text-lg font-bold text-red-300 mb-3">
            "{this.props.tabName}" couldn't load
          </h3>
          <p className="text-sm text-white/60 mb-5 max-w-md mx-auto">
            {this.state.error?.message || "Something went wrong loading this section"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium transition-colors"
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
  <div className="flex flex-col items-center justify-center py-12">
    <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
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
const TreasuryManagement = lazy(() => import("../admin/TreasuryManagement.jsx"));
const CexManagement = lazy(() => import("../admin/CexManagement.jsx"));
const StocksManagement = lazy(() => import("../admin/StocksManagement.jsx"));

/* -------------------- Env Helpers -------------------- */
const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

/* -------------------- API Helper -------------------- */
const adminFetch = async (endpoint, options = {}) => {
  const token = BotAPI.getToken?.() || localStorage.getItem('token');
  if (!token) {
    throw new Error("No authentication token found");
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...options.headers,
    },
  });
  
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw new Error(data.message || data.error || `Request failed (${response.status})`);
  }
  
  return data;
};

/* -------------------- Admin Check Function -------------------- */
const checkAdminStatus = async () => {
  try {
    const data = await adminFetch("/api/admin/check");
    return data?.is_admin === true;
  } catch (error) {
    console.warn("[AdminPanel] Admin check failed:", error);
    return false;
  }
};

/* ==================================================================
   SIMPLIFIED TAB CATEGORIES - Grouped for beginners
================================================================== */

const TAB_SECTIONS = [
  {
    name: "📊 Dashboard",
    description: "Platform overview",
    color: "from-blue-500 to-indigo-500",
    tabs: [
      { key: "overview", label: "Overview", emoji: "✨", component: DashboardOverview, description: "Key metrics at a glance" },
      { key: "health", label: "System Health", emoji: "🏥", component: SystemHealth, description: "Check if everything is running" },
    ]
  },
  {
    name: "👥 Users",
    description: "Manage people",
    color: "from-emerald-500 to-teal-500",
    tabs: [
      { key: "users", label: "All Users", emoji: "👥", component: UserManagement, description: "View and edit user accounts" },
      { key: "tickets", label: "Support", emoji: "🎫", component: SupportTickets, description: "Help your users" },
      { key: "waitlist", label: "Waitlist", emoji: "⏳", component: WaitlistManagement, description: "People waiting to join" },
    ]
  },
  {
    name: "💰 Money",
    description: "Financial stuff",
    color: "from-amber-500 to-orange-500",
    tabs: [
      { key: "withdrawals", label: "Withdrawals", emoji: "💰", component: WithdrawalManagement, description: "Approve money requests" },
      { key: "fees", label: "Fees", emoji: "💸", component: FeeDistributor, description: "Process trading fees" },
      { key: "treasury", label: "Treasury", emoji: "🏦", component: TreasuryManagement, description: "Platform money" },
    ]
  },
  {
    name: "📢 Marketing",
    description: "Grow your platform",
    color: "from-purple-500 to-pink-500",
    tabs: [
      { key: "automation", label: "Auto Posts", emoji: "🤖", component: MarketingAutomation, description: "Schedule social media" },
      { key: "promos", label: "Promo Codes", emoji: "🎟️", component: PromoManagement, description: "Create discounts" },
      { key: "announcements", label: "Announce", emoji: "📢", component: Announcements, description: "Tell users stuff" },
      { key: "referrals", label: "Referrals", emoji: "🧲", component: ReferralAnalytics, description: "Track invites" },
      { key: "social", label: "Social", emoji: "📣", component: SocialManager, description: "Manage social media" },
    ]
  },
  {
    name: "⚙️ Advanced",
    description: "Expert settings",
    color: "from-gray-600 to-gray-700",
    tabs: [
      { key: "token", label: "Token", emoji: "🪙", component: TokenManagement, description: "Mint & burn tokens" },
      { key: "buyback", label: "Buyback", emoji: "♻️", component: BuyBackDashboard, description: "Token buybacks" },
      { key: "nfts", label: "NFTs", emoji: "🧬", component: NFTManagement, description: "Manage NFTs" },
      { key: "cex", label: "CEX", emoji: "🏧", component: CexManagement, description: "Exchange funding" },
      { key: "stocks", label: "Stocks", emoji: "📈", component: StocksManagement, description: "Stock trading" },
      { key: "access", label: "Permissions", emoji: "🔐", component: AccessControl, description: "Who can do what" },
      { key: "audit", label: "Audit Logs", emoji: "📋", component: AuditLogs, description: "See what happened" },
    ]
  }
];

// Flatten for quick access
const ALL_TABS = TAB_SECTIONS.flatMap(section => section.tabs);

/* ==================================================================
   MAIN ADMIN PANEL - Mobile & Novice Friendly
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
  const [showGuide, setShowGuide] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDevelopment = process.env.NODE_ENV === "development" || window.location.hostname === "localhost";
  const BYPASS = isDevelopment && (process.env.REACT_APP_BYPASS_OWNER === "1");
  const TEST_BYPASS = location.pathname.startsWith("/test/admin");

  /* -------------------- Toast helper -------------------- */
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  /* -------------------- Admin check -------------------- */
  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      try {
        // Development bypass
        if (forceOwner || BYPASS || TEST_BYPASS) {
          if (mounted) setIsAdmin(true);
          setChecking(false);
          return;
        }

        // Check if logged in
        const token = BotAPI.getToken?.() || localStorage.getItem('token');
        if (!token) {
          if (mounted) setError("Please log in first");
          setChecking(false);
          return;
        }

        // Check admin status
        const admin = await checkAdminStatus();
        if (mounted) {
          setIsAdmin(admin);
          if (!admin) setError("You're not an admin");
        }
      } catch (e) {
        console.error("Access check error:", e);
        if (mounted) setError("Couldn't verify permissions");
      } finally {
        if (mounted) setChecking(false);
      }
    };

    checkAccess();
  }, [forceOwner, BYPASS, TEST_BYPASS]);

  /* -------------------- Fetch dashboard stats -------------------- */
  useEffect(() => {
    const allowAccess = forceOwner || BYPASS || TEST_BYPASS || isAdmin;
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
        });
      } catch (err) {
        console.error("Stats fetch error:", err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Update every minute

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isAdmin, forceOwner, BYPASS, TEST_BYPASS]);

  /* -------------------- Action handlers -------------------- */
  const handleAction = useCallback(async (endpoint, method = "POST", body = {}, actionName = "Action") => {
    try {
      setBusyAction(actionName);
      const data = await adminFetch(endpoint, { method, body: JSON.stringify(body) });
      showToast(`✅ ${actionName} completed!`, "success");
      return data;
    } catch (err) {
      showToast(err?.message || `${actionName} failed`, "error");
      throw err;
    } finally {
      setBusyAction("");
    }
  }, [showToast]);

  const navigateToTab = useCallback((tabKey) => {
    setActive(tabKey);
    setMobileMenuOpen(false);
    setShowGuide(false);
  }, []);

  /* -------------------- Tab renderer -------------------- */
  const renderTab = useCallback((tab) => {
    const commonProps = {
      apiBase: API_BASE,
      account,
      onAction: () => window.location.reload(),
      showToast,
      busyAction,
      handleAction,
    };

    const Component = tab.component;
    return (
      <TabErrorBoundary tabName={tab.label}>
        <Suspense fallback={<TabLoader name={tab.label} />}>
          <Component {...commonProps} />
        </Suspense>
      </TabErrorBoundary>
    );
  }, [account, busyAction, handleAction, showToast]);

  /* -------------------- Loading state -------------------- */
  if (checking && !(forceOwner || BYPASS || TEST_BYPASS || isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Checking access...</h2>
          <p className="text-sm text-white/50">Making sure you're allowed in</p>
        </div>
      </div>
    );
  }

  /* -------------------- Access denied -------------------- */
  if (!(forceOwner || BYPASS || TEST_BYPASS || isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black p-6">
        <div className="max-w-sm text-center">
          <div className="text-7xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-2">Admin Only</h2>
          <p className="text-white/60 mb-6">
            {error || "This area is just for platform administrators"}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-medium transition-colors w-full"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const activeTab = ALL_TABS.find(t => t.key === active);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      
      {/* Toast notifications */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border shadow-lg text-sm max-w-[90vw] animate-slide-in ${
          toast.type === "error" 
            ? "bg-red-600/90 border-red-500/50" 
            : "bg-emerald-600/90 border-emerald-500/50"
        }`}>
          <div className="flex items-center gap-3">
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gray-900/80 backdrop-blur">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
              Admin
            </h1>
          </div>
          
          {/* Quick stats for desktop */}
          {stats && (
            <div className="hidden lg:flex items-center gap-2 text-xs">
              <span className="px-2 py-1 bg-blue-500/20 rounded-full text-blue-300">
                👥 {stats.totalUsers}
              </span>
              <span className="px-2 py-1 bg-purple-500/20 rounded-full text-purple-300">
                🤖 {stats.activeJobs}
              </span>
              {stats.openTickets > 0 && (
                <span className="px-2 py-1 bg-red-500/20 rounded-full text-red-300">
                  🎫 {stats.openTickets}
                </span>
              )}
            </div>
          )}

          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm text-white/60 hover:text-white"
          >
            ← Exit
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-gray-900 pt-16">
          <div className="p-4 overflow-y-auto max-h-[calc(100vh-4rem)]">
            {TAB_SECTIONS.map((section) => (
              <div key={section.name} className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">{section.name}</h3>
                  <span className="text-xs text-white/40">{section.description}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {section.tabs.map((tab) => {
                    const isActive = active === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => navigateToTab(tab.key)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isActive
                            ? "bg-emerald-600/20 border-emerald-500/50"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <div className="text-2xl mb-1">{tab.emoji}</div>
                        <div className="font-medium text-sm">{tab.label}</div>
                        <div className="text-xs text-white/40 truncate">{tab.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:block w-64 shrink-0 border-r border-white/10 bg-black/20 p-4">
          <div className="space-y-6">
            {TAB_SECTIONS.map((section) => (
              <div key={section.name}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-medium">{section.name}</h3>
                  <span className="text-[10px] text-white/30">{section.description}</span>
                </div>
                <div className="space-y-1">
                  {section.tabs.map((tab) => {
                    const isActive = active === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => navigateToTab(tab.key)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                          isActive
                            ? "bg-emerald-600/20 border border-emerald-500/30"
                            : "hover:bg-white/5"
                        }`}
                        title={tab.description}
                      >
                        <span className="text-lg">{tab.emoji}</span>
                        <span className="flex-1 text-left">{tab.label}</span>
                        {tab.key === "tickets" && stats?.openTickets > 0 && (
                          <span className="text-xs bg-red-500/20 text-red-300 px-1.5 rounded-full">
                            {stats.openTickets}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 lg:p-6">
          
          {/* Welcome guide for first-time users */}
          {showGuide && (
            <div className="mb-6 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="text-3xl">👋</div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Welcome to the Admin Panel</h3>
                  <p className="text-sm text-white/70 mb-3">
                    Here's where you manage everything. The sidebar has all the tools you need.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-white/5 rounded-lg p-2">
                      <span className="text-emerald-400 font-medium block mb-1">👥 Users</span>
                      Manage accounts, handle support
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <span className="text-purple-400 font-medium block mb-1">💰 Money</span>
                      Withdrawals, fees, treasury
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <span className="text-amber-400 font-medium block mb-1">📢 Marketing</span>
                      Promos, social posts, announcements
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowGuide(false)}
                  className="text-white/40 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Quick stats for mobile */}
          {stats && (
            <div className="lg:hidden grid grid-cols-4 gap-2 mb-4 text-xs">
              <div className="bg-blue-500/10 rounded-lg p-2 text-center">
                <div className="text-blue-400 font-bold">{stats.totalUsers}</div>
                <div className="text-white/40">Users</div>
              </div>
              <div className="bg-purple-500/10 rounded-lg p-2 text-center">
                <div className="text-purple-400 font-bold">{stats.activeJobs}</div>
                <div className="text-white/40">Jobs</div>
              </div>
              <div className="bg-amber-500/10 rounded-lg p-2 text-center">
                <div className="text-amber-400 font-bold">{stats.waitlistCount}</div>
                <div className="text-white/40">Waitlist</div>
              </div>
              <div className="bg-emerald-500/10 rounded-lg p-2 text-center">
                <div className="text-emerald-400 font-bold">{stats.activePromos}</div>
                <div className="text-white/40">Promos</div>
              </div>
            </div>
          )}

          {/* Active tab */}
          {activeTab && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                <span className="text-3xl">{activeTab.emoji}</span>
                <div>
                  <h2 className="text-xl font-bold">{activeTab.label}</h2>
                  <p className="text-xs text-white/50">{activeTab.description}</p>
                </div>
              </div>
              {renderTab(activeTab)}
            </div>
          )}

          {/* Quick action buttons - common tasks */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => navigateToTab("withdrawals")}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-center"
            >
              <div className="text-2xl mb-1">💰</div>
              <div className="text-sm font-medium">Withdrawals</div>
              {stats?.pendingWithdrawals > 0 && (
                <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full mt-1 inline-block">
                  {stats.pendingWithdrawals} pending
                </span>
              )}
            </button>
            <button
              onClick={() => navigateToTab("tickets")}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-center"
            >
              <div className="text-2xl mb-1">🎫</div>
              <div className="text-sm font-medium">Support</div>
              {stats?.openTickets > 0 && (
                <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full mt-1 inline-block">
                  {stats.openTickets} open
                </span>
              )}
            </button>
            <button
              onClick={() => navigateToTab("promos")}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-center"
            >
              <div className="text-2xl mb-1">🎟️</div>
              <div className="text-sm font-medium">New Promo</div>
            </button>
            <button
              onClick={() => navigateToTab("announcements")}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-center"
            >
              <div className="text-2xl mb-1">📢</div>
              <div className="text-sm font-medium">Announce</div>
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-[10px] text-white/20">
            Admin Panel • v1.0 • {new Date().toLocaleDateString()}
          </div>
        </main>
      </div>
    </div>
  );
}
