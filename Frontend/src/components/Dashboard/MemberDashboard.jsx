// src/components/Dashboard/MemberDashboard.jsx
import React, { useEffect, useState } from "react";
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

/* -------- Safe pick -------- */
const pick = (ns, name) =>
  (ns && (ns.default || ns[name])) ||
  (() => (
    <div className="p-4 border border-red-500/30 bg-red-500/10 text-red-200">
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

const ORDER = ["starter", "pro", "elite", "bundle"];
const tierAtLeast = (t, need) =>
  ORDER.indexOf(t) >= ORDER.indexOf(need);

function Locked({ need, onUpgrade }) {
  return (
    <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
      <div className="font-bold mb-2">🔒 {need.toUpperCase()} Required</div>
      <button
        onClick={onUpgrade}
        className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500"
      >
        Upgrade
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

  useEffect(() => {
    if (!account) return;
    getUserData(account).then(setUser).catch(() => {});
  }, [account, pathname]);

  useEffect(() => {
    axios.get("/api/sniper/trades").then(r => setTrades(r.data || [])).catch(() => {});
  }, []);

  const tier = (user?.tier || "starter").toLowerCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-6">

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">🚀 Member Dashboard</h1>

          {account ? (
            <div className="flex gap-2 items-center">
              <span className="text-xs bg-emerald-600/30 px-2 py-1 rounded">
                {short(account)} • {chainId}
              </span>
              <button onClick={disconnectWallet} className="btn">Disconnect</button>
            </div>
          ) : (
            <button onClick={connectWallet} className="btn bg-emerald-600">
              Connect Wallet
            </button>
          )}
        </div>

        <TierStatus />

        <Tabs selectedIndex={tab} onSelect={setTab}>
          <TabList>
            <Tab>Overview</Tab>
            <Tab>Extras</Tab>
            <Tab>Futures</Tab>
          </TabList>

          <TabPanel>
            <TradeDemo />
            <RecentTradesTable rows={trades} />
          </TabPanel>

          <TabPanel>
            <ImaliBalance />
            {tierAtLeast(tier, "pro") ? <Staking /> : <Locked need="pro" onUpgrade={() => nav("/pricing")} />}
            {tierAtLeast(tier, "elite") ? <YieldFarming /> : <Locked need="elite" onUpgrade={() => nav("/pricing")} />}
            {tierAtLeast(tier, "elite") ? <Lending /> : <Locked need="elite" onUpgrade={() => nav("/pricing")} />}
            {tierAtLeast(tier, "bundle") ? <LPLottery /> : <Locked need="bundle" onUpgrade={() => nav("/pricing")} />}
            <NFTPreview />
            <ReferralSystem />
          </TabPanel>

          <TabPanel>
            {tierAtLeast(tier, "elite") ? <Futures /> : <Locked need="elite" onUpgrade={() => nav("/pricing")} />}
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
