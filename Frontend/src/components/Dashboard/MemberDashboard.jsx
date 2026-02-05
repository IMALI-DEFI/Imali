import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { useNavigate } from "react-router-dom";

/* ---------------- Wallet (SAFE) ---------------- */
import { useWallet } from "../../context/WalletContext";
import { short } from "../../getContractInstance";

/* ---------------- Feature Modules (SAFE LOAD) ---------------- */
import * as ImaliBalanceNS from "./ImaliBalance.jsx";
import * as StakingNS from "./Staking";
import * as LendingNS from "./Lending";
import * as YieldFarmingNS from "./YieldFarming";
import * as LPLotteryNS from "./LPLottery";
import * as NFTPreviewNS from "./NFTPreview.jsx";
import * as TierStatusNS from "./TierStatus.jsx";
import * as RecentTradesTableNS from "./RecentTradesTable.jsx";
import * as ReferralSystemNS from "./ReferralSystem.js";
import * as TradeDemoNS from "../../pages/TradeDemo.jsx";
import * as FuturesNS from "./Futures.jsx";

/* ---------------- Safe Component Picker ---------------- */
const pick = (ns, name) =>
  ns?.default || ns?.[name] || (() => (
    <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm">
      ⚠️ {name} unavailable
    </div>
  ));

const ImaliBalance = pick(ImaliBalanceNS, "ImaliBalance");
const Staking = pick(StakingNS, "Staking");
const Lending = pick(LendingNS, "Lending");
const YieldFarming = pick(YieldFarmingNS, "YieldFarming");
const LPLottery = pick(LPLotteryNS, "LPLottery");
const NFTPreview = pick(NFTPreviewNS, "NFTPreview");
const TierStatus = pick(TierStatusNS, "TierStatus");
const RecentTradesTable = pick(RecentTradesTableNS, "RecentTradesTable");
const ReferralSystem = pick(ReferralSystemNS, "ReferralSystem");
const TradeDemo = pick(TradeDemoNS, "TradeDemo");
const Futures = pick(FuturesNS, "Futures");

/* ---------------- Tier Helpers ---------------- */
const ORDER = ["starter", "pro", "elite", "bundle"];
const tierAtLeast = (t, need) =>
  ORDER.indexOf(t) >= ORDER.indexOf(need);

/* ---------------- UI Helpers ---------------- */
function Skeleton({ h = 20 }) {
  return (
    <div
      className="animate-pulse rounded-lg bg-gray-800/60"
      style={{ height: h }}
    />
  );
}

function Locked({ need, message, onUpgrade }) {
  return (
    <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 text-center text-sm">
      <div className="font-semibold mb-1">🔒 {need.toUpperCase()} Required</div>
      <p className="text-gray-400 mb-3">{message}</p>
      <button
        onClick={onUpgrade}
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium text-sm"
      >
        View Plans
      </button>
    </div>
  );
}

function ConnectBanner({ onConnect }) {
  return (
    <div className="p-4 rounded-xl bg-blue-600/10 border border-blue-500/30 text-center text-sm">
      <p className="mb-2 font-medium">🔑 Connect your wallet to unlock features</p>
      <button
        onClick={onConnect}
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500"
      >
        Connect Wallet
      </button>
    </div>
  );
}

/* ======================================================= */

export default function MemberDashboard() {
  const nav = useNavigate();

  /* ---------- Wallet SAFE ACCESS ---------- */
  const wallet = useWallet?.() ?? {};
  const account = wallet.account ?? null;
  const chainId = wallet.chainId ?? null;
  const connectWallet = wallet.connectWallet ?? (() => {});
  const disconnectWallet = wallet.disconnectWallet ?? (() => {});

  /* ---------- State ---------- */
  const [user, setUser] = useState(null);
  const [trades, setTrades] = useState([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("imali_token");

  /* ---------- HARD AUTH GUARD ---------- */
  useEffect(() => {
    if (!token) {
      nav("/login", { replace: true });
    }
  }, [token, nav]);

  /* ---------- Load User ---------- */
  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        const res = await axios.get("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data?.user || null);
      } catch {
        setError("Session expired. Please log in again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  /* ---------- Load Trades (non-blocking) ---------- */
  useEffect(() => {
    if (!token) return;

    axios
      .get("/api/sniper/trades", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(r => setTrades(r.data || []))
      .catch(() => {});
  }, [token]);

  const tier = (user?.tier || "starter").toLowerCase();

  /* ---------- Recommended Logic ---------- */
  const recommended =
    !account
      ? "Connect wallet to start earning"
      : tier === "starter"
      ? "Upgrade to Pro for staking rewards"
      : tier === "pro"
      ? "Elite unlocks lending + farming"
      : "You have full access";

  const handleConnect = useCallback(async () => {
    try {
      await connectWallet();
    } catch {
      setError("Wallet connection failed.");
    }
  }, [connectWallet]);

  /* ---------- LOADING ---------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 p-6 space-y-4">
        <Skeleton h={28} />
        <Skeleton h={60} />
        <Skeleton h={200} />
      </div>
    );
  }

  /* ---------- ERROR ---------- */
  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center text-center p-6">
        <div>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => nav("/login")}
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  /* ---------- RENDER ---------- */
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-5 space-y-5">

        {/* Header (Mobile-tight) */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">🚀 Dashboard</h1>
          <p className="text-gray-400 text-sm">{recommended}</p>

          {account ? (
            <div className="flex items-center justify-between text-xs bg-gray-900 p-3 rounded-lg border border-gray-800">
              <span>{short(account)}</span>
              <button onClick={disconnectWallet} className="text-red-400">
                Disconnect
              </button>
            </div>
          ) : (
            <ConnectBanner onConnect={handleConnect} />
          )}
        </div>

        {/* Tier */}
        <TierStatus />

        {/* Tabs */}
        <div className="bg-gray-900/60 rounded-xl border border-gray-800">
          <Tabs selectedIndex={tab} onSelect={setTab}>
            <TabList className="flex text-sm border-b border-gray-800">
              {["Overview", "Extras", "Futures"].map((t, i) => (
                <Tab
                  key={t}
                  className={`px-4 py-3 cursor-pointer ${
                    tab === i
                      ? "text-blue-400 border-b-2 border-blue-400"
                      : "text-gray-400"
                  }`}
                >
                  {t}
                </Tab>
              ))}
            </TabList>

            {/* Overview */}
            <TabPanel className="p-4 space-y-4">
              <TradeDemo />
              <RecentTradesTable rows={trades} />
            </TabPanel>

            {/* Extras */}
            <TabPanel className="p-4 space-y-4">
              <ImaliBalance />

              {tierAtLeast(tier, "pro")
                ? <Staking />
                : <Locked need="Pro" message="Earn passive staking rewards" onUpgrade={() => nav("/pricing")} />}

              {tierAtLeast(tier, "elite")
                ? <YieldFarming />
                : <Locked need="Elite" message="Unlock yield farming + lending" onUpgrade={() => nav("/pricing")} />}

              <NFTPreview />
              <ReferralSystem />
            </TabPanel>

            {/* Futures */}
            <TabPanel className="p-4">
              {tierAtLeast(tier, "elite")
                ? <Futures />
                : <Locked need="Elite" message="Advanced futures trading access" onUpgrade={() => nav("/pricing")} />}
            </TabPanel>
          </Tabs>
        </div>

        <p className="text-xs text-center text-gray-500">
          Need help? support@imali-defi.com
        </p>
      </div>
    </div>
  );
}
