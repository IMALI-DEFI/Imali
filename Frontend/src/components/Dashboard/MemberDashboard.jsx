// src/components/Dashboard/MemberDashboard.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { BotAPI } from "../utils/api.js";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { Link, useLocation } from "react-router-dom";

// Utils
import { getUserData } from "../../utils/firebase.js";
import { useEvmWallet, short } from "../../getContractInstance.js";

// Child modules
import * as ImaliBalanceNS from "./ImaliBalance.jsx";
import * as StakingNS from "./Staking.js";
import * as LendingNS from "./Lending.js";
import * as YieldFarmingNS from "./YieldFarming.jsx";
import * as LPLotteryNS from "./LPLottery.js";
import * as NFTPreviewNS from "./NFTPreview.jsx";
import * as TierStatusNS from "./TierStatus.jsx";
import * as RecentTradesTableNS from "./RecentTradesTable.jsx";
import * as ReferralSystemNS from "../ReferralSystem.js";
import * as TradeDemoNS from "../../pages/TradeDemo.jsx";

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
const TierStatus = pick(TierStatusNS, "TierStatus");
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

/* ---------------- Lightweight Guided Tour (robust targeting + visible controls) ---------------- */
function useTour(steps, { onClose, activeTab, setActiveTab }) {
  const [idx, setIdx] = useState(-1); // -1 = off
  const [targetRect, setTargetRect] = useState(null);

  const current = idx >= 0 ? steps[idx] : null;

  // robust query with retries to handle mounts & tab switches
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
      // Scroll so target sits in upper-middle to leave room for tooltip & controls
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
      // wait for tab panel content
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

  // Keep highlight aligned on resize/scroll
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

  // Keyboard shortcuts
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

  // Tooltip placement: below target normally; if target is in lower half, place above.
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
    : {
        top: viewportTop + 80,
        left: window.scrollX + 20,
      };

  return (
    <div className="fixed inset-0 z-[1000] pointer-events-none">
      {/* Dim background */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Highlight ring */}
      {targetRect && (
        <div
          className="absolute border-2 border-emerald-300/80 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
          }}
        />
      )}

      {/* Tooltip (with inline controls, always near the target) */}
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
          {/* Mini top-right controls (secondary) */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={onPrev}
              className="text-[11px] px-2 py-1 rounded-md border border-white/20 hover:bg-white/10"
            >
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

        {step.points && step.points.length > 0 && (
          <ul className="mt-2 text-[13px] leading-relaxed text-emerald-200 list-disc pl-5">
            {step.points.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        )}

        {/* Primary controls (always visible in-tooltip) */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="text-xs px-3 py-1 rounded-lg border border-white/20 hover:bg-white/10"
          >
            Skip
          </button>
          <div className="flex gap-2">
            <button
              onClick={onPrev}
              className="text-xs px-3 py-1 rounded-lg border border-white/20 hover:bg-white/10"
            >
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

      {/* Compact floating header control (backup, always top-right) */}
      <div className="pointer-events-auto fixed top-3 right-3 z-[1001]">
        <div className="rounded-xl border border-white/10 bg-slate-900/85 backdrop-blur px-2 py-1 flex items-center gap-2">
          <span className="text-[11px] text-slate-100 hidden sm:inline">{step.title}</span>
          <button
            onClick={onPrev}
            className="text-[11px] px-2 py-0.5 rounded-md border border-white/20 hover:bg-white/10"
          >
            Back
          </button>
          <button
            onClick={onNext}
            className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-500 border border-emerald-300"
          >
            {idx + 1 >= total ? "Finish" : "Next"}
          </button>
          <button
            onClick={onClose}
            className="text-[11px] px-2 py-0.5 rounded-md border border-white/20 hover:bg-white/10"
          >
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
  const { account, chainId, connect, disconnect } = useEvmWallet();

  const [userData, setUserData] = useState(null);
  const [imaliBalance, setImaliBalance] = useState(0);
  const [sniperStats, setSniperStats] = useState({});
  const [recentTrades, setRecentTrades] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  // Live PnL + wins/losses broadcast by TradeDemo
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

  const refTradeDemo = useRef(null);
  const refBalance = useRef(null);

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
          profitShareRate: data.profitShareRate || 30,
          profitCap: data.profitCap || 100,
          cumulativeProfit: data.cumulativeProfit || 0,
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

  /* Live stats (PnL + trades) from backend
     - Uses a resilient client that tries multiple endpoints/prefixes
     - Won't break the dashboard if a route is missing; it just logs
  */
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [pnl, trades] = await Promise.all([
          BotAPI.getPnLSummary({ wallet: account || "" }),
          BotAPI.getRecentTrades({ wallet: account || "", limit: 50 }),
        ]);
        if (cancelled) return;

        // Normalize shapes (so the UI doesn't care about backend format)
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
  const wins = Number(demoHeader?.wins ?? 0);
  const losses = Number(demoHeader?.losses ?? 0);
  const total = Math.max(0, wins + losses);
  const liveWinRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const progressPct = demoHeader?.running ? Math.max(5, Math.min(95, liveWinRate)) : 12;

  /* ---------------- Guided Tour Content (make sure each selector exists in DOM) ---------------- */
  const tourSteps = useMemo(
    () => [
      {
        selector: '[data-tour-id="header"]',
        tabIndex: 0,
        title: "Welcome to your Member Hub",
        body:
          "This is your all-in-one dashboard. You’ll try the bot (Demo or Live), see performance, manage IMALI, and explore extras like staking and referrals.",
        points: [
          "PnL and win-rate update in real time as the bot runs.",
          "LIVE/DEMO badge tells you which engine is active.",
          "Coins 🪙 and XP ⭐ come from profitable ticks and take-profit markers.",
        ],
      },
      {
        selector: '[data-tour-id="promo-performance"]',
        tabIndex: 0,
        title: "Performance Card",
        body: "Shows PnL, equity, win-rate and the data source (LIVE or DEMO). This mirrors the Trade Demo widget.",
        points: [
          "PnL increases award XP ⭐ (bigger gains → more XP).",
          "Sustained gains increase Streak 🔥.",
          "Coins 🪙 accumulate from realized profits and TP markers.",
        ],
      },
      {
        selector: '[data-tour-id="promo-balance"]',
        tabIndex: 0,
        title: "IMALI Balance & Tier",
        body: "Your IMALI holdings unlock discounts, staking rewards, and lower take-rates in the simulator.",
        points: [
          "Hold ≥100 IMALI for Pro/Elite signup discounts.",
          "Higher holdings reduce take-rate on net PnL in the demo.",
        ],
      },
      {
        selector: '[data-tour-id="promo-progress"]',
        tabIndex: 0,
        title: "Progress Bar",
        body:
          "A simple % based on recent win-rate. When the bot runs, this gives a quick feel for how things are going.",
        points: [
          "Win trades → progress nudges up; long red streaks reset it.",
          "XP ⭐ and Coins 🪙 are also summarized in the Trade Demo header.",
        ],
      },
      {
        selector: '[data-tour-id="trade-demo-card"]',
        tabIndex: 0,
        title: "Trade Demo (Crypto & Stocks)",
        body:
          "Open this to pick venue (DEX/CEX/BOTH/STOCKS), choose a strategy, and press Start. Auto tick ≈4s.",
        points: [
          "Demo is risk-free; Live requires upgrade/eligibility.",
          "Take-profit markers add bonus Coins 🪙 and XP ⭐.",
          "The Overview inside shows equity curve, trade tape, and a trades table.",
        ],
      },
      {
        selector: '[data-tour-id="recent-trades-card"]',
        tabIndex: 0,
        title: "Recent Trades Table",
        body:
          "Sortable table of fills: symbol, venue, side, size, and PnL—mirrors the tape inside the demo.",
        points: ["Green PnL rows contribute to XP ⭐.", "Take-profit markers grant bonus Coins 🪙."],
      },
      {
        selector: '[data-tour-id="extras-tab"]',
        tabIndex: 1,
        title: "Extras Tab",
        body:
          "Stake, farm, lend/borrow, preview NFTs, and manage referrals. These modules complement your trading.",
        points: [
          "Actions like staking or harvesting may complete quests for XP/Coins.",
          "Referral earnings are tracked and paid to your wallet.",
        ],
      },
      {
        selector: '[data-tour-id="staking-card"]',
        tabIndex: 1,
        title: "Staking",
        body: "Stake IMALI/LP tokens to earn rewards. Track pending rewards and APR here.",
        points: ["First stake → XP ⭐ milestone.", "Claiming may credit Coins 🪙 during promos."],
      },
      {
        selector: '[data-tour-id="yield-card"]',
        tabIndex: 1,
        title: "Yield Farming",
        body: "Provide liquidity and harvest IMALI rewards. Pools, APYs, and claims live here.",
        points: ["Bigger/longer LP commits can unlock badge NFTs.", "Harvest events may count toward quests."],
      },
      {
        selector: '[data-tour-id="lending-card"]',
        tabIndex: 1,
        title: "Lending",
        body: "Deposit collateral and borrow stablecoins. Watch health factor & interest.",
        points: ["Open/close your first loan → XP ⭐.", "Healthy management can earn Coins 🪙 bonuses."],
      },
      {
        selector: '[data-tour-id="referral-card"]',
        tabIndex: 1,
        title: "Referral Partner",
        body: "Share your link, track signups, and see referral earnings.",
        points: ["First referral → Coins 🪙 reward.", "Higher tiers may amplify payouts."],
      },
      {
        selector: '[data-tour-id="lottery-card"]',
        tabIndex: 1,
        title: "LP Lottery",
        body: "Stake LP to receive weekly tickets. Winners are drawn via verifiable randomness.",
        points: ["Participating can grant XP ⭐ streaks.", "Prizes may include IMALI or discount vouchers."],
      },
      {
        selector: '[data-tour-id="nft-card"]',
        tabIndex: 1,
        title: "NFT Preview",
        body: "Achievement NFTs for milestones (Starter/Pro/Elite & special events).",
        points: ["Completing tours & quests can unlock badges.", "Some NFTs reduce fees or boost yield during events."],
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

  /* -------------------------------- Render -------------------------------- */
  const isLiveBadge = (demoHeader?.mode || MODE_ENV) === "live";

  return (
    <div className="relative bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* HEADER */}
        <div
          data-tour-id="header"
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4"
        >
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">🎮 Member Hub</h1>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] rounded-full px-2 py-1 border ${
                isLiveBadge
                  ? "border-emerald-300/40 bg-emerald-600/40"
                  : "border-amber-300/40 bg-amber-600/40"
              }`}
              title={`Backend: ${API_BASE}`}
            >
              {isLiveBadge ? "LIVE" : "DEMO"}
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
            <div className="flex items-center gap-2">
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
        </div>

        {/* PROMO STRIP */}
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Performance */}
          <div
            data-tour-id="promo-performance"
            className="rounded-2xl border border-white/10 bg-white/10 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/80 flex items-center gap-2">
                Performance
                {demoHeader?.running && (
                  <span className="text-[10px] rounded-full border border-emerald-300/40 bg-emerald-600/40 px-2 py-0.5">
                    {(demoHeader.mode || (isLiveBadge ? "live" : "demo")).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-white/70">
                Source: <b>{lastSource === "trade-live" ? "LIVE" : "DEMO"}</b>
              </div>
            </div>
            <div className="mt-2 text-3xl font-extrabold">
              {`PnL $${Number(demoHeader?.pnl ?? sniperStats?.pnl ?? 0).toFixed(2)}`}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/80 mt-2">
              <span>
                Equity: <b>${Number(demoHeader?.equity ?? sniperStats?.equity ?? 0).toFixed(2)}</b>
              </span>
              <span className="opacity-60">•</span>
              <span>
                Win rate:{" "}
                <b>
                  {total > 0
                    ? `${liveWinRate}%`
                    : `${Number(sniperStats?.winRate ?? 0).toFixed(0)}%`}
                </b>
              </span>
              <span className="opacity-60">•</span>
              <span>
                W/L: <b>{wins} / {losses}</b>
              </span>
            </div>
            <div className="mt-1 text-[11px] text-white/60">
              This header reflects your <b>unified</b> Trade Demo (choose CEX/DEX/BOTH/STOCKS inside the widget).
            </div>
          </div>

          {/* IMALI Balance */}
          <div
            data-tour-id="promo-balance"
            ref={refBalance}
            className="rounded-2xl border border-white/10 bg-white/10 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/80">IMALI Balance</div>
              <span className="inline-flex items-center rounded-full bg-black/30 px-3 py-1 text-xs font-semibold border border-white/10">
                Tier: {tier}
              </span>
            </div>
            <div className="mt-2 text-3xl font-extrabold">
              {Number(imaliBalance).toFixed(2)} IMALI
            </div>
            <div className="text-xs text-white/70 mt-1">Hold IMALI for perks & staking rewards.</div>
          </div>

          {/* Progress */}
          <div
            data-tour-id="promo-progress"
            className="rounded-2xl border border-white/10 bg-white/10 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/80 mb-1">Progress</div>
              {demoHeader?.running ? (
                <span className="text-[10px] rounded-full border border-sky-300/40 bg-sky-600/40 px-2 py-0.5">
                  LIVE
                </span>
              ) : (
                <span className="text-[10px] rounded-full border border-white/20 bg-white/10 px-2 py-0.5">
                  IDLE
                </span>
              )}
            </div>
            <div className="h-2 w-full rounded bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-yellow-300 transition-[width] duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <div>
                Win Rate: <b>{total > 0 ? `${liveWinRate}%` : "—"}</b>
              </div>
              <div>
                Sessions: <b>{demoHeader?.running ? "Active" : "Standby"}</b>
              </div>
            </div>
            <div className="text-[11px] text-white/70 mt-2">
              Run the Trade Demo (inside Overview) to push your win rate.
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
                info="Use the venue buttons inside (CEX/DEX/BOTH/STOCKS). Auto-run ticks ~4s. Live mode requires eligibility."
                priority
              >
                <div className="rounded-xl overflow-hidden bg-white">
                  <TradeDemo />
                </div>
                <div className="mt-3 text-[12px] text-emerald-200">
                  Points 101: Profitable ticks and take-profit markers add <b>XP</b> ⭐ and{" "}
                  <b>Coins</b> 🪙. Long green streaks increase <b>Streak</b> 🔥.
                </div>
              </ExpandableCard>

              <ExpandableCard
                id="recent-trades-card"
                title="Recent Trades"
                subtitle="Table (fills, symbol, venue, PnL)"
                info="This mirrors the tape in the demo, but as a sortable table."
                open={false}
              >
                <RecentTradesTable rows={recentTrades} />
                <div className="mt-2 text-xs text-white/70">
                  Tip: Green rows add XP ⭐, and a burst of Coins 🪙 when take-profit markers fire.
                </div>
              </ExpandableCard>
            </div>
          </TabPanel>

          {/* EXTRAS */}
          <TabPanel>
            <div className="grid grid-cols-1 gap-4">
              <ExpandableCard
                id="staking-card"
                title="Staking"
                subtitle="Earn rewards"
                info="Stake IMALI / LP tokens and compound over time."
              >
                <Staking />
              </ExpandableCard>

              <ExpandableCard
                id="yield-card"
                title="Yield Farming"
                subtitle="LP rewards"
                info="Provide liquidity and farm IMALI."
              >
                <YieldFarming />
              </ExpandableCard>

              <ExpandableCard
                id="lending-card"
                title="Lending"
                subtitle="Borrow & lend"
                info="Deposit collateral and borrow stablecoins."
              >
                <Lending />
              </ExpandableCard>

              <ExpandableCard
                id="referral-card"
                title="Referral Partner Dashboard"
                subtitle="Invite & earn"
                right={<Link to="/referral" className="text-xs underline">Open full</Link>}
                info="Share your link, track referrals and payouts."
              >
                <ReferralSystem
                  referrals={userData?.referrals || 0}
                  earnings={userData?.referralEarnings || 0}
                  referralCode={userData?.referralCode || "IMALI-N/A"}
                />
              </ExpandableCard>

              <ExpandableCard
                id="lottery-card"
                title="LP Lottery"
                subtitle="Weekly raffle"
                info="Stake LP to receive weekly tickets."
              >
                <LPLottery />
              </ExpandableCard>

              <ExpandableCard
                id="nft-card"
                title="NFT Preview"
                subtitle="Collectibles"
                info="Achievement NFTs for milestones & events."
              >
                <NFTPreview />
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
