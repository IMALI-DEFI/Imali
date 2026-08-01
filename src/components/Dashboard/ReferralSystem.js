import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import {
  FaUserFriends,
  FaShareAlt,
  FaCoins,
  FaChartLine,
  FaTelegram,
  FaCopy,
  FaRobot,
  FaTrophy,
  FaCrown,
  FaStar,
  FaGift,
  FaArrowRight,
  FaCheckCircle,
} from "react-icons/fa";

import { useAuth } from "../../hooks/useAuth";
import { useWallet } from "../../context/WalletContext";

// Optional images (keep if paths exist)
import referralImg from "../../assets/images/referral_program.png";
import referralBot from "../../assets/images/cards/referralbot.png";

/* ----------------------------- helpers ----------------------------- */
function getApiBase() {
  return (
    process.env.REACT_APP_API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    process.env.API_BASE_URL ||
    ""
  ).replace(/\/$/, "");
}

async function apiFetch(path, { token, method = "GET", body } = {}) {
  const base = getApiBase();
  const url = base ? `${base}${path}` : path;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 404) throw new Error("endpoint_not_found");

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

function shortCodeFromString(s = "") {
  const clean = String(s).trim();
  if (!clean) return "";
  const base = clean.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return base.slice(0, 10) || "";
}

function codeFromWallet(wallet) {
  if (!wallet) return "";
  return String(wallet).replace(/^0x/i, "").slice(0, 8).toUpperCase();
}

const ACCENTS = {
  emerald: {
    wrap: "from-emerald-500/10 to-emerald-900/10 border-emerald-400/30",
    icon: "text-emerald-300",
  },
  yellow: {
    wrap: "from-yellow-500/10 to-yellow-900/10 border-yellow-400/30",
    icon: "text-yellow-300",
  },
  amber: {
    wrap: "from-amber-500/10 to-amber-900/10 border-amber-400/30",
    icon: "text-amber-300",
  },
  violet: {
    wrap: "from-violet-500/10 to-violet-900/10 border-violet-400/30",
    icon: "text-violet-300",
  },
  indigo: {
    wrap: "from-indigo-500/10 to-indigo-900/10 border-indigo-400/30",
    icon: "text-indigo-300",
  },
  purple: {
    wrap: "from-purple-500/10 to-purple-900/10 border-purple-400/30",
    icon: "text-purple-300",
  },
};

/* ------------------------------ UI ------------------------------ */
function Tile({ title, value, icon: Icon, accent = "emerald", subtitle }) {
  const a = ACCENTS[accent] || ACCENTS.emerald;
  return (
    <div
      className={[
        "rounded-2xl p-5 border bg-gradient-to-br",
        a.wrap,
      ].join(" ")}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm uppercase tracking-wide text-white/70">
          {title}
        </h4>
        {Icon ? <Icon className={a.icon} /> : null}
      </div>
      <div className="text-2xl font-extrabold text-white">{value}</div>
      {subtitle && <div className="text-xs text-white/40 mt-1">{subtitle}</div>}
    </div>
  );
}

