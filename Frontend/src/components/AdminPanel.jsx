import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

const API_BASE =
  (process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com").replace(/\/+$/, "");

const ADMIN_EMAILS = [
  "wayne@imali-defi.com",
  "admin@imali-defi.com",
];

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
        description: "Main numbers and summary cards.",
        help: "Start here to get a quick snapshot of platform performance.",
        actions: [
          { id: "refresh", label: "Refresh", icon: "🔄", endpoint: "/api/admin/metrics", method: "GET" },
        ],
      },
      {
        key: "health",
        label: "System Health",
        emoji: "🏥",
        description: "Check if services are running correctly.",
        help: "Check backend services, bots, and platform health.",
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
    description: "Manage accounts and help people using the platform.",
    tabs: [
      {
        key: "users",
        label: "All Users",
        emoji: "👥",
        description: "View and manage user accounts.",
        help: "Search, review, and manage user accounts.",
        actions: [
          { id: "refresh", label: "Refresh", icon: "🔄", endpoint: "/api/admin/users", method: "GET" },
          { id: "export", label: "Export", icon: "📥", endpoint: "/api/export/trades?format=csv", method: "GET" },
        ],
      },
      {
        key: "tickets",
        label: "Support",
        emoji: "🎫",
        description: "Handle support issues and questions.",
        help: "Review support tickets and respond to user problems.",
        actions: [
          { id: "refresh", label: "Refresh", icon: "🔄", endpoint: "/api/admin/support/tickets", method: "GET" },
        ],
      },
      {
        key: "waitlist",
        label: "Waitlist",
        emoji: "⏳",
        description: "Review people waiting to join.",
        help: "Manage waitlist entries and approvals.",
        actions: [
          { id: "refresh", label: "Refresh", icon: "🔄", endpoint: "/api/admin/waitlist", method: "GET" },
        ],
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
        description: "Approve or review withdrawal requests.",
        help: "Review pending and historical withdrawals.",
        actions: [
          { id: "refresh", label: "Refresh", icon: "🔄", endpoint: "/api/admin/withdrawals", method: "GET" },
        ],
      },
      {
        key: "fees",
        label: "Fees",
        emoji: "💸",
        description: "Manage fee flows and distributions.",
        help: "Review fee history and distributions.",
        actions: [
          { id: "history", label: "History", icon: "📜", endpoint: "/api/billing/fee-history", method: "GET" },
        ],
      },
      {
        key: "treasury",
        label: "Treasury",
        emoji: "🏦",
        description: "Manage platform-held funds.",
        help: "View treasury stats and balances.",
        actions: [
          { id: "stats", label: "Stats", icon: "📊", endpoint: "/api/admin/treasury/stats", method: "GET" },
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
        description: "Schedule automated marketing posts.",
        help: "Manage automated promotional content and tests.",
        actions: [
          { id: "refresh", label: "Refresh Jobs", icon: "🔄", endpoint: "/api/admin/automation/jobs", method: "GET" },
          { id: "process", label: "Run Scheduled", icon: "⏰", endpoint: "/api/admin/social/process-scheduled", method: "POST" },
          { id: "test", label: "Test Telegram", icon: "📱", endpoint: "/api/admin/social/test", method: "POST" },
        ],
      },
      {
        key: "promos",
        label: "Promo Codes",
        emoji: "🎟️",
        description: "Create and manage discount codes.",
        help: "Create and monitor promo codes.",
        actions: [
          { id: "refresh", label: "Refresh", icon: "🔄", endpoint: "/api/admin/promo/list", method: "GET" },
          { id: "create", label: "Create New", icon: "➕", endpoint: "/api/admin/promo/create", method: "POST" },
        ],
      },
      {
        key: "announcements",
        label: "Announcements",
        emoji: "📣",
        description: "Send updates to users.",
        help: "View and publish announcements.",
        actions: [
          { id: "refresh", label: "Refresh", icon: "🔄", endpoint: "/api/admin/announcements", method: "GET" },
        ],
      },
      {
        key: "referrals",
        label: "Referrals",
        emoji: "🧲",
        description: "Track user invite performance.",
        help: "Review referral stats and payouts.",
        actions: [
          { id: "stats", label: "Stats", icon: "📊", endpoint: "/api/admin/referrals/stats", method: "GET" },
          { id: "process", label: "Process Payouts", icon: "💰", endpoint: "/api/admin/referrals/process-payouts", method: "POST" },
        ],
      },
      {
        key: "social",
        label: "Social Manager",
        emoji: "📱",
        description: "Manage social media activity.",
        help: "View posts, platform status, and analytics.",
        actions: [
          { id: "refresh", label: "Refresh", icon: "🔄", endpoint: "/api/admin/social/posts", method: "GET" },
          { id: "status", label: "Platform Status", icon: "🔌", endpoint: "/api/admin/social/status", method: "GET" },
          { id: "stats", label: "Analytics", icon: "📊", endpoint: "/api/admin/social/stats", method: "GET" },
        ],
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
        description: "Mint, burn, and manage token actions.",
        help: "Manage token stats and supply actions.",
        actions: [
          { id: "stats", label: "Stats", icon: "📊", endpoint: "/api/admin/token/stats", method: "GET" },
          { id: "mint", label: "Mint", icon: "🪙", endpoint: "/api/admin/token/mint", method: "POST" },
          { id: "burn", label: "Burn", icon: "🔥", endpoint: "/api/admin/token/burn", method: "POST" },
        ],
      },
      {
        key: "buyback",
        label: "Buyback",
        emoji: "♻️",
        description: "Manage token buybacks.",
        help: "View buyback stats and trigger buybacks.",
        actions: [
          { id: "stats", label: "Stats", icon: "📊", endpoint: "/api/admin/buyback/stats", method: "GET" },
          { id: "trigger", label: "Trigger", icon: "⚡", endpoint: "/api/admin/buyback/trigger", method: "POST" },
        ],
      },
      {
        key: "nfts",
        label: "NFTs",
        emoji: "🧬",
        description: "Manage NFT tiers and NFT items.",
        help: "List and mint NFTs.",
        actions: [
          { id: "list", label: "List", icon: "📋", endpoint: "/api/admin/nfts", method: "GET" },
          { id: "mint", label: "Mint", icon: "🪙", endpoint: "/api/admin/nfts/mint", method: "POST" },
        ],
      },
      {
        key: "cex",
        label: "CEX",
        emoji: "🏧",
        description: "Manage centralized exchange controls.",
        help: "Review centralized exchange balances.",
        actions: [
          { id: "balances", label: "Balances", icon: "⚖️", endpoint: "/api/admin/cex/balances", method: "GET" },
        ],
      },
      {
        key: "stocks",
        label: "Stocks",
        emoji: "📈",
        description: "Manage stock-related trading tools.",
        help: "Review stock positions and stock bot data.",
        actions: [
          { id: "positions", label: "Positions", icon: "📊", endpoint: "/api/admin/stocks/positions", method: "GET" },
        ],
      },
      {
        key: "audit",
        label: "Audit Logs",
        emoji: "📋",
        description: "Review admin actions and events.",
        help: "View audit logs.",
        actions: [
          { id: "refresh", label: "Refresh", icon: "🔄", endpoint: "/api/admin/audit-logs", method: "GET" },
        ],
      },
      {
        key: "access",
        label: "Permissions",
        emoji: "🔐",
        description: "Control admin access and roles.",
        help: "Check access and review permissions.",
        actions: [
          { id: "check", label: "Check Access", icon: "🔍", endpoint: "/api/admin/check", method: "GET" },
        ],
      },
    ],
  },
];

