// src/components/Dashboard/MemberDashboard.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { getUserData } from "../../utils/firebase.js";
import { useWallet } from "../../getContractInstance";

/* -------- Modules (safe loaded) -------- */
import * as ImaliBalanceNS from "./ImaliBalance.jsx";
import * as StakingNS from "./Staking";
import * as LendingNS from "./Lending";
import * as YieldFarmingNS from "./YieldFarming";
import * as LPLotteryNS from "./LPLottery";
import * as NFTPreviewNS from "./NFTPreview.jsx";
import * as TierStatusNS from "./TierStatus.jsx";
import * as RecentTradesTableNS from "./RecentTradesTable.jsx";
import * as ReferralSystemNS from "../ReferralSystem.js";
import * as TradeDemoNS from "../../pages/TradeDemo.jsx";
import * as FuturesNS from "./Futures.jsx"; // 🔥 NEW

/* -------- Safe pick -------- */
const pick = (ns, name) =>
  (ns && (ns.default || ns[name])) ||
  (() => (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
      Missing component: <b>{name}</b>
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
const tierAtLeast = (t, need) =>
  ORDER.indexOf(t) >= ORDER.indexOf(need);

/* -------- Lock Panel -------- */
function Locked({ need, onUpgrade }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
      <div className="text-lg font-bold mb-2">
        🔒 Locked for {need.toUpperCase()}
      </div>
      <p className="text-sm text-white/70 mb-4">
        You’re <b>1 feature away</b> from unlocking this.
      </p>
      <button
        onClick={onUpgrade}
        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold"
      >
        Upgrade
      </button>
    </div>
  );
}

/* -------- Main -------- */
export default function MemberDashboard() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { account, chainId, connect, disconnect } = useEvmWallet();

  const [user, setUser] = useState(null);
  const [recentTrades, setRecentTrades] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  /* Load profile */
  useEffect(() => {
    if (!account) return;
    getUserData(account).then(setUser).catch(() => {});
  }, [account, pathname]);

  /* Load trades */
  useEffect(() => {
    axios
      .get("/api/sniper/trades")
      .then((r) => setRecentTrades(r.data || []))
      .catch(() => {});
  }, []);

  const tier = (user?.tier || "starter").toLowerCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h1 className="text-2xl font-extrabold">🚀 Member Dashboard</h1>

          {account ? (
            <div className="flex items-center gap-2">
              <span className="text-xs rounded-full bg-emerald-600/30 border border-emerald-400/30 px-2 py-1">
                {short(account)} • {chainId}
              </span>
              <button
                onClick={disconnect}
                className="text-xs px-3 py-2 rounded-lg border border-white/20 hover:bg-white/10"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500"
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Status */}
        <TierStatus />

        <Tabs selectedIndex={activeTab} onSelect={setActiveTab}>
          <TabList>
            <Tab>Overview</Tab>
            <Tab>Extras</Tab>
            <Tab>Futures</Tab> {/* 🔥 NEW */}
          </TabList>

          {/* OVERVIEW */}
          <TabPanel>
            <TradeDemo />
            <RecentTradesTable rows={recentTrades} />
          </TabPanel>

          {/* EXTRAS */}
          <TabPanel>
            <div className="grid gap-4">
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
          </TabPanel>

          {/* FUTURES */}
          <TabPanel>
            {tierAtLeast(tier, "elite") ? (
              <Futures />
            ) : (
              <Locked need="elite" onUpgrade={() => nav("/pricing")} />
            )}
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
