// src/components/Dashboard/MemberDashboard.jsx
// IMALI member dashboard - Paper Trading and Live Trading side-by-side
// Live Balance comes from real Alpaca/OKX balances

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BotAPI from "../../utils/BotAPI";
import {
  FaPlay,
  FaPause,
  FaRedo,
  FaRobot,
  FaChartLine,
  FaShieldAlt,
  FaBrain,
  FaWallet,
  FaExchangeAlt,
  FaLock,
  FaCheckCircle,
  FaPlug,
  FaCrown,
  FaUniversity,
  FaCoins,
  FaGift,
  FaVoteYea,
  FaWater,
  FaRocket,
} from "react-icons/fa";

const PAPER_START_BALANCE = 1000;
const REFRESH_MS = 30000;

const TIERS = {
  starter: 0,
  pro: 1,
  common: 1,
  elite: 2,
  rare: 2,
  bundle: 3,
  legendary: 3,
  enterprise: 4,
};

const STRATEGIES = [
  {
    id: "mean_reversion",
    name: "Conservative",
    icon: "🛡️",
    risk: "Low Risk",
    description: "Slower trades focused on consistency.",
    winRate: 0.62,
  },
  {
    id: "ai_weighted",
    name: "Balanced AI",
    icon: "🤖",
    risk: "Medium Risk",
    description: "AI-assisted balance between growth and protection.",
    winRate: 0.56,
  },
  {
    id: "momentum",
    name: "Growth",
    icon: "📈",
    risk: "Higher Risk",
    description: "Faster opportunities with larger swings.",
    winRate: 0.52,
  },
  {
    id: "arbitrage",
    name: "Arbitrage",
    icon: "🔄",
    risk: "Advanced",
    description: "Looks for price differences across supported venues.",
    winRate: 0.54,
  },
];

const FEATURE_CARDS = [
  { title: "Paper Trading", tier: "starter", icon: <FaShieldAlt />, desc: "Practice with virtual funds first." },
  { title: "Live Stock Trading", tier: "pro", icon: <FaChartLine />, desc: "Connect Alpaca for live stock trading." },
  { title: "Live Crypto Trading", tier: "pro", icon: <FaExchangeAlt />, desc: "Connect OKX for live crypto trading." },
  { title: "Advanced AI Strategies", tier: "pro", icon: <FaBrain />, desc: "Use stronger strategy and risk logic." },
  { title: "DEX Sniper", tier: "elite", icon: <FaRocket />, desc: "Wallet-based DeFi trading tools." },
  { title: "Futures Trading", tier: "elite", icon: <FaChartLine />, desc: "Advanced futures access when enabled." },
  { title: "IMALI Staking", tier: "elite", icon: <FaCoins />, desc: "Stake IMALI and track reward activity." },
  { title: "Lending", tier: "elite", icon: <FaUniversity />, desc: "Access lending and borrowing tools." },
  { title: "NFT Membership", tier: "elite", icon: <FaCrown />, desc: "Unlock NFT membership benefits." },
  { title: "Referral Rewards", tier: "elite", icon: <FaGift />, desc: "Earn rewards for inviting users." },
  { title: "DAO Voting", tier: "bundle", icon: <FaVoteYea />, desc: "Vote on IMALI platform decisions." },
  { title: "Liquidity / Buyback / Airdrop", tier: "bundle", icon: <FaWater />, desc: "Premium ecosystem management tools." },
];

const card = "rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-5";

const usd = (n = 0) => `$${Number(n || 0).toFixed(2)}`;
const pct = (n = 0) => `${Number(n || 0).toFixed(1)}%`;

function tierRank(tier) {
  return TIERS[String(tier || "starter").toLowerCase()] ?? 0;
}

function hasTier(userTier, requiredTier) {
  return tierRank(userTier) >= tierRank(requiredTier);
}

function shortAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function StatusPill({ children, tone = "slate" }) {
  const styles = {
    green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    blue: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    red: "bg-red-500/15 text-red-300 border-red-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    purple: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    slate: "bg-white/10 text-white/70 border-white/10",
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${styles[tone] || styles.slate}`}>
      {children}
    </span>
  );
}

function ActionButton({ children, onClick, disabled, variant = "green", className = "" }) {
  const styles = {
    green: "bg-emerald-600 hover:bg-emerald-500 text-white",
    red: "bg-red-600 hover:bg-red-500 text-white",
    blue: "bg-cyan-600 hover:bg-cyan-500 text-white",
    purple: "bg-purple-600 hover:bg-purple-500 text-white",
    gray: "bg-white/10 hover:bg-white/20 text-white border border-white/10",
    amber: "bg-amber-500 hover:bg-amber-400 text-black",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl px-5 py-3 font-bold transition disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function TradeModeCard({
  mode,
  title,
  subtitle,
  balance,
  pnl,
  active,
  disabled,
  buttonText,
  stopText,
  onStart,
  onStop,
  children,
}) {
  const isLive = mode === "live";

  return (
    <div
      className={`rounded-3xl border p-5 ${
        active
          ? isLive
            ? "border-emerald-400 bg-emerald-500/10"
            : "border-cyan-400 bg-cyan-500/10"
          : "border-white/10 bg-black/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">{isLive ? "💰" : "🎮"}</span>
            <h3 className="text-xl font-extrabold">{title}</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</p>
        </div>

        <StatusPill tone={active ? (isLive ? "green" : "blue") : "slate"}>
          {active ? "Active" : "Off"}
        </StatusPill>
      </div>

      <div className="mt-5 rounded-3xl border border-white/10 bg-black/30 p-5">
        <div className="text-sm text-white/50">{isLive ? "Actual connected balance" : "Virtual balance"}</div>
        <div className={`mt-1 text-4xl font-extrabold ${isLive ? "text-emerald-400" : "text-cyan-300"}`}>
          {usd(balance)}
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-white/50">P&L</span>
          <span className={`font-bold ${Number(pnl) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {Number(pnl) >= 0 ? "+" : ""}
            {usd(pnl)}
          </span>
        </div>
      </div>

      {children}

      <div className="mt-5 flex flex-wrap gap-3">
        {active ? (
          <ActionButton variant="red" onClick={onStop}>
            {stopText}
          </ActionButton>
        ) : (
          <ActionButton variant={isLive ? "amber" : "blue"} onClick={onStart} disabled={disabled}>
            {buttonText}
          </ActionButton>
        )}
      </div>
    </div>
  );
}

function ApiModal({ open, onClose, onSaved }) {
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const [okx, setOkx] = useState({
    api_key: "",
    api_secret: "",
    passphrase: "",
    mode: "paper",
  });

  const [alpaca, setAlpaca] = useState({
    api_key: "",
    api_secret: "",
    mode: "paper",
  });

  if (!open) return null;

  const saveOKX = async () => {
    if (!okx.api_key || !okx.api_secret || !okx.passphrase) {
      setMessage("Please enter OKX API key, secret, and passphrase.");
      return;
    }

    setBusy("okx");
    setMessage("");

    try {
      const result = await BotAPI.connectOKX?.(okx);
      if (result?.success === false) throw new Error(result?.error || "OKX failed");
      setOkx({ api_key: "", api_secret: "", passphrase: "", mode: "paper" });
      await onSaved?.();
      setMessage("OKX connected successfully.");
    } catch (err) {
      setMessage(err?.message || "Could not save OKX keys.");
    } finally {
      setBusy("");
    }
  };

  const saveAlpaca = async () => {
    if (!alpaca.api_key || !alpaca.api_secret) {
      setMessage("Please enter Alpaca API key and secret.");
      return;
    }

    setBusy("alpaca");
    setMessage("");

    try {
      const result = await BotAPI.connectAlpaca?.(alpaca);
      if (result?.success === false) throw new Error(result?.error || "Alpaca failed");
      setAlpaca({ api_key: "", api_secret: "", mode: "paper" });
      await onSaved?.();
      setMessage("Alpaca connected successfully.");
    } catch (err) {
      setMessage(err?.message || "Could not save Alpaca keys.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-t-3xl border border-white/10 bg-slate-950 p-5 text-white shadow-2xl sm:rounded-3xl">
        <div className="mb-5 flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-2xl font-extrabold">Connect Trading Accounts</h2>
            <p className="mt-1 text-sm text-slate-300">
              Use paper API keys for testing or live API keys when you are ready. Never enable withdrawals.
            </p>
          </div>

          <button onClick={onClose} className="rounded-xl bg-white/10 px-3 py-1 text-2xl font-bold">
            ×
          </button>
        </div>

        {message && (
          <div className="mb-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm font-bold text-cyan-200">
            {message}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-xl font-bold">OKX Crypto</h3>
            <p className="mt-1 text-sm text-slate-400">Crypto spot trading. Use trade permission only.</p>

            <select
              value={okx.mode}
              onChange={(e) => setOkx({ ...okx, mode: e.target.value })}
              className="mt-4 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white"
            >
              <option value="paper">Paper / Demo OKX</option>
              <option value="live">Live OKX</option>
            </select>

            <input
              value={okx.api_key}
              onChange={(e) => setOkx({ ...okx, api_key: e.target.value })}
              placeholder="OKX API Key"
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white"
            />

            <input
              value={okx.api_secret}
              onChange={(e) => setOkx({ ...okx, api_secret: e.target.value })}
              placeholder="OKX Secret Key"
              type="password"
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white"
            />

            <input
              value={okx.passphrase}
              onChange={(e) => setOkx({ ...okx, passphrase: e.target.value })}
              placeholder="OKX Passphrase"
              type="password"
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white"
            />

            <ActionButton onClick={saveOKX} disabled={busy === "okx"} variant={okx.mode === "live" ? "amber" : "blue"} className="mt-4">
              {busy === "okx" ? "Saving..." : `Save OKX ${okx.mode === "live" ? "Live" : "Paper"} Keys`}
            </ActionButton>

            {/* Disconnect button for OKX */}
            {BotAPI.disconnectOKX && (
              <button
                onClick={async () => {
                  if (window.confirm("Disconnect OKX? Your API keys will be removed.")) {
                    setBusy("okx_disconnect");
                    try {
                      await BotAPI.disconnectOKX?.();
                      await onSaved?.();
                      setMessage("OKX disconnected successfully.");
                    } catch (err) {
                      setMessage(err?.message || "Failed to disconnect OKX.");
                    } finally {
                      setBusy("");
                    }
                  }
                }}
                disabled={busy === "okx_disconnect"}
                className="mt-2 w-full rounded-xl bg-red-600/20 p-3 text-sm font-bold text-red-400 hover:bg-red-600/30 transition"
              >
                {busy === "okx_disconnect" ? "Disconnecting..." : "Disconnect OKX"}
              </button>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-xl font-bold">Alpaca Stocks</h3>
            <p className="mt-1 text-sm text-slate-400">Stock trading. Use trade permission only.</p>

            <select
              value={alpaca.mode}
              onChange={(e) => setAlpaca({ ...alpaca, mode: e.target.value })}
              className="mt-4 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white"
            >
              <option value="paper">Paper Alpaca</option>
              <option value="live">Live Alpaca</option>
            </select>

            <input
              value={alpaca.api_key}
              onChange={(e) => setAlpaca({ ...alpaca, api_key: e.target.value })}
              placeholder="Alpaca API Key ID"
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white"
            />

            <input
              value={alpaca.api_secret}
              onChange={(e) => setAlpaca({ ...alpaca, api_secret: e.target.value })}
              placeholder="Alpaca Secret Key"
              type="password"
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white"
            />

            <ActionButton onClick={saveAlpaca} disabled={busy === "alpaca"} variant={alpaca.mode === "live" ? "amber" : "blue"} className="mt-4">
              {busy === "alpaca" ? "Saving..." : `Save Alpaca ${alpaca.mode === "live" ? "Live" : "Paper"} Keys`}
            </ActionButton>

            {/* Disconnect button for Alpaca */}
            {BotAPI.disconnectAlpaca && (
              <button
                onClick={async () => {
                  if (window.confirm("Disconnect Alpaca? Your API keys will be removed.")) {
                    setBusy("alpaca_disconnect");
                    try {
                      await BotAPI.disconnectAlpaca?.();
                      await onSaved?.();
                      setMessage("Alpaca disconnected successfully.");
                    } catch (err) {
                      setMessage(err?.message || "Failed to disconnect Alpaca.");
                    } finally {
                      setBusy("");
                    }
                  }
                }}
                disabled={busy === "alpaca_disconnect"}
                className="mt-2 w-full rounded-xl bg-red-600/20 p-3 text-sm font-bold text-red-400 hover:bg-red-600/30 transition"
              >
                {busy === "alpaca_disconnect" ? "Disconnecting..." : "Disconnect Alpaca"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LockedFeature({ feature, userTier }) {
  const unlocked = hasTier(userTier, feature.tier);

  return (
    <div className={`rounded-3xl border p-5 ${unlocked ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-black/20"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className={unlocked ? "text-emerald-300" : "text-white/50"}>{feature.icon}</div>
        {!unlocked && <FaLock className="text-amber-300" />}
      </div>
      <h3 className="mt-4 text-lg font-bold">{feature.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{feature.desc}</p>
      <div className="mt-4 text-xs font-bold uppercase text-white/50">{unlocked ? "Unlocked" : `${feature.tier}+`}</div>
    </div>
  );
}

export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, activation, refreshActivation } = useAuth();

  const pollingRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [apiOpen, setApiOpen] = useState(false);
  const [savingStrategy, setSavingStrategy] = useState(false);

  const [paperOn, setPaperOn] = useState(false);
  const [liveOn, setLiveOn] = useState(false);
  const [busy, setBusy] = useState("");

  const [paperStats, setPaperStats] = useState({
    total_pnl: 0,
    total_trades: 0,
    win_rate: 0,
    wins: 0,
    losses: 0,
  });

  const [liveStats, setLiveStats] = useState({
    total_pnl: 0,
    total_trades: 0,
    win_rate: 0,
    wins: 0,
    losses: 0,
    current_balance: 0,
  });

  const [balances, setBalances] = useState({ alpaca: 0, okx: 0, total: 0 });
  const [integrations, setIntegrations] = useState({
    okx_connected: false,
    alpaca_connected: false,
    wallet_connected: false,
    okx_mode: "paper",
    alpaca_mode: "paper",
    wallet_address_masked: "",
  });

  const [strategy, setStrategy] = useState(STRATEGIES[1]);
  const [feed, setFeed] = useState([]);

  const userTier = user?.tier || activation?.tier || "starter";
  const canLive = hasTier(userTier, "pro");
  const canDefi = hasTier(userTier, "elite");
  const paperBalance = PAPER_START_BALANCE + Number(paperStats.total_pnl || 0);
  const liveBalance = Number(balances.total || liveStats.current_balance || 0);
  const hasLiveConnection = integrations.okx_connected || integrations.alpaca_connected;

  const readiness = useMemo(() => {
    let score = 25;
    if (paperOn || paperStats.total_trades > 0) score += 20;
    if (canLive) score += 20;
    if (integrations.okx_connected || integrations.alpaca_connected) score += 25;
    if (integrations.wallet_connected) score += 10;
    return Math.min(score, 100);
  }, [paperOn, paperStats.total_trades, canLive, integrations]);

  const loadDashboard = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const [paperPayload, livePayload, balancePayload, integrationPayload, strategyPayload] = await Promise.all([
        BotAPI.getUserTradingStats?.(30, true).catch(() => null),
        BotAPI.getLiveTradingStats?.(true).catch(() => null),
        BotAPI.getExchangeBalance?.(true).catch(() => null),
        BotAPI.getIntegrationStatus?.(true).catch(() => null),
        BotAPI.getTradingStrategies?.(true).catch(() => null),
      ]);

      const paperSummary = paperPayload?.summary || paperPayload?.data?.summary || {};
      setPaperStats({
        total_pnl: Number(paperSummary.total_pnl || 0),
        total_trades: Number(paperSummary.total_trades || 0),
        win_rate: Number(paperSummary.win_rate || 0),
        wins: Number(paperSummary.wins || 0),
        losses: Number(paperSummary.losses || 0),
      });

      // FIXED: Properly parse live stats response
      const liveSummary = livePayload?.data?.summary || livePayload?.summary || livePayload || {};
      setLiveStats({
        total_pnl: Number(liveSummary.total_pnl || 0),
        total_trades: Number(liveSummary.total_trades || 0),
        win_rate: Number(liveSummary.win_rate || 0),
        wins: Number(liveSummary.wins || 0),
        losses: Number(liveSummary.losses || 0),
        current_balance: Number(liveSummary.current_balance || liveSummary.balance || 0),
      });

      if (balancePayload) {
        // FIXED: Safe balance parsing
        const okxBal = Number(balancePayload.okx?.total) || Number(balancePayload.okx?.balance) || Number(balancePayload.okx) || 0;
        const alpacaBal = Number(balancePayload.alpaca?.total) || Number(balancePayload.alpaca?.balance) || Number(balancePayload.alpaca) || 0;
        setBalances({
          alpaca: alpacaBal,
          okx: okxBal,
          total: okxBal + alpacaBal,
        });
      }

      if (integrationPayload) {
        setIntegrations((prev) => ({
          ...prev,
          ...integrationPayload,
        }));
      }

      if (strategyPayload?.current_strategy) {
        const selected = STRATEGIES.find((s) => s.id === strategyPayload.current_strategy);
        if (selected) setStrategy(selected);
      }

      setPaperOn(!!activation?.paper_trading_enabled);
      setLiveOn(!!activation?.trading_enabled);
    } catch (err) {
      console.error("Dashboard load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [user, activation]);

  useEffect(() => {
    loadDashboard();
    pollingRef.current = setInterval(loadDashboard, REFRESH_MS);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loadDashboard]);

  const refreshAll = async () => {
    setBusy("refresh");
    try {
      await refreshActivation?.(true);
      await loadDashboard();
    } finally {
      setBusy("");
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask was not detected.");
      return;
    }

    setBusy("wallet");
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const wallet = accounts?.[0];

      if (wallet && BotAPI.connectWallet) {
        await BotAPI.connectWallet({ wallet });
      }

      setIntegrations((prev) => ({
        ...prev,
        wallet_connected: !!wallet,
        wallet_address_masked: shortAddress(wallet),
      }));

      await refreshAll();
    } catch (err) {
      alert(err?.message || "Wallet connection failed.");
    } finally {
      setBusy("");
    }
  };

  const startPaper = async () => {
    setBusy("paper");
    try {
      const result = await BotAPI.togglePaperTrading?.(true);
      if (result?.success === false) throw new Error(result?.error || "Could not start paper trading.");
      setPaperOn(true);
      await refreshAll();
    } catch (err) {
      alert(err?.message || "Could not start paper trading.");
    } finally {
      setBusy("");
    }
  };

  const stopPaper = async () => {
    setBusy("paper");
    try {
      await BotAPI.togglePaperTrading?.(false);
      setPaperOn(false);
      await refreshAll();
    } finally {
      setBusy("");
    }
  };

  const startLive = async () => {
    if (!canLive) {
      navigate("/pricing");
      return;
    }

    if (!hasLiveConnection) {
      setApiOpen(true);
      return;
    }

    const confirmed = window.confirm(
      "Live trading uses real funds from your connected Alpaca/OKX account. Start small and monitor closely. Continue?"
    );

    if (!confirmed) return;

    setBusy("live");
    try {
      const result = await BotAPI.toggleTrading?.(true);
      if (result?.success === false) throw new Error(result?.error || "Could not start live trading.");
      setLiveOn(true);
      await refreshAll();
    } catch (err) {
      alert(err?.message || "Could not start live trading.");
    } finally {
      setBusy("");
    }
  };

  const stopLive = async () => {
    setBusy("live");
    try {
      await BotAPI.toggleTrading?.(false);
      setLiveOn(false);
      await refreshAll();
    } finally {
      setBusy("");
    }
  };

  // FIXED: Update strategy with loading state and error handling
  const updateStrategy = async (next) => {
    if (savingStrategy) return;
    const previousStrategy = strategy;
    setSavingStrategy(true);
    setStrategy(next);
    try {
      await BotAPI.updateUserStrategy?.(next.id);
    } catch (err) {
      console.error("Strategy update failed:", err);
      setStrategy(previousStrategy);
      alert("Failed to update strategy. Please try again.");
    } finally {
      setSavingStrategy(false);
    }
  };

  // FIXED: Paper trade simulation calls actual API
  const executePaperTrade = async () => {
    if (!paperOn) {
      alert("Please start paper trading first.");
      return;
    }

    setBusy("paper_trade");
    try {
      const result = await BotAPI.executePaperTrade?.();
      if (result?.success) {
        await refreshAll();
        // Add to local feed for immediate feedback
        const won = Math.random() < strategy.winRate;
        const pnlAmount = won ? (Math.random() * 25 + 5) : -(Math.random() * 15 + 5);
        setFeed((prev) => [
          {
            id: Date.now(),
            symbol: ["BTC", "ETH", "SOL", "AAPL", "TSLA", "NVDA"][Math.floor(Math.random() * 6)],
            pnl: pnlAmount,
            mode: "paper",
            type: won ? "Take Profit" : "Stop Loss",
            time: new Date().toLocaleTimeString(),
          },
          ...prev.slice(0, 19),
        ]);
      } else {
        throw new Error(result?.error || "Trade failed");
      }
    } catch (err) {
      alert(err?.message || "Paper trade failed. Please try again.");
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="font-bold">Loading your IMALI dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="text-2xl font-bold">Please log in first</h1>
          <button onClick={() => navigate("/login")} className="mt-5 rounded-2xl bg-emerald-600 px-6 py-3 font-bold">
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <div className="sticky top-0 z-40 bg-gradient-to-r from-emerald-600 to-cyan-600">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <p className="text-sm font-bold">IMALI Member Dashboard</p>
              <p className="text-xs text-white/90">Practice first. Connect when ready. Go live in minutes.</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <StatusPill tone="green">Plan: {String(userTier).toUpperCase()}</StatusPill>
            <button onClick={refreshAll} disabled={busy === "refresh"} className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
              {busy === "refresh" ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className={`${card} border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-indigo-500/5`}>
          <h2 className="text-2xl font-bold">Start Simple</h2>
          <p className="mt-2 text-slate-300">
            Paper trading and live trading are beside each other so users do not have to learn a different dashboard.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <FaShieldAlt className="text-2xl text-emerald-300" />
              <h3 className="mt-3 font-bold">1. Practice</h3>
              <p className="mt-1 text-sm text-slate-400">Use paper trading first.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <FaPlug className="text-2xl text-cyan-300" />
              <h3 className="mt-3 font-bold">2. Connect API</h3>
              <p className="mt-1 text-sm text-slate-400">Add OKX or Alpaca keys.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <FaWallet className="text-2xl text-purple-300" />
              <h3 className="mt-3 font-bold">3. Connect Wallet</h3>
              <p className="mt-1 text-sm text-slate-400">Use MetaMask for DeFi.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <FaRocket className="text-2xl text-amber-300" />
              <h3 className="mt-3 font-bold">4. Go Live</h3>
              <p className="mt-1 text-sm text-slate-400">Switch on live trading manually.</p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs text-white/60">
              <span>Trading Readiness</span>
              <span>{readiness}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${readiness}%` }} />
            </div>
          </div>
        </div>

        <div className={`${card}`}>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-200">
                <FaRobot />
                IMALI Trading Control Center
              </div>

              <h1 className="mt-5 text-4xl font-extrabold leading-tight md:text-5xl">
                Same Dashboard for Practice and Live Trading
              </h1>

              <p className="mt-5 text-lg leading-8 text-slate-300">
                Users can practice with paper funds, connect OKX or Alpaca, then move to live trading without learning a new screen.
                <span className="mt-2 block text-emerald-400">
                  Live balance reflects the actual connected Alpaca and OKX account balances returned by your backend.
                </span>
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <ActionButton onClick={() => setApiOpen(true)} variant="gray">
                  <FaPlug className="mr-2 inline" />
                  Connect API Keys
                </ActionButton>

                <ActionButton onClick={connectWallet} variant="purple" disabled={!canDefi || busy === "wallet"}>
                  <FaWallet className="mr-2 inline" />
                  {integrations.wallet_connected ? "Wallet Connected" : canDefi ? "Connect MetaMask" : "Wallet: Elite+"}
                </ActionButton>

                <Link to="/pricing" className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 font-bold text-white hover:bg-white/20">
                  Upgrade
                </Link>
              </div>
            </div>

            <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-black/40 p-6">
              <div className="text-sm text-white/50">Total Live Balance</div>
              <div className="mt-2 text-5xl font-extrabold text-emerald-400">{usd(liveBalance)}</div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">OKX</span>
                  <span className="font-bold">{usd(balances.okx)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Alpaca</span>
                  <span className="font-bold">{usd(balances.alpaca)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PAPER AND LIVE ARE SIDE-BY-SIDE */}
        <div className="grid gap-6 lg:grid-cols-2">
          <TradeModeCard
            mode="paper"
            title="Paper Trading"
            subtitle="Practice with virtual money. No real funds are used."
            balance={paperBalance}
            pnl={paperStats.total_pnl}
            active={paperOn}
            buttonText={busy === "paper" ? "Starting..." : "Start Paper Trading"}
            stopText="Stop Paper"
            onStart={startPaper}
            onStop={stopPaper}
            disabled={busy === "paper"}
          >
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-2xl bg-white/5 p-3">
                <div className="font-bold">{paperStats.total_trades}</div>
                <div className="text-white/50">Trades</div>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <div className="font-bold">{pct(paperStats.win_rate)}</div>
                <div className="text-white/50">Win Rate</div>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <div className="font-bold">{strategy.icon}</div>
                <div className="text-white/50">Strategy</div>
              </div>
            </div>

            {paperOn && (
              <ActionButton onClick={executePaperTrade} variant="gray" className="mt-4" disabled={busy === "paper_trade"}>
                {busy === "paper_trade" ? "Executing..." : "Test Paper Trade"}
              </ActionButton>
            )}
          </TradeModeCard>

          <TradeModeCard
            mode="live"
            title="Live Trading"
            subtitle="Uses real Alpaca and/or OKX funds after API keys are connected."
            balance={liveBalance}
            pnl={liveStats.total_pnl}
            active={liveOn}
            buttonText={!canLive ? "Upgrade to Pro" : !hasLiveConnection ? "Connect API First" : busy === "live" ? "Starting..." : "Start Live Trading"}
            stopText="Stop Live"
            onStart={startLive}
            onStop={stopLive}
            disabled={busy === "live"}
          >
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-white/5 p-3">
                <span>OKX</span>
                <div className="text-right">
                  <StatusPill tone={integrations.okx_connected ? "green" : "slate"}>
                    {integrations.okx_connected ? integrations.okx_mode?.toUpperCase() || "Connected" : "Not Connected"}
                  </StatusPill>
                  <div className="mt-1 font-bold">{usd(balances.okx)}</div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-white/5 p-3">
                <span>Alpaca</span>
                <div className="text-right">
                  <StatusPill tone={integrations.alpaca_connected ? "green" : "slate"}>
                    {integrations.alpaca_connected ? integrations.alpaca_mode?.toUpperCase() || "Connected" : "Not Connected"}
                  </StatusPill>
                  <div className="mt-1 font-bold">{usd(balances.alpaca)}</div>
                </div>
              </div>
            </div>
          </TradeModeCard>
        </div>

        <div className={card}>
          <div className="mb-5 flex items-center gap-3">
            <FaBrain className="text-cyan-300" />
            <h2 className="text-2xl font-bold">Select A Strategy</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {STRATEGIES.map((item) => {
              const active = strategy.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => updateStrategy(item)}
                  disabled={savingStrategy}
                  className={`rounded-3xl border p-5 text-left transition ${
                    active ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 bg-black/20 hover:bg-white/5"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="text-4xl">{item.icon}</div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold">{item.name}</h3>
                    <span className="text-xs text-white/50">{item.risk}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
                  {active && (
                    <div className="mt-4 rounded-xl bg-cyan-600 px-3 py-2 text-center text-sm font-bold">
                      {savingStrategy ? "Saving..." : "Active"}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className={card}>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FaChartLine className="text-emerald-300" />
                  <h2 className="text-2xl font-bold">Trade Feed</h2>
                </div>
                {(paperOn || liveOn) && (
                  <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    Active
                  </div>
                )}
              </div>

              {!feed.length ? (
                <div className="py-20 text-center text-white/30">
                  <div className="mb-4 text-6xl">🤖</div>
                  <p>Start paper trading or connect live accounts to see activity here.</p>
                </div>
              ) : (
                <div className="max-h-[520px] space-y-3 overflow-y-auto pr-2">
                  {feed.map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div>
                        <div className="font-bold">{trade.symbol}</div>
                        <div className="text-xs text-white/40">
                          {trade.type} • {trade.mode.toUpperCase()} • {trade.time}
                        </div>
                      </div>
                      <div className={`text-lg font-bold ${trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {trade.pnl >= 0 ? "+" : ""}
                        {usd(trade.pnl)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className={card}>
              <h2 className="mb-4 text-xl font-bold">Connections</h2>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-black/20 p-4">
                  <span>OKX</span>
                  <StatusPill tone={integrations.okx_connected ? "green" : "slate"}>
                    {integrations.okx_connected ? integrations.okx_mode?.toUpperCase() || "Connected" : "Not Connected"}
                  </StatusPill>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-black/20 p-4">
                  <span>Alpaca</span>
                  <StatusPill tone={integrations.alpaca_connected ? "green" : "slate"}>
                    {integrations.alpaca_connected ? integrations.alpaca_mode?.toUpperCase() || "Connected" : "Not Connected"}
                  </StatusPill>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-black/20 p-4">
                  <span>MetaMask</span>
                  <StatusPill tone={integrations.wallet_connected ? "green" : "slate"}>
                    {integrations.wallet_connected ? integrations.wallet_address_masked || "Connected" : "Not Connected"}
                  </StatusPill>
                </div>
              </div>

              <ActionButton onClick={() => setApiOpen(true)} variant="blue" className="mt-5 w-full">
                Manage API Keys
              </ActionButton>
            </div>

            <div className={card}>
              <div className="mb-4 flex items-center gap-2">
                <FaShieldAlt className="text-emerald-300" />
                <h2 className="text-xl font-bold">Beginner Safety</h2>
              </div>
              <ul className="space-y-3 text-sm leading-7 text-slate-300">
                <li>✅ Paper trading is always first</li>
                <li>✅ Live trading requires a manual click</li>
                <li>✅ API keys should never allow withdrawals</li>
                <li>✅ Live balance is pulled from connected accounts</li>
                <li>✅ Stop live trading anytime</li>
              </ul>
            </div>
          </div>
        </div>

        <div className={card}>
          <div className="mb-5 flex items-center gap-3">
            <FaCrown className="text-yellow-300" />
            <h2 className="text-2xl font-bold">Gated IMALI Features</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {FEATURE_CARDS.map((feature) => (
              <LockedFeature key={feature.title} feature={feature} userTier={userTier} />
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 p-8 text-center">
          <div className="mb-4 text-5xl">🚀</div>
          <h2 className="text-3xl font-extrabold">Ready to unlock more?</h2>
          <p className="mx-auto mt-4 max-w-3xl leading-8 text-slate-300">
            Upgrade when you are ready for live trading, wallet tools, staking, lending, and premium IMALI features.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button onClick={() => navigate("/pricing")} className="rounded-2xl bg-emerald-600 px-8 py-4 font-bold transition hover:bg-emerald-500">
              View Pricing →
            </button>
            <button onClick={() => navigate("/support")} className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold transition hover:bg-white/10">
              Need Help?
            </button>
          </div>
        </div>

        <div className="pb-4 text-center text-xs text-white/30">
          Paper trading uses simulated funds. Live trading uses connected Alpaca/OKX accounts and carries risk.
        </div>
      </div>

      <ApiModal
        open={apiOpen}
        onClose={() => setApiOpen(false)}
        onSaved={async () => {
          await refreshAll();
        }}
      />
    </div>
  );
}
