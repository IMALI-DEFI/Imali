// src/components/Dashboard/MemberDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  FaCrown,
  FaPlug,
  FaUniversity,
  FaCoins,
  FaVoteYea,
  FaGift,
  FaWater,
  FaRocket,
} from "react-icons/fa";

const START_BALANCE = 1000;

const TIERS = {
  starter: 0,
  pro: 1,
  elite: 2,
  bundle: 3,
  all_access: 3,
};

const STRATEGIES = [
  {
    id: "mean_reversion",
    name: "Conservative",
    icon: "🛡️",
    risk: "Low Risk",
    description: "Slower trades focused on consistency.",
    color: "emerald",
    winRate: 0.62,
  },
  {
    id: "ai_weighted",
    name: "Balanced AI",
    icon: "🤖",
    risk: "Medium Risk",
    description: "AI-assisted balance between growth and protection.",
    color: "blue",
    winRate: 0.56,
  },
  {
    id: "momentum",
    name: "Growth",
    icon: "📈",
    risk: "Higher Risk",
    description: "Faster opportunities with larger swings.",
    color: "orange",
    winRate: 0.52,
  },
  {
    id: "aggressive",
    name: "Aggressive",
    icon: "🔥",
    risk: "Extreme Risk",
    description: "High volatility with larger upside potential.",
    color: "red",
    winRate: 0.48,
  },
];

const FEATURE_CARDS = [
  {
    title: "Paper Trading",
    icon: <FaShieldAlt />,
    tier: "starter",
    description: "Practice with virtual funds before using real money.",
  },
  {
    title: "Live Stock Trading",
    icon: <FaChartLine />,
    tier: "pro",
    description: "Connect Alpaca and allow IMALI to assist with stock trades.",
  },
  {
    title: "Live Crypto Trading",
    icon: <FaExchangeAlt />,
    tier: "pro",
    description: "Connect OKX and trade supported crypto markets.",
  },
  {
    title: "Advanced AI Strategies",
    icon: <FaBrain />,
    tier: "pro",
    description: "Use smarter strategy logic, risk checks, and trade analysis.",
  },
  {
    title: "DEX Sniper",
    icon: <FaRocket />,
    tier: "elite",
    description: "Use wallet-based DeFi trading tools for supported tokens.",
  },
  {
    title: "Futures Trading",
    icon: <FaChartLine />,
    tier: "elite",
    description: "Access advanced futures tools when enabled.",
  },
  {
    title: "IMALI Staking",
    icon: <FaCoins />,
    tier: "elite",
    description: "Stake IMALI tokens and view reward activity.",
  },
  {
    title: "Lending",
    icon: <FaUniversity />,
    tier: "elite",
    description: "Access lending and borrowing features when available.",
  },
  {
    title: "NFT Membership",
    icon: <FaCrown />,
    tier: "elite",
    description: "Unlock NFT-based membership benefits.",
  },
  {
    title: "Referral Rewards",
    icon: <FaGift />,
    tier: "elite",
    description: "Earn rewards for inviting new users.",
  },
  {
    title: "DAO Voting",
    icon: <FaVoteYea />,
    tier: "bundle",
    description: "Vote on platform decisions and future IMALI features.",
  },
  {
    title: "Liquidity Tools",
    icon: <FaWater />,
    tier: "bundle",
    description: "Access liquidity, buyback, airdrop, and treasury modules.",
  },
];

const card = "rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-5";

function tierValue(tier) {
  return TIERS[String(tier || "starter").toLowerCase()] ?? 0;
}

function canAccess(userTier, requiredTier) {
  return tierValue(userTier) >= tierValue(requiredTier);
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function FeatureGate({ userTier, requiredTier, children, lockedText }) {
  const unlocked = canAccess(userTier, requiredTier);

  if (unlocked) return children;

  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-5 opacity-90">
      <div className="flex items-center gap-3 text-amber-300">
        <FaLock />
        <span className="font-bold">Locked</span>
      </div>
      <p className="mt-3 text-sm text-slate-300">
        {lockedText || `Available on ${requiredTier} and higher.`}
      </p>
      <Link
        to="/pricing"
        className="mt-4 inline-flex rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500"
      >
        Upgrade to Unlock
      </Link>
    </div>
  );
}

