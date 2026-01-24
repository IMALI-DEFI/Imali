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

/**
 * API Base resolution (supports CRA + Vite)
 * - Vite:  VITE_API_BASE
 * - CRA:   REACT_APP_API_BASE
 * - Local: http://localhost:8001 (only when hostname is localhost)
 * - Prod:  https://api.imali-defi.com (safe default)
 */
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  process.env.REACT_APP_API_BASE ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8001"
    : "https://api.imali-defi.com");

// ✅ Python backend routes are under /api/*
const API = {
  signup: `${API_BASE}/api/signup`,
  promoStatus: `${API_BASE}/api/promo/status`,
  checkout: `${API_BASE}/api/billing/create-checkout`, // Fixed endpoint
};

const TIERS = {
  starter: {
    img: StarterNFT,
    label: "Starter",
    base: 0,
    color: "from-sky-500 to-sky-700",
  },
  pro: {
    img: ProNFT,
    label: "Pro",
    base: 19,
    color: "from-fuchsia-500 to-fuchsia-700",
  },
  elite: {
    img: EliteNFT,
    label: "Elite",
    base: 49,
    color: "from-amber-500 to-amber-700",
  },
  stock: {
    img: StockNFT,
    label: "Stocks",
    base: 99,
    color: "from-yellow-500 to-yellow-700",
  },
  bundle: {
    img: BundleNFT,
    label: "Bundle",
    base: 199,
    color: "from-zinc-500 to-zinc-700",
  },
};

/**
 * IMPORTANT:
 * Your backend tests used "growth" as the strategy value.
 * So the dropdown values here match backend values.
 */
