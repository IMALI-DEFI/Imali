// src/components/AdminPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { parseUnits, isAddress } from "ethers"; // ethers v6
import { getContractInstance } from "../getContractInstance";
import { useWallet } from "../context/WalletContext";
import TxActionButton from "./TxActionButton";
import { TreasuryAPI, FeesAPI, CexAPI, StocksAPI } from "../utils/adminApi";

/* ---------- External admin modules ---------- */
import DashboardOverview from "../admin/DashboardOverview.jsx";
import TokenManagement from "../admin/TokenManagement.js";
import BuyBackDashboard from "../admin/BuyBackDashboard.js";
import FeeDistributor from "../admin/FeeDistributor.jsx";
import NFTManagement from "../admin/NFTManagement.js";
import ReferralAnalytics from "../admin/ReferralAnalytics.jsx";
import SocialManager from "../admin/SocialManager.js";
import AccessControl from "../admin/AccessControl.jsx";

/* -------------------- Env + Chain helpers -------------------- */
const E = (k, fb = "") => {
  if (typeof import.meta !== "undefined" && import.meta.env && k in import.meta.env) return import.meta.env[k] ?? fb;
  if (typeof process !== "undefined" && process.env && k in process.env) return process.env[k] ?? fb;
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

/* -------------------- Tabs -------------------- */
const TAB_DEFS = [
  { key: "overview", label: "Overview", emoji: "✨", render: (p) => <DashboardOverview {...p} /> },
  { key: "token", label: "Token Mgmt", emoji: "🪙", render: (p) => <TokenManagement {...p} /> },
  { key: "buyback", label: "Buyback", emoji: "♻️", render: (p) => <BuyBackDashboard {...p} /> },
  { key: "fees", label: "Fee Distributor", emoji: "💸", render: (p) => <FeeDistributor {...p} /> },
  { key: "treasury", label: "Treasury", emoji: "🏦", render: (p) => <TreasurySection {...p} /> },
  { key: "cex", label: "CEX Funding", emoji: "🏧", render: (p) => <CexSection {...p} /> },
  { key: "stocks", label: "Stocks", emoji: "📈", render: (p) => <StocksSection {...p} /> },
  { key: "nfts", label: "NFTs", emoji: "🧬", render: (p) => <NFTManagement {...p} /> },
  { key: "referrals", label: "Referrals", emoji: "🧲", render: (p) => <ReferralAnalytics {...p} /> },
  { key: "social", label: "Social", emoji: "📣", render: (p) => <SocialManager {...p} /> },
  { key: "access", label: "Access Control", emoji: "🔐", render: (p) => <AccessControl {...p} /> },
];

/* -------------------- Component -------------------- */
export default function AdminPanel({ forceOwner = false }) {
  const { account, provider } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();

  const [checking, setChecking] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState("overview");

  const tabs = useMemo(() => TAB_DEFS, []);

  // Dev-mode env bypass
  const BYPASS =
    (import.meta?.env?.DEV ?? process.env.NODE_ENV === "development") &&
    (E("VITE_BYPASS_OWNER") === "1" || E("REACT_APP_BYPASS_OWNER") === "1");

  // Path-based bypass for /test/admin
  const TEST_BYPASS = location.pathname.startsWith("/test/admin");

  // If any bypass applies, render immediately
  const allowNow = forceOwner || BYPASS || TEST_BYPASS || isOwner;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Skip checks in dev/test routes or when prop says so
        if (forceOwner || BYPASS || TEST_BYPASS) {
          if (mounted) {
            setIsOwner(true);
            setChecking(false);
          }
          return;
        }

        if (!account) {
          if (mounted) {
            setError("Connect your wallet to continue.");
            setChecking(false);
          }
          return;
        }

        // On-chain + env owner checks
        let onChainOwner = null;
        try {
          const chainKey = provider ? await getChainKeyFromProvider(provider) : "polygon";
          const imali = await getContractInstance("IMALI", chainKey, { withSigner: false, autoSwitch: false });
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
          setIsOwner(!!allowed);
          setChecking(false);
        }
      } catch (e) {
        if (mounted) {
          setError(e?.message || "Owner check failed.");
          setChecking(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [account, provider, forceOwner, BYPASS, TEST_BYPASS]);

  /* -------------------- UI States -------------------- */
  if (checking && !allowNow) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-950 text-white">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Verifying owner access…</h2>
        </div>
      </div>
    );
  }

  if (!allowNow) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-950 text-white px-6">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-extrabold mb-2">403 — Owner Only</h2>
          <p className="text-white/70 mb-6">{error || "This area is restricted to the project owner."}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate("/")} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold">
              Go Home
            </button>
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------- GAMIFIED PANEL -------------------- */
  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      {/* Deep gradient */}
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
        <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 via-yellow-300 to-pink-300 bg-clip-text text-transparent">
            IMALI Admin
          </h1>
          <div className="text-sm text-white/70">
            {account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Dev Mode"}
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
              className={`px-3 py-2 rounded-2xl border text-sm transition
                ${active === t.key ? "bg-white/15 border-white/30 shadow-[0_0_24px_-6px_rgba(255,255,255,0.35)]" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
              title={t.label}
            >
              <span className="mr-1">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <section className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-xl">
          {tabs.find((t) => t.key === active)?.render({ provider })}
        </section>

        {/* Hint */}
        <div className="mt-6 text-xs text-white/60">
          Pro-tip: Keep owner address synced — either{" "}
          <code className="text-white/80">IMALI.owner()</code> on-chain or{" "}
          <code className="text-white/80">VITE_OWNER_ADDRESS</code>/<code className="text-white/80">REACT_APP_OWNER_ADDRESS</code> in env.
        </div>
      </main>
    </div>
  );
}

/* -------------------- Utils -------------------- */
function numOrU(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/* -------------------- Placeholder Sections (keep your real ones if needed) -------------------- */
function TreasurySection() {
  return <div className="p-6 text-white/70">Treasury controls here…</div>;
}
function CexSection() {
  return <div className="p-6 text-white/70">CEX controls here…</div>;
}
function StocksSection() {
  return <div className="p-6 text-white/70">Stocks controls here…</div>;
}
