// src/components/AdminPanel.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { parseUnits, isAddress } from "ethers";
import { getContractInstance } from "../getContractInstance";
import { useWallet } from "../context/WalletContext";
import TxActionButton from "./TxActionButton";
import BotAPI from "../utils/BotAPI";

/* ---------- External admin modules ---------- */
import DashboardOverview from "../admin/DashboardOverview.jsx";
import TokenManagement from "../admin/TokenManagement.js";
import BuyBackDashboard from "../admin/BuyBackDashboard.js";
import FeeDistributor from "../admin/FeeDistributor.jsx";
import NFTManagement from "../admin/NFTManagement.js";
import ReferralAnalytics from "../admin/ReferralAnalytics.jsx";
import SocialManager from "../admin/SocialManager.js";
import AccessControl from "../admin/AccessControl.jsx";
import UserManagement from "../admin/UserManagement.jsx";
import PromoManagement from "../admin/PromoManagement.jsx";
import WithdrawalManagement from "../admin/WithdrawalManagement.jsx";
import SupportTickets from "../admin/SupportTickets.jsx";
import Announcements from "../admin/Announcements.jsx";
import WaitlistManagement from "../admin/WaitlistManagement.jsx";
import SystemHealth from "../admin/SystemHealth.jsx";
import AuditLogs from "../admin/AuditLogs.jsx";

/* -------------------- Env + Chain helpers -------------------- */
const IS_BROWSER = typeof window !== "undefined";

const E = (k, fb = "") => {
  if (typeof process !== "undefined" && process.env && process.env[k] !== undefined) {
    return process.env[k] || fb;
  }
  
  if (IS_BROWSER) {
    if (window.__APP_CONFIG__ && window.__APP_CONFIG__[k] !== undefined) {
      return window.__APP_CONFIG__[k];
    }
    if (window.process?.env?.[k]) {
      return window.process.env[k];
    }
    if (window[`${k}`]) {
      return window[`${k}`];
    }
  }
  
  return fb;
};

const CHAIN_BY_IDHEX = {
  "0x1": "ethereum",
  "0x89": "polygon",
  "0x2105": "base",
};

async function getChainKeyFromProvider(provider) {
  try {
    const net = await provider?.getNetwork?.();
    const idHex = "0x" + Number(net?.chainId ?? 0).toString(16);
    return CHAIN_BY_IDHEX[idHex] || "polygon";
  } catch {
    return "polygon";
  }
}

/* -------------------- API Base URL -------------------- */
const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

/* -------------------- Tab Definitions -------------------- */
const BASE_TAB_DEFS = [
  { key: "overview", label: "Overview", emoji: "✨", render: (p) => <DashboardOverview {...p} /> },
  { key: "users", label: "Users", emoji: "👥", render: (p) => <UserManagement {...p} apiBase={API_BASE} /> },
  { key: "promos", label: "Promos", emoji: "🎟️", render: (p) => <PromoManagement {...p} apiBase={API_BASE} /> },
  { key: "withdrawals", label: "Withdrawals", emoji: "💰", render: (p) => <WithdrawalManagement {...p} apiBase={API_BASE} /> },
  { key: "referrals", label: "Referrals", emoji: "🧲", render: (p) => <ReferralAnalytics {...p} apiBase={API_BASE} /> },
  { key: "tickets", label: "Support", emoji: "🎫", render: (p) => <SupportTickets {...p} apiBase={API_BASE} /> },
  { key: "announcements", label: "Announce", emoji: "📢", render: (p) => <Announcements {...p} apiBase={API_BASE} /> },
  { key: "waitlist", label: "Waitlist", emoji: "⏳", render: (p) => <WaitlistManagement {...p} apiBase={API_BASE} /> },
  { key: "audit", label: "Audit Logs", emoji: "📋", render: (p) => <AuditLogs {...p} apiBase={API_BASE} /> },
  { key: "health", label: "System", emoji: "🏥", render: (p) => <SystemHealth {...p} apiBase={API_BASE} /> },
  { key: "token", label: "Token Mgmt", emoji: "🪙", render: (p) => <TokenManagement {...p} /> },
  { key: "buyback", label: "Buyback", emoji: "♻️", render: (p) => <BuyBackDashboard {...p} /> },
  { key: "fees", label: "Fee Distributor", emoji: "💸", render: (p) => <FeeDistributor {...p} /> },
  { key: "treasury", label: "Treasury", emoji: "🏦", render: (p) => <TreasurySection {...p} /> },
  { key: "cex", label: "CEX Funding", emoji: "🏧", render: (p) => <CexSection {...p} /> },
  { key: "stocks", label: "Stocks", emoji: "📈", render: (p) => <StocksSection {...p} /> },
  { key: "nfts", label: "NFTs", emoji: "🧬", render: (p) => <NFTManagement {...p} /> },
  { key: "social", label: "Social", emoji: "📣", render: (p) => <SocialManager {...p} /> },
  { key: "access", label: "Access Control", emoji: "🔐", render: (p) => <AccessControl {...p} /> },
];

