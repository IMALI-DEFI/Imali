// src/components/AdminPanel.jsx
import React, { useEffect, useMemo, useState, useCallback, Suspense, lazy } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import BotAPI from "../utils/BotAPI";
import MarketingAutomation from './MarketingAutomation';

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
const TreasuryManagement = lazy(() => import("../admin/TreasuryManagement.jsx"));
const CexManagement = lazy(() => import("../admin/CexManagement.jsx"));
const StocksManagement = lazy(() => import("../admin/StocksManagement.jsx"));

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
    // Try the admin check endpoint first
    const data = await adminFetch("/api/admin/check");
    return data?.is_admin === true;
  } catch (error) {
    console.warn("[AdminPanel] Admin check failed:", error);
    
    // Fallback: check if user is in owner list via me endpoint
    try {
      const me = await adminFetch("/api/me");
      return me?.user?.is_admin === true || me?.user?.role === 'admin';
    } catch (e) {
      return false;
    }
  }
};

/* ==================================================================
   TAB CATEGORIES - Organized by function with descriptions
================================================================== */

const TAB_CATEGORIES = [
  {
    name: "📊 CORE OPERATIONS",
    description: "Essential platform management",
    tabs: [
      { key: "overview", label: "Overview", emoji: "✨", component: DashboardOverview, description: "Platform metrics and quick actions" },
      { key: "users", label: "Users", emoji: "👥", component: UserManagement, description: "Manage user accounts and permissions" },
      { key: "withdrawals", label: "Withdrawals", emoji: "💰", component: WithdrawalManagement, description: "Process and review withdrawal requests" },
      { key: "tickets", label: "Support", emoji: "🎫", component: SupportTickets, description: "Customer support tickets" },
    ]
  },
  {
    name: "🎯 MARKETING & GROWTH",
    description: "User acquisition and engagement",
    tabs: [
      { key: "automation", label: "🤖 Automation", emoji: "🤖", component: MarketingAutomation, description: "Automated marketing campaigns and social posting" },
      { key: "promos", label: "Promos", emoji: "🎟️", component: PromoManagement, description: "Create and manage promotional codes" },
      { key: "referrals", label: "Referrals", emoji: "🧲", component: ReferralAnalytics, description: "Referral program analytics" },
      { key: "waitlist", label: "Waitlist", emoji: "⏳", component: WaitlistManagement, description: "Manage waitlist and early access" },
      { key: "social", label: "Social", emoji: "📣", component: SocialManager, description: "Social media management" },
      { key: "announcements", label: "Announce", emoji: "📢", component: Announcements, description: "Platform announcements" },
    ]
  },
  {
    name: "💰 FINANCIAL",
    description: "Treasury and financial operations",
    tabs: [
      { key: "treasury", label: "Treasury", emoji: "🏦", component: TreasuryManagement, description: "Manage platform treasury" },
      { key: "fees", label: "Fee Distributor", emoji: "💸", component: FeeDistributor, description: "Process and distribute fees" },
      { key: "buyback", label: "Buyback", emoji: "♻️", component: BuyBackDashboard, description: "Token buyback operations" },
      { key: "token", label: "Token Mgmt", emoji: "🪙", component: TokenManagement, description: "Token minting and burning" },
    ]
  },
  {
    name: "📈 TRADING OPERATIONS",
    description: "Bot and trading management",
    tabs: [
      { key: "cex", label: "CEX Funding", emoji: "🏧", component: CexManagement, description: "Centralized exchange funding" },
      { key: "stocks", label: "Stocks", emoji: "📈", component: StocksManagement, description: "Stock trading operations" },
      { key: "nfts", label: "NFTs", emoji: "🧬", component: NFTManagement, description: "NFT marketplace management" },
    ]
  },
  {
    name: "🔧 SYSTEM",
    description: "Platform administration",
    tabs: [
      { key: "access", label: "Access Control", emoji: "🔐", component: AccessControl, description: "Admin permissions and roles" },
      { key: "audit", label: "Audit Logs", emoji: "📋", component: AuditLogs, description: "System audit trail" },
      { key: "health", label: "System", emoji: "🏥", component: SystemHealth, description: "System health monitoring" },
    ]
  }
];

// Flatten tabs for easy access
const ALL_TABS = TAB_CATEGORIES.flatMap(cat => cat.tabs);