function SetupStep({ done, icon, title, description, action }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-start gap-4">
        <div className={done ? "text-emerald-400" : "text-cyan-300"}>
          {done ? <FaCheckCircle size={24} /> : icon}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-300">{description}</p>
          {action}
        </div>
      </div>
    </div>
  );
}

export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, activation, refreshActivation } = useAuth();

  const intervalRef = useRef(null);

  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState("paper");
  const [strategy, setStrategy] = useState(STRATEGIES[1]);

  const [balance, setBalance] = useState(START_BALANCE);
  const [profit, setProfit] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [feed, setFeed] = useState([]);

  const [wallet, setWallet] = useState("");
  const [showApiBox, setShowApiBox] = useState(false);

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

  const userTier = user?.tier || "starter";

  const totalTrades = wins + losses;

  const winRate = useMemo(() => {
    if (!totalTrades) return "0.0";
    return ((wins / totalTrades) * 100).toFixed(1);
  }, [wins, totalTrades]);

  const setupScore = useMemo(() => {
    let score = 25;
    if (wallet) score += 20;
    if (activation?.okx_connected) score += 25;
    if (activation?.alpaca_connected) score += 25;
    if (user?.tier && user.tier !== "starter") score += 5;
    return Math.min(score, 100);
  }, [wallet, activation, user]);

  const generateTrade = () => {
    const assets = ["BTC", "ETH", "SOL", "AAPL", "TSLA", "NVDA"];
    const symbol = assets[Math.floor(Math.random() * assets.length)];
    const won = Math.random() < strategy.winRate;
    const amount = Number(((Math.random() * 25 + 5) * (strategy.id === "aggressive" ? 1.8 : 1)).toFixed(2));
    const pnl = won ? amount : -amount * 0.7;

    const trade = {
      id: Date.now(),
      symbol,
      pnl,
      type: won ? "Take Profit" : "Stop Loss",
      mode,
      time: new Date().toLocaleTimeString(),
    };

    setFeed((prev) => [trade, ...prev.slice(0, 24)]);
    setBalance((prev) => prev + pnl);
    setProfit((prev) => prev + pnl);

    if (won) setWins((prev) => prev + 1);
    else setLosses((prev) => prev + 1);
  };

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(generateTrade, 2200);
    return () => clearInterval(intervalRef.current);
  }, [running, strategy, mode]);

  const resetDashboard = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setBalance(START_BALANCE);
    setProfit(0);
    setWins(0);
    setLosses(0);
    setFeed([]);
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask was not detected. Please install MetaMask first.");
      return;
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    setWallet(accounts[0]);
  };

  const saveOKX = async () => {
    if (!okx.api_key || !okx.api_secret || !okx.passphrase) {
      alert("Please enter your OKX API key, secret, and passphrase.");
      return;
    }

    const result = await BotAPI.connectOKX?.(okx);

    if (result?.success) {
      alert("OKX connected.");
      await refreshActivation?.(true);
    } else {
      alert(result?.error || "Could not connect OKX.");
    }
  };

  const saveAlpaca = async () => {
    if (!alpaca.api_key || !alpaca.api_secret) {
      alert("Please enter your Alpaca API key and secret.");
      return;
    }

    const result = await BotAPI.connectAlpaca?.(alpaca);

    if (result?.success) {
      alert("Alpaca connected.");
      await refreshActivation?.(true);
    } else {
      alert(result?.error || "Could not connect Alpaca.");
    }
  };

  const startLiveTrading = () => {
    if (mode === "live" && !activation?.okx_connected && !activation?.alpaca_connected) {
      alert("Connect OKX or Alpaca before starting live trading.");
      return;
    }

    setRunning((prev) => !prev);
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="text-2xl font-bold">Please log in first</h1>
          <button
            onClick={() => navigate("/login")}
            className="mt-5 rounded-2xl bg-emerald-600 px-6 py-3 font-bold"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <div className="sticky top-0 z-50 bg-gradient-to-r from-emerald-600 to-cyan-600">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <p className="text-sm font-bold">Member Dashboard</p>
              <p className="text-xs text-white/90">
                Practice first. Connect when ready. Go live in minutes.
              </p>
            </div>
          </div>

          <div className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
            Current Plan: {userTier.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className={`${card} border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-indigo-500/5`}>
          <h2 className="mb-4 text-2xl font-bold">Your Simple Setup Path</h2>

          <div className="grid gap-4 md:grid-cols-4">
            <SetupStep
              done={true}
              icon={<FaShieldAlt size={24} />}
              title="1. Practice"
              description="Use paper trading first with virtual funds."
            />

            <SetupStep
              done={activation?.okx_connected || activation?.alpaca_connected}
              icon={<FaPlug size={24} />}
              title="2. Connect API"
              description="Connect OKX for crypto or Alpaca for stocks."
              action={
                <button
                  onClick={() => setShowApiBox((prev) => !prev)}
                  className="mt-3 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold hover:bg-cyan-500"
                >
                  Connect API
                </button>
              }
            />

            <SetupStep
              done={!!wallet}
              icon={<FaWallet size={24} />}
              title="3. Connect Wallet"
              description="Connect MetaMask for DeFi features."
              action={
                <button
                  onClick={connectWallet}
                  className="mt-3 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold hover:bg-purple-500"
                >
                  {wallet ? "Wallet Connected" : "Connect MetaMask"}
                </button>
              }
            />

            <SetupStep
              done={setupScore >= 75}
              icon={<FaRocket size={24} />}
              title="4. Go Live"
              description="Switch from paper to live when ready."
            />
          </div>

          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs text-white/60">
              <span>Trading Readiness</span>
              <span>{setupScore}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                style={{ width: `${setupScore}%` }}
              />
            </div>
          </div>
        </div>

        {showApiBox && (
          <div className={`${card} grid gap-5 lg:grid-cols-2`}>
            <div>
              <h3 className="mb-3 text-xl font-bold">Connect OKX</h3>

              <select
                value={okx.mode}
                onChange={(e) => setOkx({ ...okx, mode: e.target.value })}
                className="mb-3 w-full rounded-xl bg-black/40 p-3 text-white"
              >
                <option value="paper">Paper OKX</option>
                <option value="live">Live OKX</option>
              </select>

              <input
                placeholder="OKX API Key"
                value={okx.api_key}
                onChange={(e) => setOkx({ ...okx, api_key: e.target.value })}
                className="mb-3 w-full rounded-xl bg-black/40 p-3 text-white"
              />
              <input
                placeholder="OKX Secret"
                type="password"
                value={okx.api_secret}
                onChange={(e) => setOkx({ ...okx, api_secret: e.target.value })}
                className="mb-3 w-full rounded-xl bg-black/40 p-3 text-white"
              />
              <input
                placeholder="OKX Passphrase"
                type="password"
                value={okx.passphrase}
                onChange={(e) => setOkx({ ...okx, passphrase: e.target.value })}
                className="mb-3 w-full rounded-xl bg-black/40 p-3 text-white"
              />

              <button onClick={saveOKX} className="rounded-2xl bg-emerald-600 px-5 py-3 font-bold">
                Save OKX Keys
              </button>
            </div>

            <div>
              <h3 className="mb-3 text-xl font-bold">Connect Alpaca</h3>

              <select
                value={alpaca.mode}
                onChange={(e) => setAlpaca({ ...alpaca, mode: e.target.value })}
                className="mb-3 w-full rounded-xl bg-black/40 p-3 text-white"
              >
                <option value="paper">Paper Alpaca</option>
                <option value="live">Live Alpaca</option>
              </select>

              <input
                placeholder="Alpaca API Key"
                value={alpaca.api_key}
                onChange={(e) => setAlpaca({ ...alpaca, api_key: e.target.value })}
                className="mb-3 w-full rounded-xl bg-black/40 p-3 text-white"
              />
              <input
                placeholder="Alpaca Secret"
                type="password"
                value={alpaca.api_secret}
                onChange={(e) => setAlpaca({ ...alpaca, api_secret: e.target.value })}
                className="mb-3 w-full rounded-xl bg-black/40 p-3 text-white"
              />

              <button onClick={saveAlpaca} className="rounded-2xl bg-blue-600 px-5 py-3 font-bold">
                Save Alpaca Keys
              </button>
            </div>
          </div>
        )}

        <div className={`${card} overflow-hidden`}>
          <div className="flex flex-col items-center justify-between gap-8 lg:flex-row">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-200">
                <FaRobot />
                IMALI Trading Control Center
              </div>

              <h1 className="mt-5 text-4xl font-extrabold leading-tight md:text-5xl">
                Move From Demo to Live Trading Without a Learning Curve
              </h1>

              <p className="mt-5 text-lg leading-8 text-slate-300">
                Use the same simple dashboard from demo mode, then connect OKX,
                Alpaca, or MetaMask when you are ready.
                <span className="mt-2 block text-emerald-400">
                  Paper mode is for practice. Live mode uses connected accounts.
                </span>
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  onClick={startLiveTrading}
                  className={`flex items-center gap-2 rounded-2xl px-6 py-3 font-bold transition ${
                    running ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  {running ? <FaPause /> : <FaPlay />}
                  {running ? "Pause Bot" : mode === "live" ? "Start Live Bot" : "Start Paper Bot"}
                </button>

                <button
                  onClick={resetDashboard}
                  className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-6 py-3 font-bold hover:bg-white/20"
                >
                  <FaRedo />
                  Reset
                </button>

                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/40 px-6 py-3 font-bold text-white"
                >
                  <option value="paper">Paper Trading</option>
                  <option value="live">Live Trading</option>
                </select>
              </div>

              <p className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                <FaShieldAlt className="text-emerald-400" />
                Beginner tip: test in paper mode before switching to live mode.
              </p>
            </div>

            <div className="w-full max-w-sm">
              <div className="rounded-3xl border border-white/10 bg-black/40 p-6">
                <div className="text-sm text-white/50">
                  {mode === "live" ? "Connected Account View" : "Paper Account Balance"}
                </div>

                <div
                  className={`mt-2 text-5xl font-extrabold ${
                    balance >= START_BALANCE ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {formatMoney(balance)}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-white/50">P&L</span>
                  <span className={`font-bold ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {profit >= 0 ? "+" : ""}
                    {formatMoney(profit)}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white/5 p-3">
                    <div className="text-white/50">Trades</div>
                    <div className="text-xl font-bold">{totalTrades}</div>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3">
                    <div className="text-white/50">Win Rate</div>
                    <div className="text-xl font-bold">{winRate}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
                  onClick={() => !running && setStrategy(item)}
                  className={`rounded-3xl border p-5 text-left transition ${
                    active ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 bg-black/20 hover:bg-white/5"
                  } ${running ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <div className="text-4xl">{item.icon}</div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold">{item.name}</h3>
                    <span className="text-xs text-white/50">{item.risk}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
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
                  <h2 className="text-2xl font-bold">Live Trade Feed</h2>
                </div>

                {running && (
                  <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    Running
                  </div>
                )}
              </div>

              {!feed.length ? (
                <div className="py-20 text-center text-white/30">
                  <div className="mb-4 text-6xl">🤖</div>
                  <p>Start paper or live mode to see activity here.</p>
                </div>
              ) : (
                <div className="max-h-[600px] space-y-3 overflow-y-auto pr-2">
                  {feed.map((trade) => (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div>
                        <div className="font-bold">{trade.symbol}</div>
                        <div className="text-xs text-white/40">
                          {trade.type} • {trade.mode.toUpperCase()} • {trade.time}
                        </div>
                      </div>

                      <div className={`text-lg font-bold ${trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {trade.pnl >= 0 ? "+" : ""}
                        {formatMoney(trade.pnl)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className={card}>
              <div className="mb-4 flex items-center gap-2">
                <FaShieldAlt className="text-emerald-300" />
                <h2 className="text-xl font-bold">Beginner Safety</h2>
              </div>

              <ul className="space-y-3 text-sm leading-7 text-slate-300">
                <li>✅ Start with paper trading</li>
                <li>✅ Connect API only when ready</li>
                <li>✅ Switch live mode on manually</li>
                <li>✅ Use strategy controls</li>
                <li>✅ Connect wallet for DeFi tools</li>
              </ul>
            </div>

            <div className={card}>
              <h2 className="mb-4 text-xl font-bold">Connections</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between rounded-2xl bg-black/20 p-4">
                  <span>OKX</span>
                  <span className={activation?.okx_connected ? "text-emerald-400" : "text-white/50"}>
                    {activation?.okx_connected ? "Connected" : "Not Connected"}
                  </span>
                </div>

                <div className="flex justify-between rounded-2xl bg-black/20 p-4">
                  <span>Alpaca</span>
                  <span className={activation?.alpaca_connected ? "text-emerald-400" : "text-white/50"}>
                    {activation?.alpaca_connected ? "Connected" : "Not Connected"}
                  </span>
                </div>

                <div className="flex justify-between rounded-2xl bg-black/20 p-4">
                  <span>MetaMask</span>
                  <span className={wallet ? "text-emerald-400" : "text-white/50"}>
                    {wallet ? "Connected" : "Not Connected"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowApiBox(true)}
                className="mt-5 w-full rounded-2xl bg-cyan-600 px-5 py-3 font-bold hover:bg-cyan-500"
              >
                Manage Connections
              </button>
            </div>
          </div>
        </div>

        <div className={card}>
          <div className="mb-5 flex items-center gap-3">
            <FaCrown className="text-yellow-300" />
            <h2 className="text-2xl font-bold">IMALI Features</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {FEATURE_CARDS.map((feature) => {
              const unlocked = canAccess(userTier, feature.tier);

              return (
                <div
                  key={feature.title}
                  className={`rounded-3xl border p-5 ${
                    unlocked ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-black/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={unlocked ? "text-emerald-300" : "text-white/50"}>
                      {feature.icon}
                    </div>

                    {!unlocked && <FaLock className="text-amber-300" />}
                  </div>

                  <h3 className="mt-4 text-lg font-bold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{feature.description}</p>

                  <div className="mt-4 text-xs font-bold uppercase text-white/50">
                    {unlocked ? "Unlocked" : `${feature.tier}+`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <FeatureGate
            userTier={userTier}
            requiredTier="elite"
            lockedText="Staking is available on Elite and higher."
          >
            <div className={card}>
              <h2 className="mb-3 text-2xl font-bold">IMALI Staking</h2>
              <p className="text-sm text-slate-300">
                Stake IMALI tokens and track rewards from your dashboard.
              </p>
              <button className="mt-5 rounded-2xl bg-emerald-600 px-5 py-3 font-bold">
                Open Staking
              </button>
            </div>
          </FeatureGate>

          <FeatureGate
            userTier={userTier}
            requiredTier="elite"
            lockedText="Lending is available on Elite and higher."
          >
            <div className={card}>
              <h2 className="mb-3 text-2xl font-bold">Lending</h2>
              <p className="text-sm text-slate-300">
                Access lending and borrowing tools when enabled.
              </p>
              <button className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 font-bold">
                Open Lending
              </button>
            </div>
          </FeatureGate>
        </div>

        <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 p-8 text-center">
          <div className="mb-4 text-5xl">🚀</div>
          <h2 className="text-3xl font-extrabold">Ready to unlock more?</h2>
          <p className="mx-auto mt-4 max-w-3xl leading-8 text-slate-300">
            Upgrade when you are ready for live trading, advanced automation,
            wallet tools, staking, lending, and premium IMALI features.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate("/pricing")}
              className="rounded-2xl bg-emerald-600 px-8 py-4 font-bold transition hover:bg-emerald-500"
            >
              View Pricing →
            </button>

            <button
              onClick={() => navigate("/support")}
              className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold transition hover:bg-white/10"
            >
              Need Help?
            </button>
          </div>
        </div>

        <div className="pb-4 text-center text-xs text-white/30">
          Paper trading uses simulated funds. Live trading requires connected accounts and carries risk.
        </div>
      </div>
    </div>
  );
}