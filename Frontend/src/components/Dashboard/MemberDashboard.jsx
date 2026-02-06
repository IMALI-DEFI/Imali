// src/components/Dashboard/MemberDashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { useNavigate } from "react-router-dom";

/* ---------------- Wallet ---------------- */
import { useWallet } from "../../context/WalletContext";
import { short } from "../../getContractInstance";

/* ---------------- Feature Modules ---------------- */
import * as ImaliBalanceNS from "./ImaliBalance.jsx";
import * as StakingNS from "./Staking";
import * as YieldFarmingNS from "./YieldFarming";
import * as NFTPreviewNS from "./NFTPreview.jsx";
import * as TierStatusNS from "./TierStatus.jsx";
import * as RecentTradesTableNS from "./RecentTradesTable.jsx";
import * as ReferralSystemNS from "./ReferralSystem.js";
import * as TradeDemoNS from "../../pages/TradeDemo.jsx";
import * as FuturesNS from "./Futures.jsx";

/* ---------------- Safe Picker ---------------- */
const pick = (ns, name) =>
  ns?.default || ns?.[name] || (() => (
    <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm">
      ⚠️ {name} unavailable
    </div>
  ));

const ImaliBalance = pick(ImaliBalanceNS, "ImaliBalance");
const Staking = pick(StakingNS, "Staking");
const YieldFarming = pick(YieldFarmingNS, "YieldFarming");
const NFTPreview = pick(NFTPreviewNS, "NFTPreview");
const TierStatus = pick(TierStatusNS, "TierStatus");
const RecentTradesTable = pick(RecentTradesTableNS, "RecentTradesTable");
const ReferralSystem = pick(ReferralSystemNS, "ReferralSystem");
const TradeDemo = pick(TradeDemoNS, "TradeDemo");
const Futures = pick(FuturesNS, "Futures");

/* ---------------- API ---------------- */
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8001"
    : "https://api.imali-defi.com");

const TOKEN_KEY = "imali_token";

function getRawToken() {
  try {
    const t = localStorage.getItem(TOKEN_KEY) || "";
    return t.startsWith("jwt:") ? t.slice(4) : t;
  } catch {
    return "";
  }
}

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 20000,
});

api.interceptors.request.use((cfg) => {
  const token = getRawToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

/* ---------------- Tier Helpers ---------------- */
const ORDER = ["starter", "pro", "elite", "bundle"];
const tierAtLeast = (t, need) =>
  ORDER.indexOf(t) >= ORDER.indexOf(need);

/* ======================================================= */

export default function MemberDashboard() {
  const nav = useNavigate();
  const wallet = useWallet?.() ?? {};
  const { account, connectWallet, disconnectWallet } = wallet;

  /* ---------------- State ---------------- */
  const [user, setUser] = useState(null);
  const [trades, setTrades] = useState([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tradingEnabled, setTradingEnabled] = useState(true);
  const [stopping, setStopping] = useState(false);

  /* ---------------- Auth Guard ---------------- */
  useEffect(() => {
    if (!getRawToken()) nav("/login", { replace: true });
  }, [nav]);

  /* ---------------- Load User ---------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await api.get("/me");
        if (!mounted) return;

        setUser(res.data?.user || null);
        setTradingEnabled(res.data?.user?.tradingEnabled !== false);
      } catch (e) {
        if (!mounted) return;
        setError("Session expired. Please log in again.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------- Load Trades ---------------- */
  useEffect(() => {
    api.get("/sniper/trades")
      .then((r) => setTrades(r.data || []))
      .catch(() => {});
  }, []);

  const tier = (user?.tier || "starter").toLowerCase();

  /* ---------------- STOP TRADING ---------------- */
  const stopTrading = async () => {
    if (!window.confirm("⛔ This will immediately stop ALL trading. Continue?")) {
      return;
    }

    try {
      setStopping(true);
      await api.post("/trading/enable", { enabled: false });
      setTradingEnabled(false);
      alert("Trading has been stopped.");
    } catch {
      alert("Failed to stop trading. Please try again.");
    } finally {
      setStopping(false);
    }
  };

  /* ---------------- Loading / Error ---------------- */
  if (loading) {
    return <div className="min-h-screen bg-gray-950 p-6 text-white">Loading…</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => nav("/login")}
            className="px-6 py-2 rounded-lg bg-blue-600"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- Render ---------------- */
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-5 space-y-5">

        <h1 className="text-2xl font-bold">🚀 Dashboard</h1>

        <div
          className={`rounded-xl p-4 text-sm font-semibold ${
            tradingEnabled
              ? "bg-emerald-600/10 border border-emerald-500/40 text-emerald-300"
              : "bg-red-600/10 border border-red-500/40 text-red-300"
          }`}
        >
          {tradingEnabled ? "🟢 Trading is ACTIVE" : "⛔ Trading is STOPPED"}
        </div>

        {tradingEnabled && (
          <button
            onClick={stopTrading}
            disabled={stopping}
            className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 font-bold"
          >
            ⛔ STOP ALL TRADING
          </button>
        )}

        {account ? (
          <div className="flex items-center justify-between text-xs bg-gray-900 p-3 rounded-lg border border-gray-800">
            <span>{short(account)}</span>
            <button onClick={disconnectWallet} className="text-gray-400">
              Disconnect Wallet
            </button>
          </div>
        ) : (
          <button onClick={connectWallet} className="px-4 py-2 rounded-lg bg-blue-600">
            Connect Wallet
          </button>
        )}

        <TierStatus />

        <div className="bg-gray-900/60 rounded-xl border border-gray-800">
          <Tabs selectedIndex={tab} onSelect={setTab}>
            <TabList className="flex border-b border-gray-800">
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

            <TabPanel className="p-4 space-y-4">
              <TradeDemo />
              <RecentTradesTable rows={trades} />
            </TabPanel>

            <TabPanel className="p-4 space-y-4">
              <ImaliBalance />
              {tierAtLeast(tier, "pro") ? <Staking /> : <div className="text-sm text-gray-400">Upgrade to Pro for staking</div>}
              {tierAtLeast(tier, "elite") ? <YieldFarming /> : <div className="text-sm text-gray-400">Elite required for farming</div>}
              <NFTPreview />
              <ReferralSystem />
            </TabPanel>

            <TabPanel className="p-4">
              {tierAtLeast(tier, "elite") ? <Futures /> : <div className="text-sm text-gray-400">Elite required</div>}
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