/* ==================================================================
   QUICK ACTION CARDS
================================================================== */
const QuickActionCard = ({ icon, title, description, onClick, badge }) => (
  <button
    onClick={onClick}
    className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 text-left transition-all hover:scale-[1.02]"
  >
    <div className="flex items-start justify-between">
      <span className="text-2xl mb-2">{icon}</span>
      {badge && (
        <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
          {badge}
        </span>
      )}
    </div>
    <h4 className="font-semibold text-sm mb-1">{title}</h4>
    <p className="text-xs text-white/50">{description}</p>
  </button>
);

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
  const [showQuickGuide, setShowQuickGuide] = useState(true);

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

    const checkAccess = async () => {
      try {
        // Development bypass
        if (forceOwner || BYPASS || TEST_BYPASS) {
          if (mounted) setIsAdmin(true);
          setChecking(false);
          return;
        }

        // Check if user is logged in
        const token = BotAPI.getToken?.() || localStorage.getItem('token');
        if (!token) {
          if (mounted) {
            setError("Please log in to continue.");
            setIsAdmin(false);
          }
          setChecking(false);
          return;
        }

        // Check admin status
        const admin = await checkAdminStatus();
        
        if (mounted) {
          setIsAdmin(admin);
          if (!admin) {
            setError("You don't have admin privileges.");
          }
        }
      } catch (e) {
        console.error("[AdminPanel] Access check error:", e);
        if (mounted) {
          setError(e?.message || "Failed to verify admin access.");
          setIsAdmin(false);
        }
      } finally {
        if (mounted) setChecking(false);
      }
    };

    checkAccess();
  }, [account, forceOwner, BYPASS, TEST_BYPASS]);

  /* -------------------- Fetch dashboard stats -------------------- */
  useEffect(() => {
    const allowAccess = forceOwner || BYPASS || TEST_BYPASS || isAdmin;
    if (!allowAccess) return;

    let mounted = true;

    const fetchStats = async () => {
      try {
        const [users, withdrawals, tickets, promos, waitlist, automation] = await Promise.allSettled([
          adminFetch("/api/admin/users?limit=1").catch(() => ({ users: [] })),
          adminFetch("/api/admin/withdrawals?status=pending").catch(() => ({ withdrawals: [] })),
          adminFetch("/api/admin/support/tickets?status=open").catch(() => ({ tickets: [] })),
          adminFetch("/api/admin/promo/list").catch(() => ({ promos: [] })),
          adminFetch("/api/admin/waitlist").catch(() => ({ waitlist: [] })),
          adminFetch("/api/admin/automation/jobs").catch(() => ({ stats: {} })),
        ]);

        if (!mounted) return;

        const automationData = automation.status === "fulfilled" ? automation.value : { stats: {} };
        
        setStats({
          totalUsers: users.status === "fulfilled" ? (users.value?.users?.length || 0) : 0,
          pendingWithdrawals: withdrawals.status === "fulfilled" ? (withdrawals.value?.withdrawals?.length || 0) : 0,
          openTickets: tickets.status === "fulfilled" ? (tickets.value?.tickets?.length || 0) : 0,
          activePromos: promos.status === "fulfilled" ? (promos.value?.promos?.filter(p => p.active)?.length || 0) : 0,
          waitlistCount: waitlist.status === "fulfilled" ? (waitlist.value?.waitlist?.length || 0) : 0,
          activeJobs: automationData.stats?.active_jobs || 0,
          totalPosts: automationData.stats?.total_posts || 0,
        });
      } catch (err) {
        console.error("[AdminPanel] Stats fetch error:", err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);

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

  const navigateToTab = useCallback((tabKey) => {
    setActive(tabKey);
    setShowQuickGuide(false);
  }, []);

  /* -------------------- Tab renderer -------------------- */
  const renderTab = useCallback((tab) => {
    const commonProps = {
      apiBase: API_BASE,
      account,
      onAction: () => {
        // Refresh data instead of full reload
        window.location.reload();
      },
      showToast,
      busyAction,
      handleAction,
    };

    const Component = tab.component;
    return (
      <TabErrorBoundary tabName={tab.label} key={tab.key}>
        <Suspense fallback={<TabLoader name={tab.label} />}>
          <Component {...commonProps} />
        </Suspense>
      </TabErrorBoundary>
    );
  }, [account, busyAction, handleAction, showToast]);

  /* -------------------- Access control -------------------- */
  const allowAccess = forceOwner || BYPASS || TEST_BYPASS || isAdmin;

  if (checking && !allowAccess) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-950 text-white">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Verifying admin access…</h2>
          <p className="text-sm text-white/40 mt-2">Checking permissions</p>
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
          </div>
        </div>
      </div>
    );
  }

  const activeTab = ALL_TABS.find(t => t.key === active);

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-black" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl opacity-25 bg-cyan-500/30" />
      <div className="pointer-events-none absolute top-20 -right-16 h-96 w-96 rounded-full blur-3xl opacity-20 bg-purple-500/30" />

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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-emerald-300 to-purple-300 bg-clip-text text-transparent">
                IMALI Admin
              </h1>
              {stats && (
                <div className="hidden lg:flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-blue-500/20 rounded-full text-blue-300" title="Total Users">
                    👥 {stats.totalUsers}
                  </span>
                  <span className="px-2 py-1 bg-purple-500/20 rounded-full text-purple-300" title="Active Jobs">
                    🤖 {stats.activeJobs}
                  </span>
                  {stats.openTickets > 0 && (
                    <span className="px-2 py-1 bg-red-500/20 rounded-full text-red-300" title="Open Tickets">
                      🎫 {stats.openTickets}
                    </span>
                  )}
                  {stats.pendingWithdrawals > 0 && (
                    <span className="px-2 py-1 bg-orange-500/20 rounded-full text-orange-300" title="Pending Withdrawals">
                      💰 {stats.pendingWithdrawals}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                ← Dashboard
              </button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          {stats && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="text-white/40">Quick stats:</span>
              <span className="text-emerald-400">📊 {stats.totalPosts || 0} posts</span>
              <span className="text-yellow-400">⏳ {stats.waitlistCount} waitlist</span>
              <span className="text-blue-400">🎟️ {stats.activePromos} promos</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        
        {/* Quick Guide - Collapsible */}
        {showQuickGuide && (
          <div className="mb-6 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <span>🚀</span> Welcome to the Admin Panel
                </h3>
                <p className="text-sm text-white/70 mb-3">
                  Use the categorized tabs below to manage different aspects of the platform:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white/5 rounded-lg p-2">
                    <span className="text-emerald-400 font-bold">📊 Core Operations</span>
                    <p className="text-white/50 mt-1">User management, withdrawals, support tickets</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <span className="text-purple-400 font-bold">🎯 Marketing & Growth</span>
                    <p className="text-white/50 mt-1">Automated campaigns, promos, referrals, social media</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <span className="text-yellow-400 font-bold">💰 Financial</span>
                    <p className="text-white/50 mt-1">Treasury, fee distribution, buybacks</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowQuickGuide(false)}
                className="text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Category Navigation */}
        <div className="mb-6 space-y-4">
          {TAB_CATEGORIES.map((category) => (
            <div key={category.name} className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white/70">{category.name}</h2>
                <span className="text-[10px] text-white/30">{category.description}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {category.tabs.map((tab) => {
                  const isActive = active === tab.key;
                  let badge = null;
                  if (tab.key === "tickets" && stats?.openTickets > 0) {
                    badge = stats.openTickets;
                  } else if (tab.key === "withdrawals" && stats?.pendingWithdrawals > 0) {
                    badge = stats.pendingWithdrawals;
                  } else if (tab.key === "automation" && stats?.activeJobs > 0) {
                    badge = `${stats.activeJobs} jobs`;
                  }

                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActive(tab.key)}
                      className={`group relative px-3 py-2 rounded-xl border text-xs font-medium transition-all
                        ${isActive
                          ? "bg-white/15 border-white/30 shadow-lg"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                      title={tab.description}
                    >
                      <span className="mr-1">{tab.emoji}</span>
                      <span>{tab.label}</span>
                      {badge && (
                        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-red-500 text-[8px] font-bold text-white">
                          {badge}
                        </span>
                      )}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 rounded text-[10px] text-white/70 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10">
                        {tab.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Active Tab Panel */}
        <section className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-4 sm:p-6 shadow-xl min-h-[500px]">
          {activeTab && (
            <>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
                <span className="text-2xl">{activeTab.emoji}</span>
                <div>
                  <h2 className="text-xl font-bold">{activeTab.label}</h2>
                  <p className="text-xs text-white/50">{activeTab.description}</p>
                </div>
              </div>
              {renderTab(activeTab)}
            </>
          )}
        </section>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-white/50 mb-3">⚡ Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickActionCard
              icon="💰"
              title="Process Fees"
              description="Run fee distribution (dry run first)"
              onClick={() => handleProcessFees(true)}
            />
            <QuickActionCard
              icon="🤖"
              title="Run Automation"
              description="Trigger marketing campaigns"
              onClick={() => navigateToTab("automation")}
              badge={stats?.activeJobs ? `${stats.activeJobs} active` : null}
            />
            <QuickActionCard
              icon="📢"
              title="New Announcement"
              description="Create platform announcement"
              onClick={() => navigateToTab("announcements")}
            />
            <QuickActionCard
              icon="🎟️"
              title="Create Promo"
              description="Generate promo code"
              onClick={() => navigateToTab("promos")}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-wrap gap-3 justify-between items-center text-[10px] text-white/30">
          <div className="flex gap-2">
            <span>API: {API_BASE}</span>
            <span>•</span>
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="hover:text-white/50 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </main>
    </div>
  );
}