const STRATEGIES = [
  { value: "growth", label: "Growth" },
  { value: "conservative", label: "Conservative" },
  { value: "balanced", label: "Balanced" },
  { value: "aggressive", label: "Aggressive" },
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
    span.style.fontSize = `${16 + Math.random() * 18}px`;
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

function pickTierFromQuery(qTierRaw) {
  const qTier = (qTierRaw || "").toLowerCase().trim();
  return qTier && TIERS[qTier] ? qTier : null;
}

function pickStrategyFromQuery(qStratRaw) {
  const q = (qStratRaw || "").toLowerCase().trim();
  return STRATEGIES.some((s) => s.value === q) ? q : null;
}

export default function SignupForm() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const confettiRootRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [tier, setTier] = useState("starter");
  const [strategy, setStrategy] = useState("growth");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [promo, setPromo] = useState(null);

  // Pull tier + strategy from query (Telegram links etc)
  useEffect(() => {
    const qTier = pickTierFromQuery(params.get("tier"));
    if (qTier) setTier(qTier);

    const qStrategy = pickStrategyFromQuery(params.get("strategy"));
    if (qStrategy) setStrategy(qStrategy);
  }, [params]);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);
  const activeTier = TIERS[tier] || TIERS.starter;
  const badgeStyle = `bg-gradient-to-r ${activeTier.color} text-white`;

  // OPTIONAL: promo status
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await axios.get(API.promoStatus, {
          withCredentials: true,
          timeout: 6000,
        });
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
      const cleanEmail = email.trim();

      if (!emailValid) throw new Error("Enter a valid email.");
      if (!password || password.length < 8) throw new Error("Password must be at least 8 characters.");

      // 1) Create account (Python backend: POST /api/signup)
      const signupResponse = await axios.post(
        API.signup,
        { 
          email: cleanEmail, 
          password, 
          tier, 
          strategy,
          execution_mode: tier === "starter" ? "auto" : "manual" // Default to manual for paid tiers
        },
        { withCredentials: true, timeout: 15000 }
      );

      console.log("Signup response:", signupResponse.data);

      localStorage.setItem("IMALI_EMAIL", cleanEmail);

      // 2) Free tier -> go to Activation
      if (tier === "starter") {
        fireConfetti(confettiRootRef.current);
        // Optional: Add a small delay for confetti to show
        setTimeout(() => {
          navigate("/activation", { 
            replace: true,
            state: { email: cleanEmail, tier: "starter" }
          });
        }, 500);
        return;
      }

      // 3) Paid tiers -> Stripe checkout
      const checkoutResponse = await axios.post(
        API.checkout,
        {
          tier,
          email: cleanEmail, // Backend expects email parameter
          // Note: Backend doesn't expect success_path/cancel_path - it uses env vars
          // The backend sets success_url and cancel_url from environment variables
        },
        { withCredentials: true, timeout: 15000 }
      );

      console.log("Checkout response:", checkoutResponse.data);

      if (!checkoutResponse.data.ok) {
        throw new Error(checkoutResponse.data.detail || "Checkout failed");
      }

      // Backend returns checkoutUrl (not checkout_url)
      const checkoutUrl = checkoutResponse.data.checkoutUrl || checkoutResponse.data.checkout_url;
      
      if (!checkoutUrl) {
        throw new Error("No checkout URL returned from server");
      }

      // Redirect to Stripe checkout
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error("Signup error:", error);
      
      let errorMessage = "Signup failed.";
      
      if (error.response) {
        // Axios error with response
        const { data } = error.response;
        errorMessage = data.detail || data.error || data.message || "Server error";
      } else if (error.request) {
        // Network error
        errorMessage = "Network error. Please check your connection.";
      } else {
        // Other error
        errorMessage = error.message || "An error occurred.";
      }
      
      setErr(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={confettiRootRef}
      className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white"
    >
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Create your IMALI account</h1>

          <p className="mt-2 text-gray-300">Pick a plan - Pick a strategy - Activate your account - Cancel anytime</p>

          <div className="mt-3 text-sm text-emerald-200">
            New promo: <b>First 50 users</b> get <b>5% fee over 3%</b> for <b>90 days</b>. Cancel anytime.
          </div>

          {promo?.message ? <div className="mt-2 text-xs text-white/70">{promo.message}</div> : null}

          {/* Helpful debug line (safe to remove later) */}
          <div className="mt-2 text-[11px] text-white/40">
            API: {API_BASE}
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <aside className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${badgeStyle}`}>
                {activeTier.label} Tier
              </div>

              <div className="mt-3 flex items-center gap-3">
                <img
                  src={activeTier.img}
                  alt="Tier"
                  className="w-14 h-14 rounded-lg ring-1 ring-white/10"
                />
                <div>
                  <div className="font-bold">{activeTier.base ? `$${activeTier.base}/mo` : "Free"}</div>
                  <div className="text-xs text-white/70">
                    {tier === "starter" 
                      ? "Activation after signup" 
                      : "Activation after payment"}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-sm text-white/80 space-y-2">
                <div>✅ Auto Trading ONLY</div>
                <div>✅ Cancel any time</div>
                <div className="text-xs text-amber-200/90">Not financial advice. Trading has risk.</div>
              </div>

              <div className="mt-4 text-xs text-white/60">"Stocks and Established Crypto Trades"</div>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <h3 className="font-bold mb-2">What you'll do on Activation</h3>
              <ul className="text-sm text-white/80 space-y-1">
                <li>1. Create or connect your OKX account</li>
                <li>2. Create or connect crypto wallet</li>
                <li>3. Create or connect your Stock broker account</li>
                <li>4. Start Auto trading</li>
              </ul>
            </div>
          </aside>

          <section className="lg:col-span-3">
            <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              <div className={`h-1 w-full bg-gradient-to-r ${activeTier.color}`} />

              <div className="p-5 border-b border-white/10">
                <h2 className="text-xl font-bold">Account Details</h2>
                <div className="text-sm text-white/70 mt-1">Create your account to get started with IMALI.</div>
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

                <div className="text-xs text-white/60 mb-2">
                  By creating an account, you agree to our Terms of Service and Privacy Policy.
                  {tier === "starter" && (
                    <div className="mt-1 text-emerald-300">
                      ✓ Starter tier is free with auto-trading only
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!emailValid || loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 disabled:opacity-60 disabled:cursor-not-allowed py-3 font-bold transition-all duration-200"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing…
                    </span>
                  ) : tier === "starter" ? (
                    "Create Free Account"
                  ) : (
                    "Continue to Secure Checkout"
                  )}
                </button>

                <div className="text-xs text-white/60 text-center">
                  Already have an account?{" "}
                  <Link className="underline text-emerald-300 hover:text-emerald-200" to="/login">
                    Log in
                  </Link>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
