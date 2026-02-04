// src/components/Dashboard/MemberDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { Link, useLocation, useNavigate } from "react-router-dom";

// ✅ Utils (FIXED PATH FOR NETLIFY/LINUX BUILDS)
// This file lives at: src/components/Dashboard/MemberDashboard.jsx
// BotAPI lives at:      src/utils/BotAPI.js
// So the correct relative path is: ../../utils/BotAPI
import { BotAPI } from "../../utils/BotAPI";

// Firebase + wallet utils (existing in your project)
import { getUserData } from "../../utils/firebase.js";
import { useWallet, short } from "../../getContractInstance";

// Keep your Trade Demo + modules
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

// ✅ TradeOview/TradingOverview UI component (same look as your demo widget)
import TradingOverview from "./TradingOverview.jsx";

/* ---------------- Env (CRA + Vite friendly) ---------------- */
const DEMO_API =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_DEMO_API) ||
  process.env.REACT_APP_DEMO_API ||
  "http://localhost:5055";

const LIVE_API =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_LIVE_API) ||
  process.env.REACT_APP_LIVE_API ||
  "http://localhost:6066";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  process.env.REACT_APP_API_BASE ||
  DEMO_API;

/* ---------------- Safe pick helper ---------------- */
const pick = (ns, name) =>
  (ns && (ns.default || ns[name])) ||
  (() => (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
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

/* ---------------- Tier helpers ---------------- */
const TIER_ORDER = ["starter", "pro", "elite", "bundle"];

const lower = (v) => String(v || "").trim().toLowerCase();
const pretty = (v) => {
  const s = lower(v);
  if (!s) return "Starter";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function tierAtLeast(userTier, requiredTier) {
  const u = TIER_ORDER.indexOf(lower(userTier));
  const r = TIER_ORDER.indexOf(lower(requiredTier));
  if (u < 0 || r < 0) return false;
  return u >= r;
}

/* ---------------- Lock UI ---------------- */
function LockedPanel({ required = "pro", title = "Locked Feature", onUpgrade }) {
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-6">
      <div className="text-sm font-black text-white">{title}</div>
      <div className="mt-2 text-sm text-slate-300">
        This section unlocks on <span className="text-white font-semibold">{pretty(required)}</span>.
      </div>
      <button
        onClick={onUpgrade}
        className="mt-4 inline-flex items-center justify-center rounded-xl px-4 py-2 font-semibold border border-emerald-300 bg-emerald-600/90 hover:bg-emerald-600 text-white"
      >
        Upgrade
      </button>
      <div className="mt-3 text-xs text-slate-400">
        (Tab stays visible — it’s just gated so users can preview what’s available.)
      </div>
    </div>
  );
}

/* ---------------- Small UI bits (TradeOview-style) ---------------- */
function Strip({ left, right }) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs p-3 border-b border-slate-700/60 bg-slate-900/80 rounded-t-2xl">
      <div className="font-black text-white">{left}</div>
      <div className="ml-auto">{right}</div>
    </div>
  );
}

