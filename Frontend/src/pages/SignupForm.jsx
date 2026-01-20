// src/pages/SignupForm.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

// Art
import StarterNFT from "../assets/images/nfts/nft-starter.png";
import ProNFT from "../assets/images/nfts/nft-pro.png";
import EliteNFT from "../assets/images/nfts/nft-elite.png";
import StockNFT from "../assets/images/nfts/nft-stock.png";
import BundleNFT from "../assets/images/nfts/nft-bundle.png";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  process.env.REACT_APP_API_BASE ||
  "http://localhost:8001";

const TIERS = {
  starter: { img: StarterNFT, label: "Starter", base: 0, color: "from-sky-500 to-sky-700" },
  pro: { img: ProNFT, label: "Pro", base: 19, color: "from-fuchsia-500 to-fuchsia-700" },
  elite: { img: EliteNFT, label: "Elite", base: 49, color: "from-amber-500 to-amber-700" },
  stock: { img: StockNFT, label: "Stocks", base: 99, color: "from-yellow-500 to-yellow-700" },
  bundle: { img: BundleNFT, label: "Bundle", base: 199, color: "from-zinc-500 to-zinc-700" },
};

const STRATEGIES = [
  { value: "momentum", label: "Momentum" },
  { value: "mean_reversion", label: "Mean Reversion" },
  { value: "ai_weighted", label: "AI Weighted" },
  { value: "volume_spike", label: "Volume Spike" },
];

function fireConfetti(container) {
  if (!container) return;
  const EMOJI = ["🎉", "✨", "🏆", "💎", "🚀"];
  const pieces = 22;
  for (let i = 0; i < pieces; i++) {
    const span = document.createElement("span");
    span.textContent = EMOJI[Math.floor(Math.random() * EMOJI.length)];
    span.style.position = "fixed";
    span.style.left = Math.random() * 100 + "vw";
    span.style.top = "-2vh";
    span.style.fontSize = (16 + Math.random() * 18) + "px";
    span.style.pointerEvents = "none";
    span.style.transition = "transform 1.1s ease-out, opacity 1.1s ease-out";
    container.appendChild(span);
    requestAnimationFrame(() => {
      span.style.transform = `translateY(${110 + Math.random() * 80}vh) rotate(${(Math.random() * 360) | 0}deg)`;
      span.style.opacity = "0";
    });
    setTimeout(() => span.remove(), 1300);
  }
}

