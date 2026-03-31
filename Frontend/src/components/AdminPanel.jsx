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
        help: "Main platform summary and metrics.",
        actions: [
          { id: "refresh", label: "Refresh Metrics", icon: "🔄", endpoint: "/api/admin/metrics", method: "GET" },
        ],
      },
      {
        key: "health",
        label: "System Health",
        emoji: "🏥",
        description: "Check if services are running correctly.",
        help: "Backend and service health details.",
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
    description: "Manage accounts and help people using the platform.",
    tabs: [
      {
        key: "users",
        label: "All Users",
        emoji: "👥",
        description: "View and manage user accounts.",
        help: "Review users and export data.",
        actions: [
          { id: "refresh", label: "Load Users", icon: "👥", endpoint: "/api/admin/users", method: "GET" },
          { id: "export", label: "Export Trades CSV", icon: "📥", endpoint: "/api/export/trades?format=csv", method: "GET" },
        ],
      },
      {
        key: "tickets",
        label: "Support",
        emoji: "🎫",
        description: "Handle support issues and questions.",
        help: "Review support tickets.",
        actions: [
          { id: "refresh", label: "Load Tickets", icon: "🎫", endpoint: "/api/admin/support/tickets", method: "GET" },
        ],
      },
      {
        key: "waitlist",
        label: "Waitlist",
        emoji: "⏳",
        description: "Review people waiting to join.",
        help: "Review waitlist entries.",
        actions: [
          { id: "refresh", label: "Load Waitlist", icon: "⏳", endpoint: "/api/admin/waitlist", method: "GET" },
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
        help: "Review pending withdrawals.",
        actions: [
          { id: "refresh", label: "Load Withdrawals", icon: "💰", endpoint: "/api/admin/withdrawals", method: "GET" },
        ],
      },
      {
        key: "fees",
        label: "Fees",
        emoji: "💸",
        description: "Manage fee flows and distributions.",
        help: "Review fee history.",
        actions: [
          { id: "history", label: "Fee History", icon: "📜", endpoint: "/api/billing/fee-history", method: "GET" },
        ],
      },
      {
        key: "treasury",
        label: "Treasury",
        emoji: "🏦",
        description: "Manage platform-held funds.",
        help: "Review treasury stats.",
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
        description: "Schedule automated marketing posts.",
        help: "Review automation jobs and trigger scheduled items.",
        actions: [
          { id: "refresh", label: "Jobs", icon: "🤖", endpoint: "/api/admin/automation/jobs", method: "GET" },
          { id: "process", label: "Run Scheduled", icon: "⏰", endpoint: "/api/admin/social/process-scheduled", method: "POST" },
          { id: "test", label: "Test Telegram", icon: "📱", endpoint: "/api/admin/social/test", method: "POST" },
        ],
      },
      {
        key: "promos",
        label: "Promo Codes",
        emoji: "🎟️",
        description: "Create and manage discount codes.",
        help: "Review and create promo codes.",
        actions: [
          { id: "refresh", label: "Load Promos", icon: "🎟️", endpoint: "/api/admin/promo/list", method: "GET" },
          { id: "create", label: "Create Promo", icon: "➕", endpoint: "/api/admin/promo/create", method: "POST" },
        ],
      },
      {
        key: "announcements",
        label: "Announcements",
        emoji: "📣",
        description: "Send updates to users.",
        help: "Review announcements.",
        actions: [
          { id: "refresh", label: "Load Announcements", icon: "📣", endpoint: "/api/admin/announcements", method: "GET" },
        ],
      },
      {
        key: "referrals",
        label: "Referrals",
        emoji: "🧲",
        description: "Track user invite performance.",
        help: "Review referral stats and process payouts.",
        actions: [
          { id: "stats", label: "Referral Stats", icon: "📊", endpoint: "/api/admin/referrals/stats", method: "GET" },
          { id: "process", label: "Process Payouts", icon: "💰", endpoint: "/api/admin/referrals/process-payouts", method: "POST" },
        ],
      },
      {
        key: "social",
        label: "Social Manager",
        emoji: "📱",
        description: "Manage social media activity.",
        help: "Review social posts and platform status.",
        actions: [
          { id: "refresh", label: "Load Posts", icon: "📱", endpoint: "/api/admin/social/posts", method: "GET" },
          { id: "status", label: "Platform Status", icon: "🔌", endpoint: "/api/admin/social/status", method: "GET" },
          { id: "stats", label: "Social Stats", icon: "📊", endpoint: "/api/admin/social/stats", method: "GET" },
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
        help: "Review token stats and actions.",
        actions: [
          { id: "stats", label: "Token Stats", icon: "📊", endpoint: "/api/admin/token/stats", method: "GET" },
          { id: "mint", label: "Mint Token", icon: "🪙", endpoint: "/api/admin/token/mint", method: "POST" },
          { id: "burn", label: "Burn Token", icon: "🔥", endpoint: "/api/admin/token/burn", method: "POST" },
        ],
      },
      {
        key: "buyback",
        label: "Buyback",
        emoji: "♻️",
        description: "Manage token buybacks.",
        help: "Review buyback stats and trigger buybacks.",
        actions: [
          { id: "stats", label: "Buyback Stats", icon: "📊", endpoint: "/api/admin/buyback/stats", method: "GET" },
          { id: "trigger", label: "Trigger Buyback", icon: "⚡", endpoint: "/api/admin/buyback/trigger", method: "POST" },
        ],
      },
      {
        key: "nfts",
        label: "NFTs",
        emoji: "🧬",
        description: "Manage NFT tiers and NFT items.",
        help: "List and mint NFTs.",
        actions: [
          { id: "list", label: "List NFTs", icon: "📋", endpoint: "/api/admin/nfts", method: "GET" },
          { id: "mint", label: "Mint NFT", icon: "🪙", endpoint: "/api/admin/nfts/mint", method: "POST" },
        ],
      },
      {
        key: "cex",
        label: "CEX",
        emoji: "🏧",
        description: "Manage centralized exchange controls.",
        help: "Review CEX balances.",
        actions: [
          { id: "balances", label: "CEX Balances", icon: "⚖️", endpoint: "/api/admin/cex/balances", method: "GET" },
        ],
      },
      {
        key: "stocks",
        label: "Stocks",
        emoji: "📈",
        description: "Manage stock-related trading tools.",
        help: "Review stock positions.",
        actions: [
          { id: "positions", label: "Stock Positions", icon: "📊", endpoint: "/api/admin/stocks/positions", method: "GET" },
        ],
      },
      {
        key: "audit",
        label: "Audit Logs",
        emoji: "📋",
        description: "Review admin actions and events.",
        help: "Review audit logs.",
        actions: [
          { id: "refresh", label: "Load Audit Logs", icon: "📋", endpoint: "/api/admin/audit-logs", method: "GET" },
        ],
      },
      {
        key: "access",
        label: "Permissions",
        emoji: "🔐",
        description: "Control admin access and roles.",
        help: "Check permissions and access.",
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

function SidebarTab({ tab, activeTab, onSelect }) {
  const active = tab.key === activeTab;
  return (
    <button
      onClick={() => onSelect(tab.key)}
      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
        active
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{tab.emoji}</span>
        <div className="min-w-0">
          <div className="text-sm font-medium">{tab.label}</div>
          <div className="mt-1 text-xs text-white/45">{tab.description}</div>
        </div>
      </div>
    </button>
  );
}

function ActionButton({ action, busy, onClick }) {
  return (
    <button
      onClick={() => onClick(action)}
      disabled={busy}
      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium hover:bg-white/10 disabled:opacity-50"
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
    return ALL_TABS.find((tab) => tab.key === activeTabKey) || ALL_TABS[0];
  }, [activeTabKey]);

  useEffect(() => {
    if (loading) return;

    if (!user || !token) {
      setAccessError("Please log in first.");
      setCheckingAccess(false);
      return;
    }

    if (!hasAdminAccess) {
      setAccessError("You do not have admin access.");
      setCheckingAccess(false);
      return;
    }

    setCheckingAccess(false);
    setAccessError("");
  }, [loading, user, token, hasAdminAccess]);

  const runRequest = async (label, endpoint, method = "GET", body = null) => {
    if (!token) {
      setResults("No auth token found. Please log in again.");
      return null;
    }

    setBusyAction(label);
    setResults(`Running ${label}...`);

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || data?.error || `Request failed (${response.status})`);
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
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-gray-400">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="mb-4 text-6xl">🔒</div>
          <h1 className="mb-2 text-2xl font-bold">Admin Only</h1>
          <p className="mb-6 text-white/65">
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
        <h1 className="mb-2 text-3xl font-bold">Admin Dashboard</h1>
        <p className="mb-6 text-gray-400">
          Logged in as:{" "}
          <strong className="text-green-400">
            {user?.email || "wayne@imali-defi.com"}
          </strong>
        </p>

        <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/20 p-4">
          <p className="text-green-300">
            ✅ Admin privileges: <strong>ACTIVE</strong>
          </p>
          <p className="text-sm text-green-300">
            Admin flag: {String(user?.is_admin === true || ADMIN_EMAILS.includes(normalizedEmail))}
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <SummaryCard title="Users" value={stats.users} color="text-blue-400" />
          <SummaryCard title="System Health" value={stats.health} color="text-green-400" />
          <SummaryCard title="Metrics" value={stats.metrics} color="text-purple-400" />
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={loadUsers}
            disabled={busyAction === "Load Users"}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm disabled:opacity-50"
          >
            {busyAction === "Load Users" ? "Loading..." : "Load Users"}
          </button>

          <button
            onClick={checkHealth}
            disabled={busyAction === "Check Health"}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm disabled:opacity-50"
          >
            {busyAction === "Check Health" ? "Loading..." : "Check Health"}
          </button>

          <button
            onClick={loadMetrics}
            disabled={busyAction === "Load Metrics"}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm disabled:opacity-50"
          >
            {busyAction === "Load Metrics" ? "Loading..." : "Load Metrics"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-6">
            {TAB_SECTIONS.map((section) => (
              <div key={section.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xl">{section.emoji}</span>
                  <div>
                    <h2 className="font-semibold">{section.name}</h2>
                    <p className="text-xs text-white/45">{section.description}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {section.tabs.map((tab) => (
                    <SidebarTab
                      key={tab.key}
                      tab={tab}
                      activeTab={activeTabKey}
                      onSelect={setActiveTabKey}
                    />
                  ))}
                </div>
              </div>
            ))}
          </aside>

          <main className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mb-4 flex items-start gap-3">
                <span className="text-4xl">{activeTab.emoji}</span>
                <div>
                  <h2 className="text-2xl font-bold">{activeTab.label}</h2>
                  <p className="mt-1 text-white/60">{activeTab.description}</p>
                </div>
              </div>

              <div className="mb-6 text-sm text-white/70">{activeTab.help}</div>

              {activeTab.actions?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {activeTab.actions.map((action) => (
                    <ActionButton
                      key={action.id}
                      action={action}
                      busy={busyAction === action.label}
                      onClick={runAction}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-white/40">No quick actions for this tab.</div>
              )}
            </div>

            <div className="max-h-[34rem] overflow-auto rounded-xl border border-white/10 bg-black/30 p-4">
              <pre className="whitespace-pre-wrap break-words text-xs text-gray-200">
                {results}
              </pre>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
