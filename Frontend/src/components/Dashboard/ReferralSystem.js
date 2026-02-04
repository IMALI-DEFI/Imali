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
  const url = base ? `${base}${path}` : path; // allows local curl / same-origin if proxied

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // If endpoint doesn't exist, throw so we can fallback safely
  if (res.status === 404) throw new Error("endpoint_not_found");

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

function shortCodeFromString(s = "") {
  // deterministic, simple "code" (NOT security)
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
};

/* ------------------------------ UI ------------------------------ */
function Tile({ title, value, icon: Icon, accent = "emerald" }) {
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
      <div className="text-2xl font-extrabold">{value}</div>
    </div>
  );
}

/* ------------------------------ Component ------------------------------ */
export default function ReferralSystemDashboard() {
  const { user, token, loading } = useAuth();
  const { account } = useWallet();

  const [referralData, setReferralData] = useState({
    code: "",
    totalReferrals: 0,
    level1Earnings: 0,
    level2Earnings: 0,
    pendingRewards: 0,
  });

  const [referralInput, setReferralInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  // Decide the best “identity” for code generation:
  // wallet > user.id > user.email
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

  // Load stats:
  // - If your backend has referral endpoints, it will use them
  // - Otherwise it falls back to demo stats (but still shows a working referral link)
  useEffect(() => {
    let mounted = true;

    async function load() {
      setNote("");
      // always at least set code so QR/link work
      setReferralData((p) => ({ ...p, code: referralCode || "" }));

      if (!token) {
        // not logged in yet -> don't spam calls
        return;
      }

      try {
        // Recommended endpoints (you can wire these later):
        // GET  /api/referrals/summary  -> { code, totalReferrals, level1Earnings, level2Earnings, pendingRewards }
        const data = await apiFetch("/api/referrals/summary", { token });

        if (!mounted) return;
        setReferralData({
          code: data.code || referralCode,
          totalReferrals: Number(data.totalReferrals || 0),
          level1Earnings: Number(data.level1Earnings || 0),
          level2Earnings: Number(data.level2Earnings || 0),
          pendingRewards: Number(data.pendingRewards || 0),
        });
      } catch (e) {
        if (!mounted) return;

        // fallback demo values
        setReferralData((p) => ({
          ...p,
          code: p.code || referralCode || "",
          totalReferrals: p.totalReferrals || 12,
          level1Earnings: p.level1Earnings || 5.42,
          level2Earnings: p.level2Earnings || 1.23,
          pendingRewards: p.pendingRewards || 2.15,
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
      "Join me on IMALI — crypto trading made simple:"
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
      // Recommended endpoint:
      // POST /api/referrals/apply { code }
      await apiFetch("/api/referrals/apply", {
        token,
        method: "POST",
        body: { code },
      });

      setReferralInput("");
      setNote(`Referral code ${code} applied ✅`);
    } catch (e) {
      // fallback: still clear input, but tell user
      setReferralInput("");
      setNote("Apply endpoint not connected yet (saved locally only).");
    } finally {
      setBusy(false);
    }
  };

  const claimRewards = async () => {
    setBusy(true);
    setNote("");
    try {
      // Recommended endpoint:
      // POST /api/referrals/claim
      await apiFetch("/api/referrals/claim", { token, method: "POST" });

      setReferralData((p) => ({ ...p, pendingRewards: 0 }));
      setNote("Rewards claimed ✅");
    } catch (e) {
      // fallback demo behavior
      setReferralData((p) => ({ ...p, pendingRewards: 0 }));
      setNote("Claim endpoint not connected yet — cleared demo pending rewards.");
    } finally {
      setBusy(false);
    }
  };

  const locked = !token; // dashboard should be logged-in
  const displayCode = referralData.code || referralCode || "";

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 via-yellow-300 to-pink-300 bg-clip-text text-transparent flex items-center justify-center gap-3">
            <FaUserFriends /> Referrals Dashboard
          </h1>
          <p className="mt-3 text-white/80 max-w-2xl mx-auto">
            Share your link, track rewards, and build a network. Earnings can pay out in USDC/IMALI.
          </p>

          {note ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80">
              {note}
            </div>
          ) : null}
        </div>

        {locked ? (
          <div className="max-w-xl mx-auto rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <div className="text-lg font-semibold">Login required</div>
            <p className="text-sm text-white/70 mt-1">
              Please log in to view referral stats and claim rewards.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Link
                to="/signup"
                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold"
              >
                Signup
              </Link>
              <Link
                to="/pricing"
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold"
              >
                View Pricing
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* LEFT: Explainer + Bot + QR */}
            <aside className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
                <img
                  src={referralImg}
                  alt="IMALI Referral overview"
                  className="w-full rounded-xl mb-4"
                />
                <h3 className="text-lg font-bold mb-2">How it works</h3>
                <ol className="list-decimal list-inside text-white/80 space-y-1 text-sm">
                  <li>Your referral link is tied to your account (and wallet when connected).</li>
                  <li>Share your link or QR. Friends sign up and choose a tier.</li>
                  <li>You earn rewards and can claim them here.</li>
                </ol>

                <a
                  href="https://t.me/Imalitradingbot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  <FaTelegram className="mr-2" /> Start via Telegram
                </a>
              </div>

              {/* Referral Bot Value Card */}
              <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-amber-900/10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <FaRobot /> Your Referral Bot
                  </h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/30">
                    Value Accrual
                  </span>
                </div>

                <img
                  src={referralBot}
                  alt="IMALI Referral Bot"
                  className="w-full rounded-xl border border-amber-400/20 mb-4"
                />

                <p className="text-sm text-white/80">
                  As IMALI scales (more users, more signals, more partner volume), your
                  network can unlock stronger utilities:
                </p>

                <ul className="mt-3 text-sm space-y-2 text-white/85">
                  <li>• <b>Tier Boosts:</b> Higher tiers referred can increase payout multipliers.</li>
                  <li>• <b>Volume Rewards:</b> Milestone bonuses from your network’s activity.</li>
                  <li>• <b>Staking Synergy:</b> Holding/staking IMALI can boost partner payouts.</li>
                  <li>• <b>Leaderboards:</b> Seasonal pools and rare collectibles.</li>
                  <li>• <b>Partner Access:</b> Early betas and proposals.</li>
                </ul>

                <p className="mt-3 text-xs text-white/60">
                  Program specifics can evolve as the platform grows.
                </p>
              </div>

              {/* QR + Link */}
              <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-600/20 to-emerald-900/30 p-5">
                <h3 className="text-lg font-bold mb-3">Your Referral Link</h3>

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
                    className="flex-1 p-3 rounded-l-xl bg-black/40 border border-emerald-500/30 text-sm"
                    placeholder="Generating…"
                  />
                  <button
                    onClick={copyToClipboard}
                    disabled={!referralUrl}
                    className={[
                      "px-4 rounded-r-xl flex items-center gap-2",
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
                  className="mt-3 w-full py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white inline-flex items-center justify-center"
                  disabled={!referralUrl}
                >
                  <FaShareAlt className="mr-2" /> Share on X/Twitter
                </button>

                <div className="mt-3 text-xs text-white/60">
                  Referral Code: <span className="text-white/90 font-semibold">{displayCode || "—"}</span>
                </div>
              </div>
            </aside>

            {/* RIGHT: Stats + Actions */}
            <section className="lg:col-span-3 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Tile title="Referrals" value={referralData.totalReferrals} icon={FaUserFriends} accent="emerald" />
                <Tile title="Level 1" value={`${referralData.level1Earnings} IMALI`} icon={FaCoins} accent="yellow" />
                <Tile title="Level 2" value={`${referralData.level2Earnings} IMALI`} icon={FaCoins} accent="amber" />
                <Tile title="Pending" value={`${referralData.pendingRewards} IMALI`} icon={FaChartLine} accent="violet" />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold">Claim your rewards</h3>
                    <p className="text-sm text-white/70">
                      Payouts in USDC or IMALI. Your wallet is optional for tracking, but required for on-chain claims.
                    </p>
                  </div>

                  <button
                    onClick={claimRewards}
                    disabled={busy || referralData.pendingRewards <= 0}
                    className={[
                      "px-6 py-3 rounded-2xl font-semibold",
                      referralData.pendingRewards > 0 && !busy
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-gray-600/40 cursor-not-allowed",
                    ].join(" ")}
                  >
                    {busy ? "Working…" : "Claim Rewards"}
                  </button>
                </div>

                <div className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
                  <ul className="space-y-2 list-disc list-inside text-white/80">
                    <li>Referral share on signups from your link (can be paid in USDC).</li>
                    <li>Influencers may receive a global pool payout via statement.</li>
                  </ul>
                  <ul className="space-y-2 list-disc list-inside text-white/80">
                    <li>Rewards typically unlock after tier selection + activation.</li>
                    <li>Track live stats here as backend/on-chain integration completes.</li>
                  </ul>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-amber-900/10 p-6">
                <h3 className="font-semibold mb-3">Have a referral code?</h3>
                <div className="flex">
                  <input
                    type="text"
                    placeholder="Enter referral code"
                    value={referralInput}
                    onChange={(e) => setReferralInput(e.target.value)}
                    className="flex-1 p-3 rounded-l-xl bg-black/40 border border-amber-400/30"
                  />
                  <button
                    onClick={registerReferral}
                    disabled={busy || !referralInput.trim()}
                    className={[
                      "px-6 py-3 rounded-r-xl",
                      referralInput.trim() && !busy
                        ? "bg-amber-500 hover:bg-amber-600"
                        : "bg-gray-500/40 cursor-not-allowed",
                    ].join(" ")}
                  >
                    {busy ? "…" : "Apply"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-white/70">
                  Tip: Ask a friend for their code to earn them a bonus.
                </p>
              </div>

              <div className="rounded-2xl border border-indigo-400/30 p-6 bg-gradient-to-r from-indigo-600/20 to-purple-700/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">Ready to invite friends?</h3>
                  <p className="text-sm text-white/80">
                    Choose a tier so your referrals track instantly.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link
                    to="/pricing"
                    className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold"
                  >
                    View Pricing
                  </Link>
                  <Link
                    to="/signup"
                    className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold"
                  >
                    Go to Signup
                  </Link>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}