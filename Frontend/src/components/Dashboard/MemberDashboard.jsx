// src/components/Dashboard/MemberDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { Link, useLocation } from "react-router-dom";

import { BotAPI } from "../../utils/api.js";
import { getUserData } from "../../utils/firebase.js";
import { useWallet } from "../../context/WalletContext.js";
import { short } from "../../getContractInstance.js";

// Child modules
import * as ImaliBalanceNS from "./ImaliBalance.jsx";
import * as StakingNS from "./Staking.js";
import * as LendingNS from "./Lending.js";
import * as YieldFarmingNS from "./YieldFarming.jsx";
import * as LPLotteryNS from "./LPLottery.js";
import * as NFTPreviewNS from "./NFTPreview.jsx";
import * as RecentTradesTableNS from "./RecentTradesTable.jsx";
import * as ReferralSystemNS from "../ReferralSystem.js";
import * as TradeDemoNS from "../../pages/TradeDemo.jsx";

// ✅ New: Live overview component that listens to TradeDemo window events too
import TradingOverview from "./TradingOverview.jsx";

/* ---------------- Env (CRA + Vite, no dynamic process usage) ---------------- */
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

const MODE_ENV =
  (typeof import.meta !== "undefined" && import.meta.env && (import.meta.env.VITE_MODE || "").toLowerCase()) ||
  (process.env.REACT_APP_MODE || "").toLowerCase();

/* ---------------- Safe pick helper ---------------- */
const pick = (ns, name) =>
  (ns && (ns.default || ns[name])) ||
  (() => (
    <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
      Missing component: <b>{name}</b>
    </div>
  ));

const ImaliBalance = pick(ImaliBalanceNS, "ImaliBalance");
const Staking = pick(StakingNS, "Staking");
const Lending = pick(LendingNS, "Lending");
const YieldFarming = pick(YieldFarmingNS, "YieldFarming");
const LPLottery = pick(LPLotteryNS, "LPLottery");
const NFTPreview = pick(NFTPreviewNS, "NFTPreview");
const RecentTradesTable = pick(RecentTradesTableNS, "RecentTradesTable");
const ReferralSystem = pick(ReferralSystemNS, "ReferralSystem");
const TradeDemo = pick(TradeDemoNS, "TradeDemo");

/* ---------------- Small UI bits ---------------- */
function InfoBubble({ text }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="h-8 w-8 rounded-full border border-white/30 text-sm font-bold text-white/90 hover:bg-white/10 flex items-center justify-center"
        title="What is this?"
      >
        ℹ️
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-3 w-80 rounded-2xl border border-white/10 bg-black/95 p-4 text-[13px] leading-relaxed text-white shadow-2xl">
          {text}
        </div>
      )}
    </div>
  );
}