function Panel({ title, right, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-700/60 bg-slate-900/80 overflow-hidden ${className}`}>
      <Strip left={title} right={right} />
      <div className="p-4">{children}</div>
    </div>
  );
}

function Kpi({ label, value, sub }) {
  return (
    <div className="p-3 rounded-xl border border-slate-700/60 bg-slate-900/80">
      <div className="text-[11px] uppercase text-slate-300 tracking-wide">{label}</div>
      <div className="text-sm sm:text-base font-semibold break-all text-white">{value}</div>
      {sub ? <div className="mt-1 text-[11px] text-slate-400">{sub}</div> : null}
    </div>
  );
}

/* ---------------- Main Dashboard ---------------- */
export default function MemberDashboard() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { account, chainId, connect, disconnect } = useEvmWallet();

  const [activeTab, setActiveTab] = useState(0);

  // user + gating
  const [userData, setUserData] = useState(null);
  const tier = lower(userData?.tier || "starter");

  // balances + stats
  const [imaliBalance, setImaliBalance] = useState(0);
  const [sniperStats, setSniperStats] = useState({});
  const [recentTrades, setRecentTrades] = useState([]);

  // analytics (mirrors TradeOview + new dashboard)
  const [period, setPeriod] = useState("30d");
  const [interval, setInterval] = useState("daily");
  const [analytics, setAnalytics] = useState({ summary: {}, series: [], winloss: null });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Live PnL + wins/losses broadcast by TradeDemo (if your demo emits these events)
  const [demoHeader, setDemoHeader] = useState(null);
  const [lastSource, setLastSource] = useState(null); // "trade-demo" | "trade-live"
  useEffect(() => {
    function onDemo(e) {
      setDemoHeader(e.detail || null);
      setLastSource(e.detail?.source || null);
    }
    window.addEventListener("trade-demo:update", onDemo);
    return () => window.removeEventListener("trade-demo:update", onDemo);
  }, []);

  /* ---------------- Load profile (wallet-based Firebase) ---------------- */
  useEffect(() => {
    if (!account) return;
    (async () => {
      try {
        const data = await getUserData(account);
        if (!data) return;

        setUserData({
          ...data,
          wallet: account,
          tier: data.tier || "Starter",
          strategy: data.strategy || "ai_weighted",
          profitShareRate: data.profitShareRate || 30,
          profitCap: data.profitCap || 100,
          cumulativeProfit: data.cumulativeProfit || 0,
          referralCode: data.referralCode || "IMALI-N/A",
          referrals: data.referrals || 0,
          referralEarnings: data.referralEarnings || 0,
        });

        if (data.imaliBalance) setImaliBalance(Number(data.imaliBalance));
      } catch (e) {
        console.error("Failed to load user profile:", e);
      }
    })();
  }, [account, pathname]);

  /* ---------------- Load backend stats (existing endpoints) ---------------- */
  useEffect(() => {
    async function fetchData() {
      try {
        const [sniper, trades] = await Promise.all([
          axios.get(`${API_BASE}/sniper/metrics`, { timeout: 8000 }),
          axios.get(`${API_BASE}/sniper/trades`, { timeout: 8000 }),
        ]);
        setRecentTrades((trades.data || []).slice(0, 50));
        setSniperStats(sniper.data || {});
      } catch (error) {
        console.error("Dashboard data error:", error?.message || error);
      }
    }
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, []);

  /* ---------------- Load unified analytics via BotAPI (if available) ----------------
     This makes the dashboard match the “new” one that pulls:
       - /api/analytics/pnl/series
       - /api/analytics/winloss
       - /api/me
     If your backend requires auth cookies, this will work in the same origin.
  ------------------------------------------------------------------------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        // Try to load me + analytics (optional; if your backend isn't wired, dashboard still renders)
        const me = await BotAPI.me().catch(() => null);
        if (mounted && me?.user) {
          // prefer backend tier/strategy if present
          setUserData((prev) => ({
            ...(prev || {}),
            ...me.user,
            tier: me.user?.tier || prev?.tier || "Starter",
            strategy: me.user?.strategy || prev?.strategy || "ai_weighted",
          }));
        }

        const [pnlRes, wlRes] = await Promise.all([
          BotAPI.analyticsPnlSeries({ period, interval, chart_type: "cumulative" }).catch(() => null),
          BotAPI.analyticsWinLoss({ period }).catch(() => null),
        ]);

        if (!mounted) return;

        setAnalytics({
          summary: pnlRes?.summary || {},
          series: pnlRes?.series || [],
          winloss: wlRes?.win_loss || null,
        });
      } catch (e) {
        // Non-fatal; the dashboard still works with local endpoints
        if (mounted) setErr(e?.message || "Some analytics failed to load.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [period, interval]);

  /* ---------------- Derived: unified feed for TradingOverview ---------------- */
  const wins = Number(analytics.winloss?.winning_trades ?? demoHeader?.wins ?? 0);
  const losses = Number(analytics.winloss?.losing_trades ?? demoHeader?.losses ?? 0);
  const total = Math.max(0, wins + losses);

  const equityBase = 1000;
  const totalPnl = Number(analytics.summary?.total_pnl ?? sniperStats?.pnl ?? demoHeader?.pnl ?? 0);
  const equity = Number(demoHeader?.equity ?? (equityBase + totalPnl));
  const running = !!demoHeader?.running;

  const feed = useMemo(
    () => ({
      mode: lastSource === "trade-live" ? "live" : "demo",
      running,
      pnl: totalPnl,
      equity,
      balance: Number(demoHeader?.balance ?? 0),
      wins,
      losses,
      ts: Date.now(),
    }),
    [lastSource, running, totalPnl, equity, demoHeader, wins, losses]
  );

  // Progress bar (simple + visible)
  const winRate = total > 0 ? Math.round((wins / total) * 100) : Number(analytics.summary?.win_rate ?? sniperStats?.winRate ?? 0);
  const progressPct = running ? Math.max(5, Math.min(95, winRate)) : 12;

  /* ---------------- Gating: keep tabs visible, lock panels ---------------- */
  const canExtras = tierAtLeast(tier, "starter"); // always yes
  const canDeFi = tierAtLeast(tier, "pro"); // example gating: Pro+
  const canFutures = tierAtLeast(tier, "elite"); // Elite+ unlock example
  const canLottery = tierAtLeast(tier, "bundle"); // Bundle-only example

  /* ---------------- Render ---------------- */
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Page header (TradeOview style) */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="text-xl font-black text-white">Member Dashboard</div>
              <div className="text-xs text-slate-300">
                Same services as before — now styled like TradingOverview, with tier-locked tabs.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-sm"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                title="Time range"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>

              <select
                className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-sm"
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                title="Aggregation"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>

              <button
                onClick={() => nav("/trade-demo")}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold"
              >
                Open Demo
              </button>

              {/* Wallet connect */}
              {account ? (
                <>
                  <span className="text-xs rounded-full bg-emerald-600/20 border border-emerald-400/30 px-2 py-1">
                    {short(account)} {chainId ? `• Chain ${chainId}` : ""}
                  </span>
                  <button
                    onClick={disconnect}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={connect}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-300 text-xs font-semibold"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>

          {/* Quick KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 p-4 pt-0">
            <Kpi label="Tier" value={pretty(userData?.tier || "starter")} sub={`Strategy: ${pretty(userData?.strategy || "ai_weighted")}`} />
            <Kpi label="IMALI" value={`${Number(imaliBalance || 0).toFixed(2)}`} sub="Token balance" />
            <Kpi label="PnL" value={`${totalPnl >= 0 ? "+" : "-"}$${Math.abs(totalPnl).toFixed(2)}`} sub={running ? "Session running" : "Idle"} />
            <Kpi label="Equity" value={`$${Number(equity || 0).toFixed(2)}`} sub="Estimated" />
            <Kpi label="Win Rate" value={`${Number(winRate || 0)}%`} sub={`${wins}/${total} wins`} />
            <Kpi label="Source" value={lastSource === "trade-live" ? "LIVE" : "DEMO"} sub="Event feed" />
          </div>

          {/* Progress bar */}
          <div className="px-4 pb-4">
            <div className="h-2 w-full rounded bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-yellow-300 transition-[width] duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Progress is a quick read from recent win rate while the demo/live session runs.
            </div>
          </div>
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200 text-sm">
            {err}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-3 text-xs text-slate-400">Loading analytics…</div>
        ) : null}

        {/* Tabs */}
        <div className="mt-4">
          <Tabs selectedIndex={activeTab} onSelect={setActiveTab}>
            <TabList>
              <Tab>Overview</Tab>
              <Tab>Extras</Tab>
              <Tab>OKX Futures</Tab>
              <Tab>Lottery</Tab>
            </TabList>

            {/* ---------------- OVERVIEW ---------------- */}
            <TabPanel>
              <div className="mt-4 grid grid-cols-1 gap-4">
                <Panel
                  title="Trading Overview"
                  right={<span className="text-[11px] text-slate-300">{period} • {interval}</span>}
                >
                  <TradingOverview feed={feed} />
                  <div className="mt-3 text-[11px] text-slate-400">
                    This is the same visual language as TradeOview — now used across the dashboard.
                  </div>
                </Panel>

                <Panel title="Trade Demo" right={<span className="text-[11px] text-slate-300">Crypto & Stocks</span>}>
                  <div className="rounded-xl overflow-hidden bg-white">
                    <TradeDemo />
                  </div>
                  <div className="mt-3 text-[11px] text-slate-400">
                    Tip: Run Demo to push real-time updates into the Overview via window events.
                  </div>
                </Panel>

                <Panel title="Recent Trades" right={<span className="text-[11px] text-slate-300">Last 50</span>}>
                  <RecentTradesTable rows={recentTrades} />
                </Panel>
              </div>
            </TabPanel>

            {/* ---------------- EXTRAS (modules preserved) ---------------- */}
            <TabPanel>
              <div className="mt-4 grid grid-cols-1 gap-4">
                {/* Example: gate DeFi modules to Pro+ (tab stays visible, content locks) */}
                <Panel title="IMALI Balance & Tier" right={<span className="text-[11px] text-slate-300">Wallet perks</span>}>
                  <ImaliBalance />
                  <div className="mt-3">
                    <TierStatus />
                  </div>
                </Panel>

                <Panel title="Staking" right={<span className="text-[11px] text-slate-300">{pretty(tier)} access</span>}>
                  {canDeFi ? <Staking /> : <LockedPanel required="pro" title="Staking Locked" onUpgrade={() => nav("/pricing")} />}
                </Panel>

                <Panel title="Yield Farming" right={<span className="text-[11px] text-slate-300">{pretty(tier)} access</span>}>
                  {canDeFi ? <YieldFarming /> : <LockedPanel required="pro" title="Yield Farming Locked" onUpgrade={() => nav("/pricing")} />}
                </Panel>

                <Panel title="Lending" right={<span className="text-[11px] text-slate-300">{pretty(tier)} access</span>}>
                  {canDeFi ? <Lending /> : <LockedPanel required="pro" title="Lending Locked" onUpgrade={() => nav("/pricing")} />}
                </Panel>

                <Panel
                  title="Referral Partner Dashboard"
                  right={<Link to="/referral" className="text-xs underline text-slate-200">Open full</Link>}
                >
                  <ReferralSystem
                    referrals={userData?.referrals || 0}
                    earnings={userData?.referralEarnings || 0}
                    referralCode={userData?.referralCode || "IMALI-N/A"}
                  />
                </Panel>

                <Panel title="NFT Preview" right={<span className="text-[11px] text-slate-300">Collectibles</span>}>
                  <NFTPreview />
                </Panel>
              </div>
            </TabPanel>

            {/* ---------------- OKX FUTURES (LOCKED FOR ELITE+) ---------------- */}
            <TabPanel>
              <div className="mt-4">
                {!canFutures ? (
                  <LockedPanel
                    required="elite"
                    title="OKX Futures Locked"
                    onUpgrade={() => nav("/pricing")}
                  />
                ) : (
                  <Panel title="OKX Futures" right={<span className="text-[11px] text-slate-300">Elite+</span>}>
                    <div className="text-sm text-slate-300">
                      Futures execution module can render here (or route to your futures page).
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          setErr("");
                          await BotAPI.botStart({
                            mode: "live",
                            bot_type: "okx_futures",
                            market: "futures",
                            exchange: "okx",
                            label: "OKX Futures Bot",
                          });
                        } catch (e) {
                          setErr(e?.message || "Failed to start OKX Futures.");
                        }
                      }}
                      className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold"
                    >
                      Start OKX Futures Bot
                    </button>
                    <div className="mt-3 text-[11px] text-slate-400">
                      Note: Uses your existing generic /api/bot/start flow (via BotAPI.botStart).
                    </div>
                  </Panel>
                )}
              </div>
            </TabPanel>

            {/* ---------------- LOTTERY (LOCKED FOR BUNDLE) ---------------- */}
            <TabPanel>
              <div className="mt-4">
                {!canLottery ? (
                  <LockedPanel
                    required="bundle"
                    title="LP Lottery Locked"
                    onUpgrade={() => nav("/pricing")}
                  />
                ) : (
                  <Panel title="LP Lottery" right={<span className="text-[11px] text-slate-300">Bundle</span>}>
                    <LPLottery />
                  </Panel>
                )}
              </div>
            </TabPanel>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
