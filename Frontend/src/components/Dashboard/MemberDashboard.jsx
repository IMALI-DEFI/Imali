// src/components/Dashboard/MemberDashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { useNavigate } from "react-router-dom";

import { useWallet } from "../../context/WalletContext";
import { short } from "../../getContractInstance";

/* -------- Feature Modules (safe loaded) -------- */
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

/* -------- Safe component picker -------- */
const pick = (ns, name) =>
  ns?.default || ns?.[name] || (() => (
    <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200">
      Component <b>{name}</b> failed to load
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

/* -------- Tier helpers -------- */
const ORDER = ["starter", "pro", "elite", "bundle"];
const tierAtLeast = (tier, need) =>
  ORDER.indexOf(tier) >= ORDER.indexOf(need);

function Locked({ need, onUpgrade }) {
  return (
    <div className="p-6 rounded-xl bg-gray-800/50 border border-gray-700 text-center">
      <div className="font-bold mb-2 text-lg">🔒 {need.toUpperCase()} Required</div>
      <p className="text-gray-400 mb-4">Upgrade your plan to unlock this feature.</p>
      <button
        onClick={onUpgrade}
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium"
      >
        View Pricing
      </button>
    </div>
  );
}

export default function MemberDashboard() {
  const nav = useNavigate();
  const { account, chainId, connectWallet, disconnectWallet } = useWallet();

  const [user, setUser] = useState(null);
  const [trades, setTrades] = useState([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("imali_token");

  /* -------- Load user (JWT based) -------- */
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setError("Session expired. Please log in again.");
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data.user);
      } catch (e) {
        console.error(e);
        setError("Failed to load user profile.");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  /* -------- Load trades (non-blocking) -------- */
  useEffect(() => {
    if (!token) return;

    axios
      .get("/api/sniper/trades", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setTrades(r.data || []))
      .catch(() => {});
  }, [token]);

  const tier = (user?.tier || "starter").toLowerCase();

  const handleConnectWallet = useCallback(async () => {
    try {
      await connectWallet();
    } catch {
      setError("Wallet connection failed.");
    }
  }, [connectWallet]);

  /* -------- States -------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        Loading dashboard…
      </div>
    );
  }

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

  /* -------- Render -------- */
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold">🚀 Member Dashboard</h1>
            <p className="text-gray-400">Plan: {tier.toUpperCase()}</p>
          </div>

          {account ? (
            <div className="flex items-center gap-3">
              <div className="text-sm bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700">
                {short(account)} • Chain {chainId || "?"}
              </div>
              <button
                onClick={disconnectWallet}
                className="px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectWallet}
              className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500"
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Tier Status */}
        <div className="mb-6">
          <TierStatus />
        </div>

        {/* Tabs */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-800">
          <Tabs selectedIndex={tab} onSelect={setTab}>
            <TabList className="flex border-b border-gray-800">
              {["Overview", "Extras", "Futures"].map((label, i) => (
                <Tab
                  key={label}
                  className={`px-6 py-3 cursor-pointer ${
                    tab === i ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400"
                  }`}
                >
                  {label}
                </Tab>
              ))}
            </TabList>

            <TabPanel className="p-6 space-y-6">
              <TradeDemo />
              <RecentTradesTable rows={trades} />
            </TabPanel>

            <TabPanel className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <ImaliBalance />
                {tierAtLeast(tier, "pro") ? <Staking /> : <Locked need="pro" onUpgrade={() => nav("/pricing")} />}
                {tierAtLeast(tier, "elite") ? <YieldFarming /> : <Locked need="elite" onUpgrade={() => nav("/pricing")} />}
              </div>
              <div className="space-y-6">
                {tierAtLeast(tier, "elite") ? <Lending /> : <Locked need="elite" onUpgrade={() => nav("/pricing")} />}
                {tierAtLeast(tier, "bundle") ? <LPLottery /> : <Locked need="bundle" onUpgrade={() => nav("/pricing")} />}
                <NFTPreview />
                <ReferralSystem />
              </div>
            </TabPanel>

            <TabPanel className="p-6">
              {tierAtLeast(tier, "elite") ? <Futures /> : <Locked need="elite" onUpgrade={() => nav("/pricing")} />}
            </TabPanel>
          </Tabs>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          Need help? support@imali-defi.com
        </div>
      </div>
    </div>
  );
}