function ExpandableCard({
  id,
  title,
  subtitle,
  right,
  info,
  children,
  open = true,
  onToggle = () => {},
  priority = false,
  innerRef,
}) {
  return (
    <div
      ref={innerRef}
      data-tour-id={id}
      className={`rounded-2xl border border-white/10 bg-gradient-to-br from-purple-700/20 via-indigo-700/20 to-pink-700/20 shadow-lg ${
        priority ? "ring-1 ring-emerald-400/40" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 rounded-2xl"
        aria-expanded={open}
        aria-controls={`panel-${id}`}
      >
        <div className="min-w-0 flex items-center gap-3">
          <h3 className="text-lg font-extrabold leading-tight text-white">
            {title}{" "}
            {subtitle && (
              <span className="opacity-70">
                {" "}
                • <span className="text-pink-200">{subtitle}</span>
              </span>
            )}
          </h3>
          {info && <InfoBubble text={info} />}
        </div>
        <div className="flex items-center gap-3">
          {right}
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-xs transition-transform ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          >
            ▾
          </span>
        </div>
      </button>
      {open && (
        <div id={`panel-${id}`} className="px-4 pb-4 pt-0">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">{children}</div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Lightweight Guided Tour ---------------- */
function useTour(steps, { onClose, activeTab, setActiveTab }) {
  const [idx, setIdx] = useState(-1);
  const [targetRect, setTargetRect] = useState(null);
  const current = idx >= 0 ? steps[idx] : null;

  const queryWithRetry = (selector, { attempts = 12, interval = 80 } = {}) =>
    new Promise((resolve) => {
      let tries = 0;
      const tick = () => {
        const el = selector ? document.querySelector(selector) : null;
        if (el) return resolve(el);
        tries += 1;
        if (tries >= attempts) return resolve(null);
        setTimeout(tick, interval);
      };
      tick();
    });

  const focusTarget = async (selector) => {
    const el = await queryWithRetry(selector);
    if (el) {
      const r = el.getBoundingClientRect();
      const rect = {
        top: r.top + window.scrollY,
        left: r.left + window.scrollX,
        width: r.width,
        height: r.height,
      };
      setTargetRect(rect);
      const viewportH = window.innerHeight;
      const desiredTop = Math.max(0, rect.top - Math.max(120, viewportH * 0.25));
      window.scrollTo({ top: desiredTop, behavior: "smooth" });
    } else {
      setTargetRect(null);
    }
  };

  const go = async (i) => {
    if (i < 0 || i >= steps.length) {
      setIdx(-1);
      setTargetRect(null);
      onClose?.();
      return;
    }
    const step = steps[i];
    if (typeof step.tabIndex === "number" && step.tabIndex !== activeTab) {
      setActiveTab(step.tabIndex);
      setTimeout(async () => {
        setIdx(i);
        await focusTarget(step.selector);
      }, 50);
    } else {
      setIdx(i);
      await focusTarget(step.selector);
    }
  };

  const start = () => go(0);
  const next = () => go(idx + 1);
  const prev = () => go(idx - 1);
  const stop = () => go(steps.length);

  useEffect(() => {
    if (idx < 0 || !current?.selector) return;
    const update = () => {
      const el = document.querySelector(current.selector);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setTargetRect({
        top: r.top + window.scrollY,
        left: r.left + window.scrollX,
        width: r.width,
        height: r.height,
      });
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [idx, current]);

  useEffect(() => {
    if (idx < 0) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        stop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx]);

  return { idx, current, targetRect, start, next, prev, stop, isActive: idx >= 0 };
}

function TourOverlay({ isActive, step, targetRect, onNext, onPrev, onClose, idx, total }) {
  if (!isActive || !step) return null;

  const viewportTop = window.scrollY;
  const viewportH = window.innerHeight;
  const inLowerHalf = targetRect && targetRect.top - viewportTop > viewportH * 0.55;

  const tooltipStyle = targetRect
    ? inLowerHalf
      ? {
          top: Math.max(viewportTop + 16, targetRect.top - 260),
          left: Math.min(targetRect.left, window.scrollX + window.innerWidth - 420),
        }
      : {
          top: Math.min(targetRect.top + targetRect.height + 12, viewportTop + viewportH - 260),
          left: Math.min(targetRect.left, window.scrollX + window.innerWidth - 420),
        }
    : { top: viewportTop + 80, left: window.scrollX + 20 };

  return (
    <div className="fixed inset-0 z-[1000] pointer-events-none">
      <div className="absolute inset-0 bg-black/60" />

      {targetRect && (
        <div
          className="absolute border-2 border-emerald-300/80 rounded-xl pointer-events-none"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
          }}
        />
      )}

      <div
        className="absolute w-[360px] md:w-[420px] rounded-2xl border border-white/10 bg-slate-900/95 text-white p-4 pointer-events-auto"
        style={tooltipStyle}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-emerald-300/90">
              Step {idx + 1} of {total}
            </div>
            <div className="mt-1 text-base md:text-lg font-extrabold">{step.title}</div>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <button onClick={onPrev} className="text-[11px] px-2 py-1 rounded-md border border-white/20 hover:bg-white/10">
              Back
            </button>
            <button
              onClick={onNext}
              className="text-[11px] px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 border border-emerald-300"
            >
              {idx + 1 >= total ? "Finish" : "Next"}
            </button>
          </div>
        </div>

        <div className="mt-2 text-[13px] md:text-[14px] leading-relaxed text-slate-100">{step.body}</div>

        {step.points?.length > 0 && (
          <ul className="mt-2 text-[13px] leading-relaxed text-emerald-200 list-disc pl-5">
            {step.points.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <button onClick={onClose} className="text-xs px-3 py-1 rounded-lg border border-white/20 hover:bg-white/10">
            Skip
          </button>
          <div className="flex gap-2">
            <button onClick={onPrev} className="text-xs px-3 py-1 rounded-lg border border-white/20 hover:bg-white/10">
              Back (←)
            </button>
            <button
              onClick={onNext}
              className="text-xs px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-300"
            >
              {idx + 1 >= total ? "Finish" : "Next (→/Enter)"}
            </button>
          </div>
        </div>
      </div>

      <div className="pointer-events-auto fixed top-3 right-3 z-[1001]">
        <div className="rounded-xl border border-white/10 bg-slate-900/85 backdrop-blur px-2 py-1 flex items-center gap-2">
          <span className="text-[11px] text-slate-100 hidden sm:inline">{step.title}</span>
          <button onClick={onPrev} className="text-[11px] px-2 py-0.5 rounded-md border border-white/20 hover:bg-white/10">
            Back
          </button>
          <button
            onClick={onNext}
            className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-500 border border-emerald-300"
          >
            {idx + 1 >= total ? "Finish" : "Next"}
          </button>
          <button onClick={onClose} className="text-[11px] px-2 py-0.5 rounded-md border border-white/20 hover:bg-white/10">
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Dashboard ---------------- */
export default function MemberDashboard() {
  const { pathname } = useLocation();
  const { account, chainId, connect, disconnect } = useWallet();

  const [userData, setUserData] = useState(null);
  const [imaliBalance, setImaliBalance] = useState(0);

  // backend stats + trades (for LIVE or fallback)
  const [sniperStats, setSniperStats] = useState({});
  const [recentTrades, setRecentTrades] = useState([]);

  // UI
  const [activeTab, setActiveTab] = useState(0);
  const [openCards, setOpenCards] = useState({
    "trade-demo-card": true,
    "recent-trades-card": false,
  });

  // live broadcast from TradeDemo
  const [demoHeader, setDemoHeader] = useState(null);
  const [lastSource, setLastSource] = useState(null);

  useEffect(() => {
    function onDemo(e) {
      const d = e.detail || null;
      setDemoHeader(d);
      setLastSource(d?.source || null);
    }
    window.addEventListener("trade-demo:update", onDemo);
    return () => window.removeEventListener("trade-demo:update", onDemo);
  }, []);

  const refTradeDemo = useRef(null);

  /* Profile */
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
          referralCode: data.referralCode || "IMALI-N/A",
          referrals: data.referrals || 0,
          referralEarnings: data.referralEarnings || 0,
        });
        if (data.imaliBalance) setImaliBalance(data.imaliBalance);
      } catch (e) {
        console.error("Failed to load user profile:", e);
      }
    })();
  }, [account, pathname]);

  /* Decide mode:
     - Prefer TradeDemo event mode when present (because it’s the UI engine)
     - Fall back to env MODE
     - Also treat API_BASE === LIVE_API as live
  */
  const mode = String(demoHeader?.mode || MODE_ENV || (API_BASE === LIVE_API ? "live" : "demo")).toLowerCase();
  const isLive = mode === "live";

  /* Backend fetch (LIVE stats + trades OR fallback for demo pages) */
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [pnl, trades] = await Promise.all([
          BotAPI.getPnLSummary({ wallet: account || "" }),
          BotAPI.getRecentTrades({ wallet: account || "", limit: 50 }),
        ]);
        if (cancelled) return;

        const pnlObj = pnl && typeof pnl === "object" ? pnl : {};
        const tradesArr = Array.isArray(trades) ? trades : trades?.trades || [];
        setSniperStats(pnlObj);
        setRecentTrades((tradesArr || []).slice(0, 50));
      } catch (error) {
        if (cancelled) return;
        console.error("Dashboard data error:", error?.message || error);
      }
    }

    fetchData();
    const id = window.setInterval(fetchData, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [account]);

  /* Derived UI */
  const tier = userData?.tier || "Starter";

  // unified feed for TradingOverview (prefer demoHeader, fall back to backend)
  const overviewFeed = useMemo(() => {
    const d = demoHeader || {};
    const s = sniperStats || {};
    const feed = {
      source: d.source || (isLive ? "trade-live" : "trade-demo"),
      mode: mode,
      running: !!d.running,
      pnl: Number.isFinite(d.pnl) ? Number(d.pnl) : Number(s.pnl || 0),
      equity: Number.isFinite(d.equity) ? Number(d.equity) : Number(s.equity || 0),
      balance: Number.isFinite(d.balance) ? Number(d.balance) : Number(s.balance || 0),
      wins: Number.isFinite(d.wins) ? Number(d.wins) : Number(s.wins || 0),
      losses: Number.isFinite(d.losses) ? Number(d.losses) : Number(s.losses || 0),
      ts: d.ts || Date.now(),
      venues: Array.isArray(d.venues) ? d.venues : d.venue ? [d.venue] : [],
    };
    return feed;
  }, [demoHeader, sniperStats, isLive, mode]);

  const toggleCard = (id) => {
    setOpenCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  /* ---------------- Guided Tour Content ---------------- */
  const tourSteps = useMemo(
    () => [
      {
        selector: '[data-tour-id="header"]',
        tabIndex: 0,
        title: "Your Member Hub",
        body:
          "This is your control room. Run the simulator (or live when enabled), see results instantly, and explore staking + referrals.",
        points: ["The LIVE/DEMO badge reflects the active engine.", "The overview updates in real-time from the Trade Demo feed."],
      },
      {
        selector: '[data-tour-id="promo-overview"]',
        tabIndex: 0,
        title: "Trading Overview",
        body:
          "This mirrors the Trade Demo: equity curve, win/loss, and gross PnL. It stays in sync while the bot runs.",
        points: ["If the demo is running, this panel is the source of truth.", "If the demo is idle, it falls back to backend stats."],
      },
      {
        selector: '[data-tour-id="promo-balance"]',
        tabIndex: 0,
        title: "IMALI Balance & Tier",
        body: "Your tier and IMALI balance unlock perks across the app (discounts, staking boosts, access).",
        points: ["Hold IMALI to strengthen your tier perks.", "Staking modules live in the Extras tab."],
      },
      {
        selector: '[data-tour-id="trade-demo-card"]',
        tabIndex: 0,
        title: "Trade Demo",
        body:
          "Choose venue (New Crypto / Established Crypto / Both / Stocks), pick a strategy, then Start. It broadcasts live updates to the overview above.",
        points: ["Demo is risk-free.", "Live mode requires eligibility and a connected wallet."],
      },
      {
        selector: '[data-tour-id="recent-trades-card"]',
        tabIndex: 0,
        title: "Recent Trades",
        body: "This table shows your latest fills and PnL from the backend feed.",
      },
      {
        selector: '[data-tour-id="extras-tab"]',
        tabIndex: 1,
        title: "Extras",
        body: "Stake, farm, borrow/lend, referrals, lottery, and NFTs live here.",
      },
    ],
    []
  );

  const [tourOpen, setTourOpen] = useState(false);
  const { idx, current, targetRect, start, next, prev, stop, isActive } = useTour(tourSteps, {
    onClose: () => setTourOpen(false),
    activeTab,
    setActiveTab,
  });

  return (
    <div className="relative bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* HEADER */}
        <div data-tour-id="header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">🎮 Member Hub</h1>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-[10px] rounded-full px-2 py-1 border ${
                isLive ? "border-emerald-300/40 bg-emerald-600/40" : "border-amber-300/40 bg-amber-600/40"
              }`}
              title={`API_BASE: ${API_BASE}\nDEMO_API: ${DEMO_API}\nLIVE_API: ${LIVE_API}`}
            >
              {isLive ? "LIVE" : "DEMO"}
            </span>

            <span className="text-[10px] rounded-full px-2 py-1 border border-white/20 bg-white/10">
              Source: <b>{lastSource === "trade-live" ? "LIVE" : "DEMO"}</b>
            </span>

            <button
              onClick={() => {
                setTourOpen(true);
                start();
              }}
              className="text-xs px-3 py-2 rounded-lg border bg-emerald-700/40 border-emerald-400/40 text-emerald-100 hover:bg-emerald-700/60"
              title="Start a guided tour"
            >
              Start Guided Tour
            </button>

            {account ? (
              <>
                <span className="text-xs rounded-full bg-black/30 border border-white/15 px-2 py-1">
                  {short(account)} {chainId ? `• Chain ${chainId}` : ""}
                </span>
                <button
                  onClick={disconnect}
                  className="text-xs px-3 py-2 rounded-lg border bg-black/30 border-white/15 hover:bg-black/40"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={connect}
                className="text-xs px-3 py-2 rounded-lg border bg-emerald-700/40 border-emerald-400/40 text-emerald-100 hover:bg-emerald-700/60"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        {/* TOP STRIP (mirrors Demo tone) */}
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* TradingOverview (mirrors demo output + live) */}
          <div data-tour-id="promo-overview" className="rounded-2xl border border-white/10 overflow-hidden bg-black/20">
            <TradingOverview feed={overviewFeed} stats={sniperStats || {}} />
            <div className="px-4 pb-4 text-[11px] text-white/70">
              This panel stays synced while the Trade Demo runs. When idle, it falls back to backend summaries.
            </div>
          </div>

          {/* IMALI Balance / Tier */}
          <div data-tour-id="promo-balance" className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/80">IMALI Balance</div>
              <span className="inline-flex items-center rounded-full bg-black/30 px-3 py-1 text-xs font-semibold border border-white/10">
                Tier: {tier}
              </span>
            </div>
            <div className="mt-2 text-3xl font-extrabold">{Number(imaliBalance).toFixed(2)} IMALI</div>
            <div className="text-xs text-white/70 mt-1">
              Hold IMALI for perks & staking rewards. Visit <b>Extras</b> to stake and earn.
            </div>

            {/* Optional: quick link */}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setActiveTab(1)}
                className="text-xs px-3 py-2 rounded-lg border bg-black/30 border-white/15 hover:bg-black/40"
              >
                Go to Extras
              </button>
              <Link
                to="/pricing"
                className="text-xs px-3 py-2 rounded-lg border bg-emerald-700/30 border-emerald-300/30 hover:bg-emerald-700/45"
              >
                Upgrade
              </Link>
            </div>
          </div>

          {/* Status / Guidance (demo-like wording) */}
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/80">Quick Start</div>
              <span className="text-[10px] rounded-full border border-white/20 bg-white/10 px-2 py-0.5">
                {overviewFeed?.running ? "SESSION ACTIVE" : "READY"}
              </span>
            </div>

            <div className="mt-3 text-sm text-white/80 leading-relaxed">
              1) Open <b>Trade Demo</b> below<br />
              2) Choose a venue (New Crypto / Established Crypto / Both / Stocks)<br />
              3) Pick a strategy and press <b>Start</b>
            </div>

            <div className="mt-3 text-[11px] text-white/60">
              Demo is risk-free. Live runs only when your account is eligible and configured.
            </div>

            <div className="mt-3 text-xs text-white/70">
              Current engine:{" "}
              <b className={isLive ? "text-emerald-200" : "text-amber-200"}>{isLive ? "LIVE" : "DEMO"}</b> • API_BASE:{" "}
              <b>{API_BASE}</b>
            </div>
          </div>
        </div>

        <Tabs selectedIndex={activeTab} onSelect={setActiveTab}>
          <TabList>
            <Tab>Overview</Tab>
            <Tab data-tour-id="extras-tab">Extras</Tab>
          </TabList>

          {/* OVERVIEW */}
          <TabPanel>
            <div className="grid grid-cols-1 gap-4">
              <ExpandableCard
                innerRef={refTradeDemo}
                id="trade-demo-card"
                title="Trade Demo"
                subtitle="Crypto & Stocks (Demo or Live)"
                info="Choose venue + strategy inside. Start runs an automated session and broadcasts updates to Trading Overview."
                priority
                open={!!openCards["trade-demo-card"]}
                onToggle={toggleCard}
              >
                <div className="rounded-xl overflow-hidden bg-white">
                  <TradeDemo />
                </div>

                <div className="mt-3 text-[12px] text-white/80">
                  Tip: keep this open while running to see markers and the live trade tape.
                </div>
              </ExpandableCard>

              <ExpandableCard
                id="recent-trades-card"
                title="Recent Trades"
                subtitle="Backend feed (fills + PnL)"
                info="Your latest trades from the backend. This complements the demo tape."
                open={!!openCards["recent-trades-card"]}
                onToggle={toggleCard}
              >
                <RecentTradesTable rows={recentTrades} />
              </ExpandableCard>
            </div>
          </TabPanel>

          {/* EXTRAS */}
          <TabPanel>
            <div className="grid grid-cols-1 gap-4">
              <ExpandableCard id="staking-card" title="Staking" subtitle="Earn rewards" info="Stake IMALI / LP tokens and compound over time.">
                <Staking />
              </ExpandableCard>

              <ExpandableCard id="yield-card" title="Yield Farming" subtitle="LP rewards" info="Provide liquidity and farm IMALI.">
                <YieldFarming />
              </ExpandableCard>

              <ExpandableCard id="lending-card" title="Lending" subtitle="Borrow & lend" info="Deposit collateral and borrow stablecoins.">
                <Lending />
              </ExpandableCard>

              <ExpandableCard
                id="referral-card"
                title="Referral Partner Dashboard"
                subtitle="Invite & earn"
                right={
                  <Link to="/referral" className="text-xs underline">
                    Open full
                  </Link>
                }
                info="Share your link, track signups, and see earnings."
              >
                <ReferralSystem
                  referrals={userData?.referrals || 0}
                  earnings={userData?.referralEarnings || 0}
                  referralCode={userData?.referralCode || "IMALI-N/A"}
                />
              </ExpandableCard>

              <ExpandableCard id="lottery-card" title="LP Lottery" subtitle="Weekly raffle" info="Stake LP to receive weekly tickets.">
                <LPLottery />
              </ExpandableCard>

              <ExpandableCard id="nft-card" title="NFT Preview" subtitle="Collectibles" info="Achievement NFTs for milestones & events.">
                <NFTPreview />
              </ExpandableCard>

              <ExpandableCard id="imali-balance-card" title="IMALI Wallet Balance" subtitle="On-chain" info="Shows on-chain balance and token info.">
                <ImaliBalance />
              </ExpandableCard>
            </div>
          </TabPanel>
        </Tabs>
      </div>

      {/* Guided Tour Layer */}
      <TourOverlay
        isActive={tourOpen && isActive}
        step={current}
        targetRect={targetRect}
        idx={idx}
        total={tourSteps.length}
        onNext={next}
        onPrev={prev}
        onClose={stop}
      />
    </div>
  );
}