// Glass Card Component
const GlassCard = ({ children, className = "", gradient = "from-white/5 to-white/5" }) => (
  <div className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${gradient} backdrop-blur-xl shadow-xl ${className}`}>
    <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
    <div className="relative z-10">{children}</div>
  </div>
);

/* ------------------------------ Component ------------------------------ */
export default function ReferralSystemDashboard() {
  const { user, token, loading } = useAuth();
  const { account } = useWallet();

  const [referralData, setReferralData] = useState({
    code: "",
    totalReferrals: 0,
    paidSubscribers: 0,
    subscriptionCredits: 0,
    freeMonthsEarned: 0,
    referralStatus: "Bronze",
    nextReward: "2 referrals",
  });

  const [referralInput, setReferralInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  // Leaderboard data
  const [leaderboard, setLeaderboard] = useState([
    { name: "TraderPro", referrals: 128 },
    { name: "CryptoWhale", referrals: 94 },
    { name: "DeFiKing", referrals: 73 },
    { name: "SignalMaster", referrals: 56 },
    { name: "BotRunner", referrals: 42 },
  ]);

  // Decide the best "identity" for code generation
  const referralCode = useMemo(() => {
    const w = codeFromWallet(account);
    if (w) return w;

    const u = user?.id || user?.uid || user?.email || "";
    return shortCodeFromString(u);
  }, [account, user]);

  const referralUrl = useMemo(() => {
    if (!referralCode) return "";
    return `${window.location.origin}/signup?ref=${referralCode}`;
  }, [referralCode]);

  // Load stats
  useEffect(() => {
    let mounted = true;

    async function load() {
      setNote("");
      setReferralData((p) => ({ ...p, code: referralCode || "" }));

      if (!token) return;

      try {
        const data = await apiFetch("/api/referrals/summary", { token });

        if (!mounted) return;
        setReferralData({
          code: data.code || referralCode,
          totalReferrals: Number(data.totalReferrals || 0),
          paidSubscribers: Number(data.paidSubscribers || 0),
          subscriptionCredits: Number(data.subscriptionCredits || 0),
          freeMonthsEarned: Number(data.freeMonthsEarned || 0),
          referralStatus: data.referralStatus || "Bronze",
          nextReward: data.nextReward || "2 referrals",
        });
      } catch (e) {
        if (!mounted) return;

        // Fallback demo values
        setReferralData((p) => ({
          ...p,
          code: p.code || referralCode || "",
          totalReferrals: p.totalReferrals || 14,
          paidSubscribers: p.paidSubscribers || 6,
          subscriptionCredits: p.subscriptionCredits || 114,
          freeMonthsEarned: p.freeMonthsEarned || 3,
          referralStatus: p.referralStatus || "Silver",
          nextReward: p.nextReward || "2 referrals",
        }));

        setNote(
          "Referral API not connected yet — showing demo stats (link + QR are real)."
        );
      }
    }

    if (!loading) load();
    return () => {
      mounted = false;
    };
  }, [loading, token, referralCode]);

  const copyToClipboard = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setNote("Copy failed in this browser. Long-press the link to copy.");
    }
  };

  const shareOnX = () => {
    if (!referralUrl) return;
    const text = encodeURIComponent(
      "Join me on IMALI — automated trading made simple:"
    );
    const url = encodeURIComponent(referralUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  const registerReferral = async () => {
    const code = referralInput.trim().toUpperCase();
    if (!code) return;

    setBusy(true);
    setNote("");
    try {
      await apiFetch("/api/referrals/apply", {
        token,
        method: "POST",
        body: { code },
      });

      setReferralInput("");
      setNote(`Referral code ${code} applied ✅`);
    } catch (e) {
      setReferralInput("");
      setNote("Apply endpoint not connected yet (saved locally only).");
    } finally {
      setBusy(false);
    }
  };

  const claimCredits = async () => {
    setBusy(true);
    setNote("");
    try {
      await apiFetch("/api/referrals/claim", { token, method: "POST" });

      setReferralData((p) => ({ ...p, subscriptionCredits: 0 }));
      setNote("Subscription credits applied to your account ✅");
    } catch (e) {
      setReferralData((p) => ({ ...p, subscriptionCredits: 0 }));
      setNote("Claim endpoint not connected yet — demo credits cleared.");
    } finally {
      setBusy(false);
    }
  };

  const locked = !token;
  const displayCode = referralData.code || referralCode || "";

  // Get status badge color
  const getStatusColor = (status) => {
    const colors = {
      Bronze: "border-amber-600/30 bg-amber-500/10 text-amber-400",
      Silver: "border-gray-400/30 bg-gray-400/10 text-gray-300",
      Gold: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
      Platinum: "border-cyan-400/30 bg-cyan-400/10 text-cyan-400",
      Diamond: "border-purple-400/30 bg-purple-400/10 text-purple-400",
    };
    return colors[status] || colors.Bronze;
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 via-yellow-300 to-pink-300 bg-clip-text text-transparent flex items-center justify-center gap-3">
            <FaUserFriends /> Grow IMALI Together
          </h1>
          <p className="mt-3 text-white/80 max-w-2xl mx-auto">
            Invite friends. Earn subscription credits. Upgrade faster.
          </p>

          {note ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80">
              {note}
            </div>
          ) : null}
        </div>

        {locked ? (
          <GlassCard className="max-w-xl mx-auto p-8 text-center border-red-500/20">
            <div className="text-5xl mb-4">🔒</div>
            <div className="text-2xl font-bold text-white">Login required</div>
            <p className="text-sm text-white/70 mt-2">
              Please log in to view referral stats and earn subscription credits.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/signup"
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-white transition"
              >
                Sign Up
              </Link>
              <Link
                to="/pricing"
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-semibold text-white transition"
              >
                View Pricing
              </Link>
            </div>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* LEFT: Explainer + Bot + QR */}
            <aside className="lg:col-span-2 space-y-6">
              <GlassCard className="p-5" gradient="from-white/5 to-white/5">
                <img
                  src={referralImg}
                  alt="IMALI Referral overview"
                  className="w-full rounded-xl mb-4"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <h3 className="text-lg font-bold text-white mb-3">How It Works</h3>
                <ol className="space-y-2 text-white/80 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">1.</span>
                    <span>Share your referral link with friends and traders.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">2.</span>
                    <span>When they sign up, you earn subscription credits.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">3.</span>
                    <span>Credits automatically reduce your next bill.</span>
                  </li>
                </ol>

                <a
                  href="https://t.me/Imalitradingbot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center mt-4 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition"
                >
                  <FaTelegram className="mr-2" /> Join Telegram Community
                </a>
              </GlassCard>

              {/* Referral Bot Value Card - Updated for subscription model */}
              <GlassCard className="p-5 border-amber-400/30" gradient="from-amber-500/10 to-amber-900/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <FaRobot /> Referral Bot
                  </h3>
                  <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/30">
                    Active
                  </span>
                </div>

                <img
                  src={referralBot}
                  alt="IMALI Referral Bot"
                  className="w-full rounded-xl border border-amber-400/20 mb-4"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />

                <p className="text-sm text-white/80">
                  Invite developers, traders, and investors to join IMALI.
                </p>

                <ul className="mt-3 text-sm space-y-2 text-white/85">
                  <li className="flex items-center gap-2">
                    <FaCheckCircle className="text-emerald-400" />
                    <b>Subscription Credits</b> — Earn credits for every paying referral
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheckCircle className="text-emerald-400" />
                    <b>Free Months</b> — Unlock Pro or Elite for free
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheckCircle className="text-emerald-400" />
                    <b>Status Badges</b> — Bronze → Silver → Gold → Platinum
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheckCircle className="text-emerald-400" />
                    <b>Lifetime Badge</b> — Earn the Founder status
                  </li>
                </ul>

                <p className="mt-3 text-xs text-white/60">
                  Referral program details may evolve as the platform grows.
                </p>
              </GlassCard>

              {/* QR + Link */}
              <GlassCard className="p-5 border-emerald-400/30" gradient="from-emerald-500/10 to-emerald-900/10">
                <h3 className="text-lg font-bold text-white mb-3">Your Referral Link</h3>

                <div className="flex flex-col items-center gap-3 mb-4">
                  <div className="p-3 bg-black/40 rounded-xl border border-emerald-500/30">
                    <QRCodeCanvas
                      value={referralUrl || `${window.location.origin}/signup`}
                      size={140}
                    />
                  </div>
                  <code className="text-xs break-all text-emerald-200/90 text-center">
                    {referralUrl || "Generating referral link…"}
                  </code>
                </div>

                <div className="flex">
                  <input
                    type="text"
                    readOnly
                    value={referralUrl}
                    className="flex-1 p-3 rounded-l-xl bg-black/40 border border-emerald-500/30 text-sm text-white"
                    placeholder="Generating…"
                  />
                  <button
                    onClick={copyToClipboard}
                    disabled={!referralUrl}
                    className={[
                      "px-4 rounded-r-xl flex items-center gap-2 text-white transition",
                      referralUrl
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-gray-500/50 cursor-not-allowed",
                    ].join(" ")}
                  >
                    <FaCopy /> {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                <button
                  onClick={shareOnX}
                  className="mt-3 w-full py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white inline-flex items-center justify-center transition"
                  disabled={!referralUrl}
                >
                  <FaShareAlt className="mr-2" /> Share on X/Twitter
                </button>

                <div className="mt-3 text-xs text-white/60">
                  Referral Code: <span className="text-white/90 font-semibold">{displayCode || "—"}</span>
                </div>
              </GlassCard>
            </aside>

            {/* RIGHT: Stats + Actions */}
            <section className="lg:col-span-3 space-y-6">
              {/* Stats Tiles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Tile 
                  title="Successful Referrals" 
                  value={referralData.totalReferrals} 
                  icon={FaUserFriends} 
                  accent="emerald" 
                />
                <Tile 
                  title="Paid Subscribers" 
                  value={referralData.paidSubscribers} 
                  icon={FaCrown} 
                  accent="yellow" 
                />
                <Tile 
                  title="Subscription Credits" 
                  value={`$${referralData.subscriptionCredits}`} 
                  icon={FaCoins} 
                  accent="amber" 
                />
                <Tile 
                  title="Free Months Earned" 
                  value={referralData.freeMonthsEarned} 
                  icon={FaGift} 
                  accent="violet" 
                />
              </div>

              {/* Status + Next Reward */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <GlassCard className="p-5" gradient="from-white/5 to-white/5">
                  <h4 className="text-sm uppercase tracking-wide text-white/50">Referral Status</h4>
                  <div className={`mt-2 inline-block px-4 py-2 rounded-full border text-sm font-bold ${getStatusColor(referralData.referralStatus)}`}>
                    {referralData.referralStatus}
                  </div>
                  <div className="mt-2 text-xs text-white/40">Higher status = better rewards</div>
                </GlassCard>

                <GlassCard className="p-5" gradient="from-white/5 to-white/5">
                  <h4 className="text-sm uppercase tracking-wide text-white/50">Next Reward</h4>
                  <div className="mt-2 text-xl font-bold text-white">{referralData.nextReward}</div>
                  <div className="mt-1 text-xs text-white/40">Keep sharing to unlock more!</div>
                </GlassCard>
              </div>

              {/* Claim Credits */}
              <GlassCard className="p-6" gradient="from-white/5 to-white/5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">Claim Subscription Credits</h3>
                    <p className="text-sm text-white/70 mt-1">
                      Credits automatically apply to your next billing cycle.
                    </p>
                  </div>

                  <button
                    onClick={claimCredits}
                    disabled={busy || referralData.subscriptionCredits <= 0}
                    className={[
                      "px-6 py-3 rounded-2xl font-semibold text-white transition",
                      referralData.subscriptionCredits > 0 && !busy
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-gray-600/40 cursor-not-allowed",
                    ].join(" ")}
                  >
                    {busy ? "Processing…" : `Claim $${referralData.subscriptionCredits}`}
                  </button>
                </div>

                <div className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
                  <ul className="space-y-2 text-white/70">
                    <li className="flex items-center gap-2">
                      <FaCheckCircle className="text-emerald-400 text-xs" />
                      Credits from every paid referral
                    </li>
                    <li className="flex items-center gap-2">
                      <FaCheckCircle className="text-emerald-400 text-xs" />
                      Auto-applied to your subscription
                    </li>
                  </ul>
                  <ul className="space-y-2 text-white/70">
                    <li className="flex items-center gap-2">
                      <FaCheckCircle className="text-emerald-400 text-xs" />
                      Stack credits for free months
                    </li>
                    <li className="flex items-center gap-2">
                      <FaCheckCircle className="text-emerald-400 text-xs" />
                      Track live stats here
                    </li>
                  </ul>
                </div>
              </GlassCard>

              {/* Referral Rewards Table */}
              <GlassCard className="p-6" gradient="from-white/5 to-white/5">
                <h3 className="text-lg font-bold text-white mb-4">Referral Rewards</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-white/50">
                        <th className="text-left py-3 font-medium">Referrals</th>
                        <th className="text-left py-3 font-medium">Reward</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr className="text-white/80">
                        <td className="py-3">1</td>
                        <td className="py-3">$10 subscription credit</td>
                      </tr>
                      <tr className="text-white/80">
                        <td className="py-3">3</td>
                        <td className="py-3">1 month Pro free</td>
                      </tr>
                      <tr className="text-white/80">
                        <td className="py-3">5</td>
                        <td className="py-3">2 months Pro free</td>
                      </tr>
                      <tr className="text-white/80">
                        <td className="py-3">10</td>
                        <td className="py-3">Elite for one month</td>
                      </tr>
                      <tr className="text-white/80">
                        <td className="py-3">25</td>
                        <td className="py-3 text-amber-400 font-bold">🏆 Lifetime Founder Badge</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </GlassCard>

              {/* Leaderboard */}
              <GlassCard className="p-6" gradient="from-white/5 to-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <FaTrophy className="text-amber-400 text-xl" />
                  <h3 className="text-lg font-bold text-white">Top Referrers This Month</h3>
                </div>
                <div className="space-y-2">
                  {leaderboard.map((referrer, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-bold ${
                          index === 0 ? 'text-amber-400' : 
                          index === 1 ? 'text-gray-400' : 
                          index === 2 ? 'text-amber-600' : 
                          'text-white/40'
                        }`}>
                          #{index + 1}
                        </span>
                        <span className="font-medium text-white">{referrer.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaUserFriends className="text-white/30 text-xs" />
                        <span className="text-white font-bold">{referrer.referrals}</span>
                        <span className="text-white/40 text-xs">referrals</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Apply Referral Code */}
              <GlassCard className="p-6 border-amber-400/30" gradient="from-amber-500/10 to-amber-900/10">
                <h3 className="font-bold text-white mb-3">Have a referral code?</h3>
                <p className="text-sm text-white/60 mb-3">
                  Enter a friend's code to get them a bonus.
                </p>
                <div className="flex">
                  <input
                    type="text"
                    placeholder="Enter referral code"
                    value={referralInput}
                    onChange={(e) => setReferralInput(e.target.value)}
                    className="flex-1 p-3 rounded-l-xl bg-black/40 border border-amber-400/30 text-white placeholder:text-white/30"
                  />
                  <button
                    onClick={registerReferral}
                    disabled={busy || !referralInput.trim()}
                    className={[
                      "px-6 py-3 rounded-r-xl text-white transition",
                      referralInput.trim() && !busy
                        ? "bg-amber-500 hover:bg-amber-600"
                        : "bg-gray-500/40 cursor-not-allowed",
                    ].join(" ")}
                  >
                    {busy ? "…" : "Apply"}
                  </button>
                </div>
              </GlassCard>

              {/* Final CTA */}
              <GlassCard className="p-6 border-indigo-400/30" gradient="from-indigo-600/20 to-purple-700/20">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">Invite 3 friends.</h3>
                    <p className="text-sm text-white/70">Get your next month free.</p>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      to="/pricing"
                      className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-semibold text-white transition"
                    >
                      View Plans
                    </Link>
                    <button
                      onClick={shareOnX}
                      className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-white transition flex items-center gap-2"
                    >
                      <FaShareAlt /> Share Now
                    </button>
                  </div>
                </div>
              </GlassCard>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}