const ALL_TABS = TAB_SECTIONS.flatMap((section) => section.tabs);

function prettyJson(data) {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function SidebarButton({ tab, active, onClick }) {
  return (
    <button
      onClick={() => onClick(tab.key)}
      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
        active === tab.key
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{tab.emoji}</span>
        <div className="min-w-0">
          <div className="text-sm font-medium">{tab.label}</div>
          <div className="text-xs text-white/45 mt-1">{tab.description}</div>
        </div>
      </div>
    </button>
  );
}

function QuickActionButton({ action, busy, onRun }) {
  return (
    <button
      onClick={() => onRun(action)}
      disabled={busy}
      className="px-3 py-2 rounded-lg text-xs font-medium border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50"
    >
      {busy ? "Working..." : `${action.icon} ${action.label}`}
    </button>
  );
}

function SummaryCard({ title, value, color }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessError, setAccessError] = useState("");
  const [activeTabKey, setActiveTabKey] = useState("overview");
  const [results, setResults] = useState("Click any action to load data...");
  const [busyAction, setBusyAction] = useState("");
  const [stats, setStats] = useState({
    users: "---",
    health: "---",
    metrics: "---",
  });

  const token = BotAPI.getToken();

  const normalizedEmail = useMemo(
    () => String(user?.email || "").trim().toLowerCase(),
    [user?.email]
  );

  const hasAdminAccess = useMemo(() => {
    return user?.is_admin === true || ADMIN_EMAILS.includes(normalizedEmail);
  }, [user?.is_admin, normalizedEmail]);

  const activeTab = useMemo(() => {
    return ALL_TABS.find((t) => t.key === activeTabKey) || ALL_TABS[0];
  }, [activeTabKey]);

  useEffect(() => {
    if (loading) return;

    if (!token || !user) {
      setAccessError("Please log in first.");
      setCheckingAccess(false);
      return;
    }

    if (!hasAdminAccess) {
      setAccessError("You do not have admin access.");
      setCheckingAccess(false);
      return;
    }

    setAccessError("");
    setCheckingAccess(false);
  }, [loading, token, user, hasAdminAccess]);

  const runRequest = async (label, endpoint, method = "GET", body = null) => {
    if (!token) {
      setResults("No auth token found. Please log in again.");
      return null;
    }

    setBusyAction(label);
    setResults(`Running ${label}...`);

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || data?.error || `Request failed (${res.status})`);
      }

      setResults(prettyJson(data));
      return data;
    } catch (err) {
      setResults(`Error: ${err.message}`);
      return null;
    } finally {
      setBusyAction("");
    }
  };

  const loadUsers = async () => {
    const data = await runRequest("Load Users", "/api/admin/users", "GET");
    if (data) {
      setStats((prev) => ({
        ...prev,
        users: data?.data?.count ?? data?.users?.length ?? data?.count ?? 0,
      }));
    }
  };

  const checkHealth = async () => {
    const data = await runRequest("Check Health", "/api/health/detailed", "GET");
    if (data) {
      setStats((prev) => ({
        ...prev,
        health: data?.data?.status || data?.status || "OK",
      }));
    }
  };

  const loadMetrics = async () => {
    const data = await runRequest("Load Metrics", "/api/admin/metrics", "GET");
    if (data) {
      setStats((prev) => ({
        ...prev,
        metrics:
          data?.users?.total ??
          data?.data?.users?.total ??
          data?.total_users ??
          0,
      }));
    }
  };

  const runAction = async (action) => {
    const data = await runRequest(action.label, action.endpoint, action.method || "GET");

    if (!data) return;

    if (action.endpoint === "/api/admin/users") {
      setStats((prev) => ({
        ...prev,
        users: data?.data?.count ?? data?.users?.length ?? data?.count ?? 0,
      }));
    }

    if (action.endpoint === "/api/health/detailed") {
      setStats((prev) => ({
        ...prev,
        health: data?.data?.status || data?.status || "OK",
      }));
    }

    if (action.endpoint === "/api/admin/metrics") {
      setStats((prev) => ({
        ...prev,
        metrics:
          data?.users?.total ??
          data?.data?.users?.total ??
          data?.total_users ??
          0,
      }));
    }
  };

  if (loading || checkingAccess) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-400">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2">Admin Only</h1>
          <p className="text-white/65 mb-6">
            {accessError || "You do not have admin access."}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full rounded-xl bg-emerald-600 px-6 py-3 font-medium hover:bg-emerald-500"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white">
      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="mb-6 text-gray-400">
          Logged in as:{" "}
          <strong className="text-green-400">
            {user?.email || "wayne@imali-defi.com"}
          </strong>
        </p>

        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-6">
          <p className="text-green-300">
            ✅ Admin privileges: <strong>ACTIVE</strong>
          </p>
          <p className="text-green-300 text-sm">
            Admin flag: {String(user?.is_admin === true || ADMIN_EMAILS.includes(normalizedEmail))}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SummaryCard title="Users" value={stats.users} color="text-blue-400" />
          <SummaryCard title="System Health" value={stats.health} color="text-green-400" />
          <SummaryCard title="Metrics" value={stats.metrics} color="text-purple-400" />
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={loadUsers}
            disabled={busyAction === "Load Users"}
            className="px-4 py-2 bg-blue-600 rounded-lg text-sm disabled:opacity-50"
          >
            {busyAction === "Load Users" ? "Loading..." : "Load Users"}
          </button>
          <button
            onClick={checkHealth}
            disabled={busyAction === "Check Health"}
            className="px-4 py-2 bg-green-600 rounded-lg text-sm disabled:opacity-50"
          >
            {busyAction === "Check Health" ? "Loading..." : "Check Health"}
          </button>
          <button
            onClick={loadMetrics}
            disabled={busyAction === "Load Metrics"}
            className="px-4 py-2 bg-purple-600 rounded-lg text-sm disabled:opacity-50"
          >
            {busyAction === "Load Metrics" ? "Loading..." : "Load Metrics"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
          <aside className="space-y-6">
            {TAB_SECTIONS.map((section) => (
              <div key={section.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xl">{section.emoji}</span>
                  <div>
                    <h2 className="font-semibold">{section.name}</h2>
                    <p className="text-xs text-white/45">{section.description}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {section.tabs.map((tab) => (
                    <SidebarButton
                      key={tab.key}
                      tab={tab}
                      active={activeTabKey}
                      onClick={setActiveTabKey}
                    />
                  ))}
                </div>
              </div>
            ))}
          </aside>

          <main className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-4xl">{activeTab.emoji}</span>
                <div>
                  <h2 className="text-2xl font-bold">{activeTab.label}</h2>
                  <p className="text-white/60 mt-1">{activeTab.description}</p>
                </div>
              </div>

              <div className="mb-6 text-sm text-white/70">
                {activeTab.help}
              </div>

              {activeTab.actions?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {activeTab.actions.map((action) => (
                    <QuickActionButton
                      key={action.id}
                      action={action}
                      busy={busyAction === action.label}
                      onRun={runAction}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-white/40">No quick actions for this tab.</div>
              )}
            </div>

            <div className="bg-black/30 border border-white/10 rounded-xl p-4 overflow-auto max-h-[34rem]">
              <pre className="text-xs text-gray-200 whitespace-pre-wrap break-words">
                {results}
              </pre>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}