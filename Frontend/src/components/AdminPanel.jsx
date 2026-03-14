import React, {
  useEffect,
  useState,
  useCallback,
  Suspense,
  lazy,
  useMemo,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import BotAPI from "../utils/BotAPI";

/* =========================================================
   ERROR BOUNDARY
========================================================= */
class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      `[AdminPanel] Tab "${this.props.tabName}" crashed:`,
      error,
      errorInfo
    );
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
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <div className="mb-4 text-5xl">💥</div>
          <h3 className="mb-2 text-xl font-bold text-red-300">
            {this.props.tabName} crashed
          </h3>
          <p className="mx-auto mb-5 max-w-xl text-sm leading-6 text-white/70">
            {this.state.error?.message ||
              "Something went wrong while loading this section."}
          </p>
          <button
            onClick={this.handleReset}
            className="rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400"
          >
            Reload This Section ({this.state.retryCount})
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/* =========================================================
   LOADER
========================================================= */
const TabLoader = ({ name }) => (
  <div className="flex min-h-[320px] flex-col items-center justify-center">
    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
    <p className="text-sm text-white/60">Loading {name}...</p>
  </div>
);

/* =========================================================
   LAZY MODULES
========================================================= */
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

/* =========================================================
   CONFIG
========================================================= */
const API_BASE = (
  process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com"
).replace(/\/+$/, "");

const getAuthToken = () => BotAPI.getToken();

