// src/components/Dashboard/MemberDashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { useLocation, useNavigate } from "react-router-dom";

import { getUserData } from "../../utils/firebase";
import { useWallet } from "../../context/WalletContext";
import { short } from "../../getContractInstance";

/* -------- Modules (safe loaded) -------- */
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

/* -------- Safe pick with fallback -------- */
const pick = (ns, name) => {
  try {
    const Component = ns?.default || ns?.[name];
    if (Component && typeof Component === 'function') {
      return Component;
    }
  } catch (error) {
    console.warn(`Failed to load component ${name}:`, error);
  }
  
  return () => (
    <div className="p-4 border border-red-500/30 bg-red-500/10 text-red-200 rounded-lg">
      Component "{name}" could not be loaded
    </div>
  );
};

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

const ORDER = ["starter", "pro", "elite", "bundle"];
const tierAtLeast = (t, need) => {
  const currentIndex = ORDER.indexOf((t || "").toLowerCase());
  const neededIndex = ORDER.indexOf(need);
  return currentIndex >= neededIndex;
};

function Locked({ need, onUpgrade }) {
  return (
    <div className="p-6 rounded-xl bg-gray-800/50 border border-gray-700 text-center">
      <div className="font-bold mb-2 text-lg">🔒 {need.toUpperCase()} Tier Required</div>
      <p className="text-gray-400 mb-4">Upgrade your plan to access this feature</p>
      <button
        onClick={onUpgrade}
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium"
      >
        Upgrade to {need.charAt(0).toUpperCase() + need.slice(1)}
      </button>
    </div>
  );
}

export default function MemberDashboard() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { account, chainId, connectWallet, disconnectWallet } = useWallet();

  const [user, setUser] = useState(null);
  const [trades, setTrades] = useState([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (!account) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userData = await getUserData(account);
        setUser(userData);
      } catch (err) {
        console.error("Failed to load user data:", err);
        setError("Failed to load user information");
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [account, pathname]);

  // Load trades
  useEffect(() => {
    const loadTrades = async () => {
      try {
        const response = await axios.get("/api/sniper/trades");
        setTrades(response?.data || []);
      } catch (err) {
        console.error("Failed to load trades:", err);
        // Don't set error here - trades are non-critical
      }
    };

    loadTrades();
  }, []);

  const handleConnect = useCallback(async () => {
    try {
      await connectWallet();
    } catch (err) {
      console.error("Wallet connection failed:", err);
      setError("Failed to connect wallet");
    }
  }, [connectWallet]);

  const tier = (user?.tier || "starter").toLowerCase();

  // Handle loading and error states
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <div className="text-red-400 text-2xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">🚀 Member Dashboard</h1>
            <p className="text-gray-400 mt-1">Welcome to your trading dashboard</p>
          </div>

          {account ? (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="text-sm bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-700">
                  <span className="font-mono">{short(account)}</span>
                  <span className="text-gray-400 ml-2">• Chain: {chainId || "Unknown"}</span>
                </div>
              </div>
              <button
                onClick={disconnectWallet}
                className="px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm font-medium"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium"
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Tier Status */}
        <div className="mb-8">
          <TierStatus />
        </div>

        {/* Tabs */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
          <Tabs selectedIndex={tab} onSelect={setTab}>
            <TabList className="flex border-b border-gray-800">
              {["Overview", "Extras", "Futures"].map((label, index) => (
                <Tab
                  key={label}
                  className={`px-6 py-3 cursor-pointer font-medium text-sm md:text-base ${
                    tab === index
                      ? "text-blue-400 border-b-2 border-blue-400"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                  selectedClassName="text-blue-400"
                >
                  {label}
                </Tab>
              ))}
            </TabList>

            <TabPanel className="p-4 md:p-6">
              <div className="space-y-8">
                <TradeDemo />
                <RecentTradesTable rows={trades} />
              </div>
            </TabPanel>

            <TabPanel className="p-4 md:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <ImaliBalance />
                  {tierAtLeast(tier, "pro") ? (
                    <Staking />
                  ) : (
                    <Locked need="pro" onUpgrade={() => nav("/pricing")} />
                  )}
                  {tierAtLeast(tier, "elite") ? (
                    <YieldFarming />
                  ) : (
                    <Locked need="elite" onUpgrade={() => nav("/pricing")} />
                  )}
                </div>
                <div className="space-y-6">
                  {tierAtLeast(tier, "elite") ? (
                    <Lending />
                  ) : (
                    <Locked need="elite" onUpgrade={() => nav("/pricing")} />
                  )}
                  {tierAtLeast(tier, "bundle") ? (
                    <LPLottery />
                  ) : (
                    <Locked need="bundle" onUpgrade={() => nav("/pricing")} />
                  )}
                  <NFTPreview />
                  <ReferralSystem />
                </div>
              </div>
            </TabPanel>

            <TabPanel className="p-4 md:p-6">
              {tierAtLeast(tier, "elite") ? (
                <Futures />
              ) : (
                <Locked need="elite" onUpgrade={() => nav("/pricing")} />
              )}
            </TabPanel>
          </Tabs>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Need help? Contact support@imali-defi.com</p>
          <p className="mt-1">Dashboard v1.0 • Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}