/* -------------------- Main Admin Panel -------------------- */
export default function AdminPanel({ forceOwner = false }) {
  const { account, provider } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState("overview");
  const [busyAction, setBusyAction] = useState("");
  const [stats, setStats] = useState(null);

  // Dev-mode detection
  const isDevelopment = 
    (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') ||
    (IS_BROWSER && window.location.hostname === 'localhost');

  const BYPASS = isDevelopment &&
    (E("VITE_BYPASS_OWNER") === "1" || E("REACT_APP_BYPASS_OWNER") === "1");

  const TEST_BYPASS = location.pathname.startsWith("/test/admin");

  // Check admin status via API
  useEffect(() => {
    let mounted = true;

    const checkAdminStatus = async () => {
      try {
        if (forceOwner || BYPASS || TEST_BYPASS) {
          if (mounted) {
            setIsAdmin(true);
            setChecking(false);
          }
          return;
        }

        // First try API admin check
        try {
          const adminCheck = await BotAPI.adminCheck();
          if (adminCheck?.is_admin) {
            if (mounted) {
              setIsAdmin(true);
              setChecking(false);
            }
            return;
          }
        } catch (apiErr) {
          console.warn("API admin check failed, falling back to wallet check:", apiErr);
        }

        // Fallback to wallet-based owner check
        if (!account) {
          if (mounted) {
            setError("Connect your wallet to continue.");
            setChecking(false);
          }
          return;
        }

        let onChainOwner = null;
        try {
          const chainKey = provider ? await getChainKeyFromProvider(provider) : "polygon";
          const imali = await getContractInstance("IMALI", chainKey, {
            withSigner: false,
            autoSwitch: false,
          });
          if (typeof imali.owner === "function") {
            onChainOwner = (await imali.owner())?.toLowerCase();
          }
        } catch {
          /* ignore */
        }

        const envOwner = (E("REACT_APP_OWNER_ADDRESS") || E("VITE_OWNER_ADDRESS") || "").toLowerCase();
        const current = account.toLowerCase();
        const allowed =
          (!!onChainOwner && current === onChainOwner) ||
          (!!envOwner && current === envOwner);

        if (mounted) {
          setIsAdmin(!!allowed);
          setChecking(false);
        }
      } catch (e) {
        if (mounted) {
          setError(e?.message || "Admin check failed.");
          setChecking(false);
        }
      }
    };

    checkAdminStatus();

    return () => {
      mounted = false;
    };
  }, [account, provider, forceOwner, BYPASS, TEST_BYPASS]);

  // Fetch dashboard stats
  useEffect(() => {
    if (!isAdmin && !forceOwner && !BYPASS && !TEST_BYPASS) return;

    const fetchStats = async () => {
      try {
        // Get user count
        const users = await BotAPI.adminGetUsers({ limit: 1 });
        
        // Get pending withdrawals
        const withdrawals = await fetch(`${API_BASE}/api/admin/withdrawals?status=pending`, {
          headers: { 'Authorization': `Bearer ${BotAPI.getToken()}` }
        }).then(res => res.json());
        
        // Get open tickets
        const tickets = await fetch(`${API_BASE}/api/admin/support/tickets?status=open`, {
          headers: { 'Authorization': `Bearer ${BotAPI.getToken()}` }
        }).then(res => res.json());
        
        // Get promo stats
        const promos = await BotAPI.adminListPromos();
        
        // Get waitlist count
        const waitlist = await fetch(`${API_BASE}/api/admin/waitlist`, {
          headers: { 'Authorization': `Bearer ${BotAPI.getToken()}` }
        }).then(res => res.json());

        setStats({
          totalUsers: users?.total || 0,
          pendingWithdrawals: withdrawals?.withdrawals?.length || 0,
          openTickets: tickets?.tickets?.length || 0,
          activePromos: promos?.promos?.filter(p => p.active)?.length || 0,
          waitlistCount: waitlist?.waitlist?.length || 0,
        });
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    };

    fetchStats();
  }, [isAdmin, forceOwner, BYPASS, TEST_BYPASS]);

  /* -------------------- Backend action handlers -------------------- */
  const handleTriggerBuyback = useCallback(async (options = {}) => {
    try {
      setBusyAction("buyback");
      const res = await fetch(`${API_BASE}/api/admin/buyback`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${BotAPI.getToken()}`
        },
        body: JSON.stringify(options),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Buyback failed");
      alert(`✅ Buyback triggered: ${data.txHash || "submitted"}`);
    } catch (err) {
      console.error("[AdminPanel] Buyback error:", err);
      alert(err?.message || "Buyback failed");
    } finally {
      setBusyAction("");
    }
  }, [API_BASE]);

  const handleTriggerLiquidity = useCallback(async (options = {}) => {
    try {
      setBusyAction("liquidity");
      const res = await fetch(`${API_BASE}/api/admin/liquidity`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${BotAPI.getToken()}`
        },
        body: JSON.stringify(options),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Liquidity failed");
      alert(`✅ Liquidity triggered: ${data.txHash || "submitted"}`);
    } catch (err) {
      console.error("[AdminPanel] Liquidity error:", err);
      alert(err?.message || "Liquidity failed");
    } finally {
      setBusyAction("");
    }
  }, [API_BASE]);

  const handleAutoStake = useCallback(async (percent = 0.25) => {
    try {
      setBusyAction("stake");
      const res = await fetch(`${API_BASE}/api/admin/auto-stake`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${BotAPI.getToken()}`
        },
        body: JSON.stringify({ percent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Auto-stake failed");
      alert(`✅ Auto-stake started: ${data.message || "submitted"}`);
    } catch (err) {
      console.error("[AdminPanel] Auto-stake error:", err);
      alert(err?.message || "Auto-stake failed");
    } finally {
      setBusyAction("");
    }
  }, [API_BASE]);

  const handleProcessFees = useCallback(async (dryRun = true) => {
    try {
      setBusyAction("fees");
      const res = await fetch(`${API_BASE}/api/admin/process-pending-fees`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${BotAPI.getToken()}`
        },
        body: JSON.stringify({ dry_run: dryRun, limit: 100 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fee processing failed");
      
      if (dryRun) {
        alert(`📊 Dry run: ${data.processed} fees would be processed for $${data.total_amount.toFixed(2)}`);
      } else {
        alert(`✅ Processed ${data.processed} fees for $${data.total_amount.toFixed(2)}`);
      }
    } catch (err) {
      console.error("[AdminPanel] Fee processing error:", err);
      alert(err?.message || "Fee processing failed");
    } finally {
      setBusyAction("");
    }
  }, [API_BASE]);

  /* -------------------- Tabs with injected callbacks -------------------- */
  const tabs = useMemo(() => 
    BASE_TAB_DEFS.map((t) => {
      if (t.key === "buyback") {
        return {
          ...t,
          render: (p) => (
            <BuyBackDashboard
              {...p}
              onTriggerBuyback={handleTriggerBuyback}
              onTriggerLiquidity={handleTriggerLiquidity}
              onAutoStake={handleAutoStake}
              onProcessFees={handleProcessFees}
              busyAction={busyAction}
            />
          ),
        };
      }
      if (t.key === "overview") {
        return {
          ...t,
          render: (p) => (
            <DashboardOverview
              {...p}
              stats={stats}
              onRefresh={() => window.location.reload()}
            />
          ),
        };
      }
      return t;
    }), [handleTriggerBuyback, handleTriggerLiquidity, handleAutoStake, handleProcessFees, busyAction, stats]);

  /* -------------------- UI States -------------------- */
  const allowAccess = forceOwner || BYPASS || TEST_BYPASS || isAdmin;

  if (checking && !allowAccess) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-950 text-white">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Verifying admin access…</h2>
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
          <p className="text-white/70 mb-6">
            {error || "This area is restricted to administrators."}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold"
            >
              Go Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold"
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
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-black" />
      
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl opacity-25"
        style={{ background: "radial-gradient(60% 60% at 50% 50%, #22d3ee55 0%, transparent 60%)" }} />
      <div className="pointer-events-none absolute top-20 -right-16 h-96 w-96 rounded-full blur-3xl opacity-20"
        style={{ background: "radial-gradient(60% 60% at 50% 50%, #a78bfa55 0%, transparent 60%)" }} />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full blur-3xl opacity-15"
        style={{ background: "radial-gradient(60% 60% at 50% 50%, #f472b655 0%, transparent 60%)" }} />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur bg-black/10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 via-yellow-300 to-pink-300 bg-clip-text text-transparent">
              IMALI Admin
            </h1>
            {stats && (
              <div className="hidden md:flex items-center gap-2 text-sm">
                <span className="px-2 py-1 bg-blue-500/20 rounded-full text-blue-300">
                  👥 {stats.totalUsers} users
                </span>
                <span className="px-2 py-1 bg-yellow-500/20 rounded-full text-yellow-300">
                  ⏳ {stats.waitlistCount} waitlist
                </span>
                <span className="px-2 py-1 bg-purple-500/20 rounded-full text-purple-300">
                  🎫 {stats.openTickets} tickets
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {account && (
              <div className="text-sm text-white/70 bg-white/5 px-3 py-1 rounded-full">
                {account.slice(0, 6)}…{account.slice(-4)}
              </div>
            )}
            <button
              onClick={() => navigate("/dashboard")}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Exit Admin
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`px-4 py-2 rounded-2xl border text-sm font-medium transition-all
                ${active === t.key
                  ? "bg-white/15 border-white/30 shadow-[0_0_24px_-6px_rgba(255,255,255,0.35)]"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              title={t.label}
            >
              <span className="mr-1.5">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <section className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-xl min-h-[500px]">
          {tabs.find((t) => t.key === active)?.render({ 
            provider, 
            apiBase: API_BASE,
            onAction: () => {
              // Refresh stats after actions
              setTimeout(() => window.location.reload(), 1000);
            }
          })}
        </section>

        {/* Quick Actions */}
        <div className="mt-6 flex flex-wrap gap-3 justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => handleProcessFees(true)}
              disabled={busyAction === "fees"}
              className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 text-sm hover:bg-blue-600/30 disabled:opacity-50"
            >
              {busyAction === "fees" ? "Processing..." : "🔍 Dry Run Fees"}
            </button>
            <button
              onClick={() => handleProcessFees(false)}
              disabled={busyAction === "fees"}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 text-sm hover:bg-emerald-600/30 disabled:opacity-50"
            >
              {busyAction === "fees" ? "Processing..." : "💰 Process Fees"}
            </button>
          </div>
          <div className="text-xs text-white/40">
            API: {API_BASE}
          </div>
        </div>
      </main>
    </div>
  );
}

/* -------------------- Placeholder Sections -------------------- */
function TreasurySection() {
  return (
    <div className="p-6 text-white/70">
      <h3 className="text-lg font-semibold mb-4">🏦 Treasury Management</h3>
      <p className="text-sm">Treasury controls will be integrated with your smart contracts.</p>
    </div>
  );
}

function CexSection() {
  return (
    <div className="p-6 text-white/70">
      <h3 className="text-lg font-semibold mb-4">🏧 CEX Funding</h3>
      <p className="text-sm">Centralized exchange funding controls.</p>
    </div>
  );
}

function StocksSection() {
  return (
    <div className="p-6 text-white/70">
      <h3 className="text-lg font-semibold mb-4">📈 Stocks</h3>
      <p className="text-sm">Stock market integration controls.</p>
    </div>
  );
}