async function adminFetch(endpoint, options = {}, retries = 2) {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found.");

  const safeEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE}${safeEndpoint}`, {
        method: options.method || "GET",
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || `Request failed (${response.status})`
        );
      }

      return data;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1))
        );
      }
    }
  }

  throw lastError;
}

async function checkAdminStatus() {
  try {
    const data = await adminFetch("/api/admin/check", { method: "GET" });
    return data?.is_admin === true;
  } catch (error) {
    console.warn("[AdminPanel] Admin check failed:", error);
    return false;
  }
}

/* =========================================================
   TAB CONFIG
========================================================= */
const TAB_SECTIONS = [
  {
    id: "dashboard",
    name: "Dashboard",
    emoji: "📊",
    description: "See the overall health and activity of your platform.",
    tabs: [
      {
        key: "overview",
        label: "Overview",
        emoji: "✨",
        component: DashboardOverview,
        description: "Main platform totals and quick status summary.",
        usageTitle: "Start here first",
        usageText:
          "This page gives you the big-picture view of your platform. Use it to quickly see users, revenue activity, open tickets, waitlist interest, and automation health.",
        whenToUse:
          "Use this when you first open the admin panel or when you want a quick check of how everything is doing.",
        commonActions: [
          "Refresh platform numbers",
          "Review top-level activity",
          "Check if jobs and bots are active",
        ],
        actions: [
          {
            id: "refresh",
            label: "Refresh Overview",
            icon: "🔄",
            endpoint: "/api/admin/metrics",
            method: "GET",
          },
        ],
      },
      {
        key: "health",
        label: "System Health",
        emoji: "🏥",
        component: SystemHealth,
        description: "Check whether services, bots, and endpoints are healthy.",
        usageTitle: "Use this for troubleshooting",
        usageText:
          "This page helps you confirm whether the backend, automation jobs, bots, and integrations are working properly.",
        whenToUse:
          "Use this when something seems slow, broken, disconnected, or not updating.",
        commonActions: [
          "Check service status",
          "Verify backend health",
          "Confirm integrations are responding",
        ],
        actions: [
          {
            id: "refresh",
            label: "Refresh Health",
            icon: "🔄",
            endpoint: "/api/health/detailed",
            method: "GET",
          },
        ],
      },
    ],
  },
  {
    id: "users",
    name: "Users",
    emoji: "👥",
    description: "Manage users, support issues, and waitlist activity.",
    tabs: [
      {
        key: "users",
        label: "All Users",
        emoji: "👥",
        component: UserManagement,
        description: "View user accounts, statuses, and account details.",
        usageTitle: "Manage platform members",
        usageText:
          "Use this page to find users, review their accounts, check their access level, and make user-related decisions.",
        whenToUse:
          "Use this when you need to look up a specific user or review your user base.",
        commonActions: [
          "Review user accounts",
          "Check tiers and access",
          "Investigate individual user issues",
        ],
        actions: [
          {
            id: "refresh",
            label: "Refresh Users",
            icon: "🔄",
            endpoint: "/api/admin/users",
            method: "GET",
          },
        ],
      },
      {
        key: "tickets",
        label: "Support",
        emoji: "🎫",
        component: SupportTickets,
        description: "Review and manage support requests.",
        usageTitle: "Help users faster",
        usageText:
          "This page is for support questions, reported issues, and unresolved problems from users.",
        whenToUse:
          "Use this when customers are having problems or when you want to review open support requests.",
        commonActions: [
          "Review support tickets",
          "Look for unresolved issues",
          "Track support workload",
        ],
        actions: [
          {
            id: "refresh",
            label: "Refresh Tickets",
            icon: "🔄",
            endpoint: "/api/admin/support/tickets",
            method: "GET",
          },
        ],
      },
      {
        key: "waitlist",
        label: "Waitlist",
        emoji: "⏳",
        component: WaitlistManagement,
        description: "Review people waiting to join your platform.",
        usageTitle: "Track early interest",
        usageText:
          "This page shows who is waiting for access or who expressed interest before being onboarded fully.",
        whenToUse:
          "Use this when you are reviewing demand, planning outreach, or promoting early access.",
        commonActions: [
          "Check how many people are waiting",
          "Review new interest",
          "Use waitlist growth as traction",
        ],
        actions: [
          {
            id: "refresh",
            label: "Refresh Waitlist",
            icon: "🔄",
            endpoint: "/api/admin/waitlist",
            method: "GET",
          },
        ],
      },
    ],
  },
  {
    id: "money",
    name: "Money",
    emoji: "💰",
    description: "Handle financial operations and treasury controls.",
    tabs: [
      {
        key: "withdrawals",
        label: "Withdrawals",
        emoji: "💸",
        component: WithdrawalManagement,
        description: "Review requests for money leaving the platform.",
        usageTitle: "Approve money movement carefully",
        usageText:
          "Use this section to review withdrawal requests and make sure payouts are valid before funds leave the platform.",
        whenToUse:
          "Use this when users request withdrawals or when you want to audit money-out activity.",
        commonActions: [
          "Review pending withdrawals",
          "Approve or reject requests",
          "Track withdrawal volume",
        ],
        actions: [
          {
            id: "refresh",
            label: "Refresh Withdrawals",
            icon: "🔄",
            endpoint: "/api/admin/withdrawals",
            method: "GET",
          },
        ],
      },
      {
        key: "fees",
        label: "Fees",
        emoji: "💳",
        component: FeeDistributor,
        description: "Manage fee routing and distribution activity.",
        usageTitle: "Understand where fees are going",
        usageText:
          "This page helps you track platform fees and how those fees are being distributed through your system.",
        whenToUse:
          "Use this when you want to review platform earnings or inspect fee splits.",
        commonActions: [
          "Review fee history",
          "Track distributions",
          "Audit payment routing",
        ],
        actions: [
          {
            id: "history",
            label: "Fee History",
            icon: "📜",
            endpoint: "/api/billing/fee-history",
            method: "GET",
          },
        ],
      },
      {
        key: "treasury",
        label: "Treasury",
        emoji: "🏦",
        component: TreasuryManagement,
        description: "Review platform-held balances and reserves.",
        usageTitle: "Manage reserves and funds",
        usageText:
          "This area helps you monitor treasury balances and platform-held funds in one place.",
        whenToUse:
          "Use this when you want to review reserves, treasury totals, or protected funds.",
        commonActions: [
          "Check treasury balances",
          "Review reserve totals",
          "Understand held funds",
        ],
        actions: [
          {
            id: "stats",
            label: "Treasury Stats",
            icon: "📊",
            endpoint: "/api/admin/treasury/stats",
            method: "GET",
          },
        ],
      },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    emoji: "📢",
    description: "Grow your audience with posts, promos, and outreach tools.",
    tabs: [
      {
        key: "automation",
        label: "Automation",
        emoji: "🤖",
        component: MarketingAutomationTab,
        description: "Schedule and test automated social or messaging activity.",
        usageTitle: "Create repeatable marketing without doing everything manually",
        usageText:
          "This section is for recurring campaigns, scheduled post processing, and testing your connected posting channels like Telegram, Twitter/X, and Discord.",
        whenToUse:
          "Use this when you want to automate recurring updates, test posting channels, or process queued marketing jobs.",
        commonActions: [
          "Send test messages",
          "Run scheduled jobs now",
          "Verify Telegram, X, or Discord integrations",
        ],
        actions: [
          {
            id: "test",
            label: "Send Test Message",
            icon: "🧪",
            endpoint: "/api/admin/social/test",
            method: "POST",
          },
          {
            id: "status",
            label: "Refresh Integration Status",
            icon: "🔄",
            endpoint: "/api/admin/social/status",
            method: "GET",
          },
          {
            id: "process",
            label: "Process Scheduled Jobs",
            icon: "⏰",
            endpoint: "/api/admin/social/process-scheduled",
            method: "POST",
          },
        ],
      },
      {
        key: "promos",
        label: "Promo Codes",
        emoji: "🎟️",
        component: PromoManagement,
        description: "Create and manage discount or campaign codes.",
        usageTitle: "Run offers and promotions",
        usageText:
          "Use promo codes to create discounts, referral incentives, or special marketing campaigns.",
        whenToUse:
          "Use this when you want to launch a discount, reward early users, or support a campaign.",
        commonActions: [
          "Review active promo codes",
          "Create new discount codes",
          "Track active offers",
        ],
        actions: [
          {
            id: "refresh",
            label: "Refresh Promo Codes",
            icon: "🔄",
            endpoint: "/api/admin/promo/list",
            method: "GET",
          },
          {
            id: "create",
            label: "Create Promo",
            icon: "➕",
            endpoint: "/api/admin/promo/create",
            method: "POST",
          },
        ],
      },
      {
        key: "announcements",
        label: "Announcements",
        emoji: "📣",
        component: Announcements,
        description: "Send updates and important messages to users.",
        usageTitle: "Share important updates clearly",
        usageText:
          "This section is for sending platform news, alerts, launch notices, and important updates to your users.",
        whenToUse:
          "Use this when you need users to know about launches, maintenance, or major changes.",
        commonActions: [
          "Publish updates",
          "Announce launches",
          "Communicate maintenance or outages",
        ],
        actions: [
          {
            id: "refresh",
            label: "Refresh Announcements",
            icon: "🔄",
            endpoint: "/api/admin/announcements",
            method: "GET",
          },
        ],
      },
      {
        key: "referrals",
        label: "Referrals",
        emoji: "🧲",
        component: ReferralAnalytics,
        description: "Track invites and referral performance.",
        usageTitle: "See who is helping you grow",
        usageText:
          "Use this page to understand how referrals are performing and who is driving signups or rewards.",
        whenToUse:
          "Use this when you want to review referral traction or process referral payouts.",
        commonActions: [
          "Check referral stats",
          "Review referral performance",
          "Trigger referral payout processing",
        ],
        actions: [
          {
            id: "stats",
            label: "Referral Stats",
            icon: "📊",
            endpoint: "/api/admin/referrals/stats",
            method: "GET",
          },
          {
            id: "process",
            label: "Process Payouts",
            icon: "💰",
            endpoint: "/api/admin/referrals/process-payouts",
            method: "POST",
          },
        ],
      },
      {
        key: "social",
        label: "Social Manager",
        emoji: "📱",
        component: SocialManager,
        description: "Review connected social posting channels and activity.",
        usageTitle: "Manage your posting channels in one place",
        usageText:
          "This page is for reviewing social activity, platform status, and connected social channels.",
        whenToUse:
          "Use this when you want to inspect social integrations or your post pipeline.",
        commonActions: [
          "Check platform connection status",
          "Review posts",
          "Inspect social analytics",
        ],
        actions: [
          {
            id: "refresh",
            label: "Refresh Social Posts",
            icon: "🔄",
            endpoint: "/api/admin/social/posts",
            method: "GET",
          },
          {
            id: "platforms",
            label: "Platform Status",
            icon: "🔌",
            endpoint: "/api/admin/social/platforms/status",
            method: "GET",
          },
          {
            id: "stats",
            label: "Social Analytics",
            icon: "📊",
            endpoint: "/api/admin/social/stats",
            method: "GET",
          },
        ],
      },
    ],
  },
  {
    id: "advanced",
    name: "Advanced",
    emoji: "⚙️",
    description: "Technical controls for token, access, logs, and exchange tools.",
    tabs: [
      {
        key: "token",
        label: "Token",
        emoji: "🪙",
        component: TokenManagement,
        description: "Manage token supply and token actions.",
        usageTitle: "Control token-related operations",
        usageText:
          "Use this section for token stats, minting, burning, and supply-related actions.",
        whenToUse:
          "Use this when you are managing token economics or supply operations.",
        commonActions: [
          "Review token stats",
          "Mint tokens",
          "Burn tokens",
        ],
        actions: [
          {
            id: "stats",
            label: "Token Stats",
            icon: "📊",
            endpoint: "/api/admin/token/stats",
            method: "GET",
          },
          {
            id: "mint",
            label: "Mint Token",
            icon: "🪙",
            endpoint: "/api/admin/token/mint",
            method: "POST",
          },
          {
            id: "burn",
            label: "Burn Token",
            icon: "🔥",
            endpoint: "/api/admin/token/burn",
            method: "POST",
          },
        ],
      },
      {
        key: "buyback",
        label: "Buyback",
        emoji: "♻️",
        component: BuyBackDashboard,
        description: "Manage token buyback activity and controls.",
        usageTitle: "Support token buyback operations",
        usageText:
          "Use this area to monitor buyback behavior and manually trigger buyback activity if needed.",
        whenToUse:
          "Use this when reviewing token support operations or buyback timing.",
        commonActions: [
          "Review buyback stats",
          "Trigger buybacks",
          "Monitor buyback behavior",
        ],
        actions: [
          {
            id: "stats",
            label: "Buyback Stats",
            icon: "📊",
            endpoint: "/api/admin/buyback/stats",
            method: "GET",
          },
          {
            id: "trigger",
            label: "Run Buyback",
            icon: "⚡",
            endpoint: "/api/admin/buyback/trigger",
            method: "POST",
          },
        ],
      },
      {
        key: "nfts",
        label: "NFTs",
        emoji: "🧬",
        component: NFTManagement,
        description: "Manage NFT items, access, and NFT tiers.",
        usageTitle: "Control NFT-based access and rewards",
        usageText:
          "This section helps you manage NFTs that are tied to membership, utility, or rewards.",
        whenToUse:
          "Use this when you need to review NFT access, mint NFTs, or manage NFT inventory.",
        commonActions: [
          "Review NFT list",
          "Mint NFTs",
          "Manage NFT tiers",
        ],
        actions: [
          {
            id: "list",
            label: "List NFTs",
            icon: "📋",
            endpoint: "/api/admin/nfts",
            method: "GET",
          },
          {
            id: "mint",
            label: "Mint NFT",
            icon: "🪙",
            endpoint: "/api/admin/nfts/mint",
            method: "POST",
          },
        ],
      },
      {
        key: "cex",
        label: "CEX",
        emoji: "🏧",
        component: CexManagement,
        description: "Manage centralized exchange information and balances.",
        usageTitle: "Review exchange-side activity",
        usageText:
          "Use this area to review centralized exchange balances and connected exchange controls.",
        whenToUse:
          "Use this when checking exchange balances, exchange settings, or exchange integrations.",
        commonActions: [
          "Check balances",
          "Review connection state",
          "Inspect CEX operations",
        ],
        actions: [
          {
            id: "balances",
            label: "Fetch Balances",
            icon: "⚖️",
            endpoint: "/api/admin/cex/balances",
            method: "GET",
          },
        ],
      },
      {
        key: "stocks",
        label: "Stocks",
        emoji: "📈",
        component: StocksManagement,
        description: "Manage stock-related trading tools and positions.",
        usageTitle: "Handle stock-side operations",
        usageText:
          "This page is for stock-based positions, stock automation, or stock-related admin tools.",
        whenToUse:
          "Use this when you want to inspect or manage stock-side features of the platform.",
        commonActions: [
          "Review positions",
          "Inspect stock trading activity",
          "Monitor stock-side tools",
        ],
        actions: [
          {
            id: "positions",
            label: "Load Positions",
            icon: "📊",
            endpoint: "/api/admin/stocks/positions",
            method: "GET",
          },
        ],
      },
      {
        key: "audit",
        label: "Audit Logs",
        emoji: "📋",
        component: AuditLogs,
        description: "Review admin actions and important system events.",
        usageTitle: "See what changed and when",
        usageText:
          "Use this page to review actions taken inside the admin system and inspect history for troubleshooting or accountability.",
        whenToUse:
          "Use this when you want to verify changes or review action history.",
        commonActions: [
          "Review change history",
          "Audit admin actions",
          "Investigate when something changed",
        ],
        actions: [
          {
            id: "refresh",
            label: "Refresh Logs",
            icon: "🔄",
            endpoint: "/api/admin/audit-logs",
            method: "GET",
          },
        ],
      },
      {
        key: "access",
        label: "Permissions",
        emoji: "🔐",
        component: AccessControl,
        description: "Review admin access and permission controls.",
        usageTitle: "Control who can do what",
        usageText:
          "This page is for admin access, role review, and permissions management.",
        whenToUse:
          "Use this when checking who should or should not have access to sensitive admin tools.",
        commonActions: [
          "Review access levels",
          "Check current admin state",
          "Inspect permissions",
        ],
        actions: [
          {
            id: "check",
            label: "Check Access",
            icon: "🔍",
            endpoint: "/api/admin/check",
            method: "GET",
          },
        ],
      },
    ],
  },
];

const ALL_TABS = TAB_SECTIONS.flatMap((section) => section.tabs);

/* =========================================================
   UI SMALL COMPONENTS
========================================================= */
function SidebarButton({ tab, isActive, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full rounded-2xl border px-3 py-3 text-left transition-all duration-200",
        isActive
          ? "border-emerald-400/40 bg-gradient-to-r from-emerald-500/15 to-cyan-500/10 shadow-[0_0_20px_rgba(16,185,129,0.12)]"
          : "border-white/5 bg-transparent hover:border-white/10 hover:bg-white/5",
      ].join(" ")}
      title={tab.description}
    >
      <div className="flex items-start gap-3">
        <span className="pt-0.5 text-xl">{tab.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-white">
              {tab.label}
            </span>
            {badge ? (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-5 text-white/50">
            {tab.description}
          </p>
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
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
      ) : (
        <span>{action.icon}</span>
      )}
      <span>{action.label}</span>
    </button>
  );
}

function StatCard({ label, value, tone = "emerald" }) {
  const tones = {
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    purple: "border-purple-500/20 bg-purple-500/10 text-purple-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.emerald}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-white/60">{label}</div>
    </div>
  );
}

function PageGuide({ activeTab }) {
  return (
    <section className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-2xl">
          {activeTab.emoji}
        </div>
        <div>
          <h3 className="text-lg font-bold text-cyan-300">
            {activeTab.usageTitle || "How to use this page"}
          </h3>
          <p className="text-sm text-white/65">{activeTab.description}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h4 className="mb-2 text-sm font-semibold text-white">What this page does</h4>
          <p className="text-sm leading-6 text-white/70">
            {activeTab.usageText || "This page helps you manage this section."}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h4 className="mb-2 text-sm font-semibold text-white">When to use it</h4>
          <p className="text-sm leading-6 text-white/70">
            {activeTab.whenToUse || "Use this when you need to work in this area."}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h4 className="mb-2 text-sm font-semibold text-white">Common actions</h4>
          <div className="space-y-2">
            {(activeTab.commonActions || []).map((item) => (
              <div
                key={item}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/75"
              >
                • {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */
export default function AdminPanel({ forceOwner = false }) {
  const { account } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState("overview");
  const [tabResetKey, setTabResetKey] = useState(0);
  const [busyAction, setBusyAction] = useState({});
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [actionHistory, setActionHistory] = useState([]);
  const [socialStatus, setSocialStatus] = useState(null);

  /* automation composer state */
  const [testMessage, setTestMessage] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("telegram");

  const isDevelopment =
    process.env.NODE_ENV === "development" ||
    window.location.hostname === "localhost";
  const BYPASS = isDevelopment && process.env.REACT_APP_BYPASS_OWNER === "1";
  const TEST_BYPASS = location.pathname.startsWith("/test/admin");
  const allowAccess = forceOwner || BYPASS || TEST_BYPASS || isAdmin;

  const activeTab = useMemo(() => {
    return ALL_TABS.find((tab) => tab.key === active) || ALL_TABS[0];
  }, [active]);

  const showToast = useCallback((message, type = "success", duration = 3500) => {
    setToast({ message, type });

    if (window.__imaliToastTimer) {
      clearTimeout(window.__imaliToastTimer);
    }

    window.__imaliToastTimer = setTimeout(() => {
      setToast(null);
    }, duration);
  }, []);

  const logAction = useCallback((actionName, status, details = {}) => {
    setActionHistory((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        action: actionName,
        status,
        timestamp: new Date().toISOString(),
        details,
      },
      ...prev.slice(0, 29),
    ]);
  }, []);

  const resetCurrentTab = useCallback(() => {
    setTabResetKey((prev) => prev + 1);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await adminFetch("/api/admin/metrics", { method: "GET" });

      setStats({
        totalUsers: data?.users?.total || 0,
        pendingWithdrawals: data?.revenue?.pending_withdrawals || 0,
        openTickets: data?.tickets?.length || 0,
        activePromos: data?.promos?.length || 0,
        waitlistCount: data?.waitlist?.length || 0,
        activeJobs: data?.automation?.active_jobs || 0,
        totalRevenue: data?.revenue?.total_fees || 0,
        activeBots: data?.bots?.active || 0,
      });
    } catch (err) {
      console.error("[AdminPanel] Stats fetch error:", err);
    }
  }, []);

  const fetchSocialStatus = useCallback(async () => {
    try {
      const data = await adminFetch("/api/admin/social/status", {
        method: "GET",
      });
      setSocialStatus(data);
    } catch (error) {
      console.error("[AdminPanel] Failed to fetch social status:", error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      try {
        if (forceOwner || BYPASS || TEST_BYPASS) {
          if (mounted) {
            setIsAdmin(true);
            setChecking(false);
          }
          return;
        }

        const token = getAuthToken();
        if (!token) {
          if (mounted) {
            setError("Please log in first.");
            setChecking(false);
          }
          return;
        }

        const admin = await checkAdminStatus();

        if (!mounted) return;

        setIsAdmin(admin);
        if (!admin) {
          setError("You do not have admin access.");
        }
      } catch (e) {
        console.error("[AdminPanel] Access check error:", e);
        if (mounted) setError("Could not verify admin permissions.");
      } finally {
        if (mounted) setChecking(false);
      }
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [forceOwner, BYPASS, TEST_BYPASS]);

  useEffect(() => {
    if (!allowAccess) return;
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [allowAccess, fetchStats]);

  useEffect(() => {
    if (activeTab.key === "automation" || activeTab.key === "social") {
      fetchSocialStatus();
    }
  }, [activeTab.key, fetchSocialStatus]);

  const handleAction = useCallback(
    async (action, payload = null, overrideEndpoint = null) => {
      const endpoint = overrideEndpoint || action?.endpoint;
      const method = action?.method || "POST";
      const actionKey = `${activeTab.key}:${action?.id || "custom"}`;
      const actionName = `${activeTab.label} ${action?.label || action?.id || "Action"}`;

      if (!endpoint) {
        showToast("No endpoint is configured for this action.", "error");
        throw new Error("No endpoint configured.");
      }

      try {
        setBusyAction((prev) => ({ ...prev, [actionKey]: true }));
        logAction(actionName, "started", { endpoint, method, payload });

        let bodyPayload = payload;

        if (action?.id === "test" && activeTab.key === "automation") {
          bodyPayload = {
            platform: selectedPlatform,
            message:
              testMessage?.trim() ||
              `Test post from IMALI Admin Panel at ${new Date().toLocaleString()}`,
          };
        }

        const data = await adminFetch(endpoint, {
          method,
          ...(bodyPayload ? { body: JSON.stringify(bodyPayload) } : {}),
        });

        logAction(actionName, "success", { data });
        showToast(`${action.label} completed successfully.`, "success");

        if (
          action?.id === "refresh" ||
          action?.id === "stats" ||
          action?.id === "list" ||
          action?.id === "status"
        ) {
          fetchStats();
        }

        if (activeTab.key === "automation" || activeTab.key === "social") {
          fetchSocialStatus();
        }

        return data;
      } catch (err) {
        const msg = err?.message || `${actionName} failed.`;
        logAction(actionName, "error", { error: msg });
        showToast(msg, "error");
        throw err;
      } finally {
        setBusyAction((prev) => {
          const next = { ...prev };
          delete next[actionKey];
          return next;
        });
      }
    },
    [
      activeTab,
      fetchSocialStatus,
      fetchStats,
      logAction,
      selectedPlatform,
      showToast,
      testMessage,
    ]
  );

  const handleTestSocial = useCallback(
    async (platformOverride = null) => {
      const platform = platformOverride || selectedPlatform;
      const actionKey = `testSocial:${platform}`;

      try {
        setBusyAction((prev) => ({ ...prev, [actionKey]: true }));

        const result = await adminFetch("/api/admin/social/test", {
          method: "POST",
          body: JSON.stringify({
            platform,
            message:
              testMessage?.trim() ||
              `Test post from IMALI Admin Panel at ${new Date().toLocaleString()}`,
          }),
        });

        if (result?.success === false) {
          throw new Error(result?.error || `Failed to send test to ${platform}`);
        }

        showToast(`Test message sent to ${platform}.`, "success");
        fetchSocialStatus();
      } catch (error) {
        showToast(error?.message || `Error sending to ${platform}`, "error");
      } finally {
        setBusyAction((prev) => {
          const next = { ...prev };
          delete next[actionKey];
          return next;
        });
      }
    },
    [fetchSocialStatus, selectedPlatform, showToast, testMessage]
  );

  const navigateToTab = useCallback((tabKey) => {
    setActive(tabKey);
    setMobileMenuOpen(false);
    setTabResetKey(0);
  }, []);

  const renderTab = useCallback(
    (tab) => {
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
              onAction={(actionConfig, payload) =>
                handleAction(actionConfig, payload)
              }
              stats={stats}
              refreshStats={fetchStats}
              resetTab={resetCurrentTab}
              actionHistory={actionHistory}
            />
          </Suspense>
        </TabErrorBoundary>
      );
    },
    [
      account,
      actionHistory,
      busyAction,
      fetchStats,
      handleAction,
      resetCurrentTab,
      showToast,
      stats,
      tabResetKey,
    ]
  );

  if (checking && !allowAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-950 to-black px-4 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <h2 className="mb-2 text-xl font-bold">Checking admin access...</h2>
          <p className="text-sm text-white/60">
            Please wait while we verify your account.
          </p>
        </div>
      </div>
    );
  }

  if (!allowAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-950 to-black px-6 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
          <div className="mb-4 text-6xl">🔒</div>
          <h2 className="mb-2 text-2xl font-bold">Admin Access Required</h2>
          <p className="mb-6 text-sm leading-6 text-white/65">
            {error || "This page is only available to platform administrators."}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold transition hover:bg-emerald-500"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_25%),linear-gradient(to_bottom,_#020617,_#000000)] text-white">
      {toast ? (
        <div
          className={[
            "fixed right-4 top-4 z-[80] max-w-[92vw] rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur",
            toast.type === "error"
              ? "border-red-500/40 bg-red-600/90"
              : "border-emerald-500/40 bg-emerald-600/90",
          ].join(" ")}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-sm opacity-70 transition hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between px-4 py-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="rounded-xl border border-white/10 bg-white/5 p-2 transition hover:bg-white/10 lg:hidden"
              aria-label="Toggle navigation"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <div>
              <h1 className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-300 bg-clip-text text-xl font-extrabold text-transparent sm:text-2xl">
                IMALI Admin Panel
              </h1>
              <p className="hidden text-xs text-white/50 sm:block">
                Manage users, money, marketing, automation, and advanced tools.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {stats ? (
              <div className="hidden items-center gap-2 xl:flex">
                <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs text-blue-300">
                  👥 {stats.totalUsers} users
                </span>
                <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs text-purple-300">
                  🤖 {stats.activeJobs} jobs
                </span>
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-300">
                  ⏳ {stats.waitlistCount} waitlist
                </span>
              </div>
            ) : null}

            <button
              onClick={() => navigate("/dashboard")}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Exit
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 h-full w-[88%] max-w-sm overflow-y-auto border-r border-white/10 bg-slate-950 px-4 pb-6 pt-20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Admin Navigation</h2>
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
                      <h3 className="text-sm font-bold">{section.name}</h3>
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
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-[1680px]">
        <aside className="hidden min-h-[calc(100vh-73px)] w-[320px] shrink-0 border-r border-white/10 bg-white/[0.03] lg:block">
          <div className="sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto p-4">
            <div className="space-y-6">
              {TAB_SECTIONS.map((section) => (
                <div key={section.id}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-lg">{section.emoji}</span>
                    <div>
                      <h3 className="text-sm font-bold">{section.name}</h3>
                      <p className="text-[11px] text-white/45">
                        {section.description}
                      </p>
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
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-4 lg:px-6 lg:py-6">
          {stats ? (
            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
              <StatCard label="Users" value={stats.totalUsers} tone="blue" />
              <StatCard label="Open Tickets" value={stats.openTickets} tone="purple" />
              <StatCard label="Waitlist" value={stats.waitlistCount} tone="amber" />
              <StatCard label="Active Promos" value={stats.activePromos} tone="emerald" />
              <StatCard label="Jobs" value={stats.activeJobs} tone="purple" />
              <StatCard
                label="Pending Withdrawals"
                value={stats.pendingWithdrawals}
                tone="amber"
              />
              <StatCard label="Active Bots" value={stats.activeBots} tone="blue" />
              <StatCard label="Revenue" value={stats.totalRevenue} tone="emerald" />
            </div>
          ) : null}

          <section className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-3xl">
                  {activeTab.emoji}
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold">{activeTab.label}</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-white/60">
                    {activeTab.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={resetCurrentTab}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
                >
                  Reset This Page
                </button>
                <button
                  onClick={fetchStats}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                >
                  Refresh Panel
                </button>
                <button
                  onClick={() => setShowGuide((prev) => !prev)}
                  className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
                >
                  {showGuide ? "Hide Guide" : "Show Guide"}
                </button>
              </div>
            </div>
          </section>

          {showGuide ? (
            <div className="mb-5">
              <PageGuide activeTab={activeTab} />
            </div>
          ) : null}

          {activeTab.actions?.length > 0 ? (
            <section className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h3 className="text-lg font-bold">Quick Actions</h3>
              </div>
              <p className="mb-4 text-sm text-white/60">
                These are the fastest actions people usually need on this page.
              </p>

              <div className="flex flex-wrap gap-3">
                {activeTab.actions.map((action) => (
                  <ActionButton
                    key={action.id}
                    action={action}
                    onAction={handleAction}
                    busy={busyAction[`${activeTab.key}:${action.id}`]}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {activeTab.key === "automation" ? (
            <section className="mb-5 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-5 sm:p-6">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-cyan-300">
                    Message Composer
                  </h3>
                  <p className="text-sm leading-6 text-white/70">
                    Type the message you want to send for a quick test. If you
                    leave it blank, the system will use a default test message.
                  </p>
                </div>

                <button
                  onClick={() => setTestMessage("")}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
                >
                  Clear Message
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <label className="mb-2 block text-sm font-semibold text-white">
                    Choose platform
                  </label>
                  <div className="space-y-2">
                    {["telegram", "twitter", "discord"].map((platform) => {
                      const isSelected = selectedPlatform === platform;
                      return (
                        <button
                          key={platform}
                          onClick={() => setSelectedPlatform(platform)}
                          className={[
                            "w-full rounded-xl border px-3 py-3 text-left text-sm font-medium transition",
                            isSelected
                              ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-200"
                              : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10",
                          ].join(" ")}
                        >
                          {platform === "telegram" && "📱 Telegram"}
                          {platform === "twitter" && "𝕏 Twitter / X"}
                          {platform === "discord" && "💬 Discord"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <label className="mb-2 block text-sm font-semibold text-white">
                    Test message
                  </label>
                  <textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Example: IMALI update — new dashboard improvements are live. Check your account for the latest features."
                    rows={6}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/40"
                  />

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-white/50">
                      Tip: write the exact message you want to test before sending.
                    </p>

                    <button
                      onClick={() => handleTestSocial()}
                      disabled={!!busyAction[`testSocial:${selectedPlatform}`]}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyAction[`testSocial:${selectedPlatform}`] ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                      ) : (
                        <span>🚀</span>
                      )}
                      Send Test to {selectedPlatform}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {(activeTab.key === "automation" || activeTab.key === "social") &&
          socialStatus ? (
            <section className="mb-5 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-cyan-300">
                    Integration Status
                  </h3>
                  <p className="text-sm text-white/65">
                    This shows whether your connected posting platforms appear to
                    be configured.
                  </p>
                </div>

                <button
                  onClick={fetchSocialStatus}
                  className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold transition hover:bg-cyan-500/20"
                >
                  Refresh Status
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">📱</span>
                    <h4 className="font-bold">Telegram</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-white/50">Status</span>
                      <span
                        className={
                          socialStatus?.telegram?.configured
                            ? "text-emerald-400"
                            : "text-red-400"
                        }
                      >
                        {socialStatus?.telegram?.configured
                          ? "Connected"
                          : "Disconnected"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-white/50">Bot</span>
                      <span className="truncate text-right text-white/75">
                        {socialStatus?.telegram?.bot_name || "Not set"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">𝕏</span>
                    <h4 className="font-bold">Twitter / X</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-white/50">Status</span>
                      <span
                        className={
                          socialStatus?.twitter?.configured
                            ? "text-emerald-400"
                            : "text-red-400"
                        }
                      >
                        {socialStatus?.twitter?.configured
                          ? "Connected"
                          : "Disconnected"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">💬</span>
                    <h4 className="font-bold">Discord</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-white/50">Status</span>
                      <span
                        className={
                          socialStatus?.discord?.configured
                            ? "text-emerald-400"
                            : "text-red-400"
                        }
                      >
                        {socialStatus?.discord?.configured
                          ? "Connected"
                          : "Disconnected"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            {renderTab(activeTab)}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">Recent Action History</h3>
                <p className="text-sm text-white/60">
                  A simple record of what you recently triggered from this admin panel.
                </p>
              </div>
            </div>

            {actionHistory.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/55">
                No admin actions recorded in this session yet.
              </div>
            ) : (
              <div className="space-y-3">
                {actionHistory.slice(0, 8).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-semibold">{entry.action}</div>
                      <div className="text-xs text-white/45">
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </div>

                    <div
                      className={[
                        "inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold",
                        entry.status === "success"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : entry.status === "error"
                          ? "bg-red-500/15 text-red-300"
                          : "bg-amber-500/15 text-amber-300",
                      ].join(" ")}
                    >
                      {entry.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="mt-6 text-center text-[11px] text-white/30">
            Admin Panel •{" "}
            {account
              ? `Connected wallet: ${account.slice(0, 6)}...${account.slice(-4)}`
              : "No wallet connected"}{" "}
            • Updated {new Date().toLocaleTimeString()}
          </div>
        </main>
      </div>
    </div>
  );
}