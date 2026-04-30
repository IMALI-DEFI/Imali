// src/components/Dashboard/MemberDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotAPI from "../../utils/BotAPI";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PAPER_TRADING_BALANCE = 1000;

const STRATEGIES = [
  {
    id: "mean_reversion",
    name: "Conservative",
    emoji: "🛡️",
    risk: "Low",
    bestFor: "Beginners",
    description: "Looks for dips and safer rebounds.",
    plainEnglish: "The bot waits for a price drop, then looks for a rebound.",
  },
  {
    id: "ai_weighted",
    name: "Balanced",
    emoji: "⚖️",
    risk: "Medium",
    bestFor: "Most users",
    description: "Uses a mix of multiple trading signals.",
    plainEnglish: "The bot checks several signals before making a decision.",
  },
  {
    id: "momentum",
    name: "Momentum",
    emoji: "🔥",
    risk: "High",
    bestFor: "Trending markets",
    description: "Follows strong price moves.",
    plainEnglish: "The bot tries to ride strong moves when the market is moving fast.",
  },
  {
    id: "arbitrage",
    name: "Arbitrage",
    emoji: "🔄",
    risk: "Low",
    bestFor: "Advanced users",
    description: "Looks for price differences across venues.",
    plainEnglish: "The bot looks for small price differences between markets.",
  },
];

const ACHIEVEMENTS = [
  { id: "first_trade", label: "First Trade", icon: "🚀", helpText: "Complete your first trade" },
  { id: "streak_7", label: "7-Day Streak", icon: "🔥", helpText: "Trade 7 days in a row" },
  { id: "trades_50", label: "50 Trades", icon: "🏆", helpText: "Complete 50 total trades" },
  { id: "profitable", label: "Profitable Day", icon: "💰", helpText: "End a day with profit" },
  { id: "api_ready", label: "API Ready", icon: "🔌", helpText: "Connect both exchanges" },
];

const usd = (n = 0) => `$${Number(n || 0).toFixed(2)}`;
const pct = (n = 0) => `${Number(n || 0).toFixed(1)}%`;

const normalizeStrategyId = (value) => {
  const v = String(value || "").trim().toLowerCase();
  const aliases = {
    conservative: "mean_reversion",
    "mean reversion": "mean_reversion",
    balanced: "ai_weighted",
    "ai weighted": "ai_weighted",
    ai: "ai_weighted",
    momentum: "momentum",
    arbitrage: "arbitrage",
  };
  return aliases[v] || v || "mean_reversion";
};

const riskClass = (risk) => {
  const r = String(risk || "").toLowerCase();
  if (r === "low") return "border-green-200 bg-green-100 text-green-800";
  if (r === "high") return "border-red-200 bg-red-100 text-red-800";
  return "border-yellow-200 bg-yellow-100 text-yellow-800";
};

const extractSummary = (payload) => {
  if (payload?.summary) return payload.summary;
  if (payload?.data?.summary) return payload.data.summary;
  return {};
};

const extractDailySeries = (payload) => {
  if (Array.isArray(payload?.daily_performance)) return payload.daily_performance;
  if (Array.isArray(payload?.data?.daily_performance)) return payload.data.daily_performance;
  return [];
};

const getStrategyFromResult = (result, fallbackId) => {
  return normalizeStrategyId(
    result?.strategy ||
      result?.current_strategy ||
      result?.data?.strategy ||
      result?.data?.current_strategy ||
      fallbackId
  );
};

const formatTimeLeft = (seconds) => {
  const s = Number(seconds || 0);
  if (s <= 0) return "expired";
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} ${hours} hr`;
  return `${hours} hour${hours === 1 ? "" : "s"}`;
};

const anonymizeEmail = (email, index = 0) => {
  if (!email) return `member_${1000 + index}`;
  const raw = String(email).toLowerCase();
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) % 10000;
  }
  return `member_${String(hash).padStart(4, "0")}`;
};

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="mb-4 text-lg font-extrabold text-slate-950">{children}</h3>;
}

function StatusPill({ children, tone = "slate" }) {
  const classes = {
    green: "border-green-200 bg-green-100 text-green-800",
    red: "border-red-200 bg-red-100 text-red-800",
    amber: "border-amber-200 bg-amber-100 text-amber-900",
    blue: "border-blue-200 bg-blue-100 text-blue-800",
    purple: "border-purple-200 bg-purple-100 text-purple-800",
    slate: "border-slate-200 bg-slate-100 text-slate-800",
  };
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${classes[tone] || classes.slate}`}>
      {children}
    </span>
  );
}

function PrimaryButton({ children, onClick, disabled = false, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, disabled = false, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-extrabold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function WarningButton({ children, onClick, disabled = false, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl bg-amber-500 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function DangerButton({ children, onClick, disabled = false, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, helper }) {
  return (
    <Card>
      <div className="text-sm font-bold text-slate-600">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-slate-950">{value}</div>
      {helper && <div className