export default function SignupForm() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const confettiRootRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // ✅ add password (FastAPI should create session/cookie)
  const [tier, setTier] = useState("starter");
  const [strategy, setStrategy] = useState("momentum");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [promo, setPromo] = useState(null); // { eligible:boolean, remaining:number, message:string } optional

  useEffect(() => {
    const qTier = (params.get("tier") || "").toLowerCase();
    if (qTier && TIERS[qTier]) setTier(qTier);
  }, [params]);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);
  const activeTier = TIERS[tier] || TIERS.starter;
  const badgeStyle = `bg-gradient-to-r ${activeTier.color} text-white`;

  // OPTIONAL: ask FastAPI for promo status (safe to ignore if endpoint doesn't exist yet)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/promo/status`, { withCredentials: true });
        if (!mounted) return;
        setPromo(data || null);
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErr("");

    try {
      if (!emailValid) throw new Error("Enter a valid email.");
      if (!password || password.length < 8) throw new Error("Password must be at least 8 characters.");

      // 1) Create account (FastAPI should set a session cookie OR return a token)
      await axios.post(
        `${API_BASE}/auth/signup`,
        { email, password, tier, strategy },
        { withCredentials: true }
      );

      localStorage.setItem("IMALI_EMAIL", email);

      // 2) Free tier -> go Activation (or dashboard)
      if (tier === "starter") {
        fireConfetti(confettiRootRef.current);
        navigate("/activation", { replace: true });
        return;
      }

      // 3) Paid tiers -> Stripe checkout created by FastAPI
      const { data } = await axios.post(
        `${API_BASE}/billing/create-checkout`,
        {
          tier,
          strategy,
          // backend decides pricing + promo eligibility
          success_path: "/activation",
          cancel_path: `/signup?tier=${tier}&canceled=1`,
        },
        { withCredentials: true }
      );

      if (!data?.checkout_url) throw new Error("No checkout URL returned.");
      window.location.href = data.checkout_url;
    } catch (e2) {
      setErr(e2?.response?.data?.detail || e2?.response?.data?.error || e2?.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={confettiRootRef} className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Create your IMALI account
          </h1>
          <p className="mt-2 text-gray-300">
            Pick a plan, pick a strategy, then activate your bots in one place.
          </p>
          <div className="mt-3 text-sm text-emerald-200">
            New promo: <b>First 50 users</b> get <b>5% fee over 3%</b> for <b>90 days</b>. Cancel anytime.
          </div>
          {promo?.message ? (
            <div className="mt-2 text-xs text-white/70">{promo.message}</div>
          ) : null}
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <aside className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${badgeStyle}`}>
                {activeTier.label} Tier
              </div>

              <div className="mt-3 flex items-center gap-3">
                <img src={activeTier.img} alt="Tier" className="w-14 h-14 rounded-lg ring-1 ring-white/10" />
                <div>
                  <div className="font-bold">{activeTier.base ? `$${activeTier.base}/mo` : "Free"}</div>
                  <div className="text-xs text-white/70">Activation happens after checkout (paid tiers)</div>
                </div>
              </div>

              <div className="mt-4 text-sm text-white/80 space-y-2">
                <div>✅ You can switch to <b>Manual (alerts)</b> or <b>Auto</b> later.</div>
                <div>✅ Big STOP buttons exist in your dashboard.</div>
                <div className="text-xs text-amber-200/90">Not financial advice. Trading has risk.</div>
              </div>

              <div className="mt-4 text-xs text-white/60">
                “New Crypto” = DEX tokens (higher risk). “Established Crypto” = CEX pairs like OKX (typically more liquid).
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <h3 className="font-bold mb-2">What you’ll do on Activation</h3>
              <ul className="text-sm text-white/80 space-y-1">
                <li>• Connect OKX (Established Crypto) if you want CEX trading</li>
                <li>• Connect Wallet (New Crypto) if you want DEX trading</li>
                <li>• Connect Stock broker (Paper or live keys)</li>
                <li>• Choose Auto or Manual (alerts)</li>
              </ul>
            </div>
          </aside>

          <section className="lg:col-span-3">
            <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              <div className={`h-1 w-full bg-gradient-to-r ${activeTier.color}`} />

              <div className="p-5 border-b border-white/10">
                <h2 className="text-xl font-bold">Signup</h2>
                <p className="text-xs text-gray-400">FastAPI handles your account + billing + activation.</p>
              </div>

              {err ? (
                <div className="mx-5 mt-4 rounded bg-red-500/10 border border-red-500/30 text-red-200 p-3 text-sm">
                  {err}
                </div>
              ) : null}

              <form onSubmit={submit} className="p-5 grid gap-4">
                <label className="block">
                  <span className="block text-sm mb-1">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 focus:border-emerald-400 outline-none p-3 rounded-xl"
                    placeholder="you@example.com"
                    required
                  />
                </label>

                <label className="block">
                  <span className="block text-sm mb-1">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 focus:border-emerald-400 outline-none p-3 rounded-xl"
                    placeholder="At least 8 characters"
                    required
                  />
                </label>

                <label className="block">
                  <span className="block text-sm mb-1">Strategy</span>
                  <select
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 focus:border-emerald-400 outline-none p-3 rounded-xl"
                  >
                    {STRATEGIES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">You can change this anytime later.</p>
                </label>

                <label className="block">
                  <span className="block text-sm mb-1">Tier</span>
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 focus:border-emerald-400 outline-none p-3 rounded-xl"
                  >
                    <option value="starter">Starter — Free</option>
                    <option value="pro">Pro — $19/mo</option>
                    <option value="elite">Elite — $49/mo</option>
                    <option value="stock">Stocks — $99/mo</option>
                    <option value="bundle">Bundle — $199/mo</option>
                  </select>
                </label>

                <button
                  type="submit"
                  disabled={!emailValid || loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 disabled:opacity-60 py-3 font-bold"
                >
                  {loading ? "Processing…" : tier === "starter" ? "Create account (Free)" : "Continue to secure checkout"}
                </button>

                <div className="text-xs text-white/60">
                  Already have an account? <Link className="underline text-emerald-300" to="/login">Log in</Link>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}