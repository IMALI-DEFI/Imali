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

/* =========================
   API BASE RESOLVER (CRA)
========================= */
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8001"
    : "https://api.imali-defi.com");

const TOKEN_KEY = "imali_token";

/* =========================
   TOKEN HELPERS (FIX)
========================= */
function normalizeToken(token) {
  if (!token) return "";
  return token.startsWith("jwt:") ? token.slice(4) : token;
}

function saveToken(token) {
  const raw = normalizeToken(String(token).trim());
  if (!raw) return false;
  localStorage.setItem(TOKEN_KEY, raw);
  return true;
}

/* =========================
   AXIOS INSTANCE (FIX)
========================= */
const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Attach token automatically to ALL requests
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored) {
    config.headers.Authorization = `Bearer ${stored}`;
  }
  return config;
});

/* =========================
   CONSTANTS
========================= */
const STRATEGIES = [
  { value: "momentum", label: "Growth" },
  { value: "mean_reversion", label: "Conservative" },
  { value: "ai_weighted", label: "Balanced" },
  { value: "volume_spike", label: "Aggressive" },
];

const TIERS = {
  starter: {
    img: StarterNFT,
    label: "Starter",
    fee: "30% on profits over 3%",
    monthly: "No monthly fee",
  },
  pro: {
    img: ProNFT,
    label: "Pro",
    fee: "5% on profits over 3%",
    monthly: "$19/month",
  },
  elite: {
    img: EliteNFT,
    label: "Elite",
    fee: "5% on profits over 3%",
    monthly: "$49/month",
  },
  stock: {
    img: StockNFT,
    label: "Stocks",
    fee: "5% on profits over 3%",
    monthly: "$99/month",
  },
  bundle: {
    img: BundleNFT,
    label: "Bundle",
    fee: "5% on profits over 3%",
    monthly: "$199/month",
  },
};

function fireConfetti(container) {
  if (!container) return;
  ["🎉", "✨", "🚀", "💎"].forEach((emoji) => {
    const span = document.createElement("span");
    span.textContent = emoji;
    span.style.position = "fixed";
    span.style.left = Math.random() * 100 + "vw";
    span.style.top = "-5vh";
    span.style.fontSize = "22px";
    span.style.transition = "transform 1s ease, opacity 1s ease";
    container.appendChild(span);

    requestAnimationFrame(() => {
      span.style.transform = "translateY(120vh)";
      span.style.opacity = "0";
    });

    setTimeout(() => span.remove(), 1200);
  });
}

function pickFromQuery(value, allowed) {
  const v = (value || "").toLowerCase();
  return allowed.includes(v) ? v : null;
}

/* =========================
   COMPONENT
========================= */
export default function SignupForm() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const confettiRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tier, setTier] = useState("starter");
  const [strategy, setStrategy] = useState("ai_weighted");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const t = pickFromQuery(params.get("tier"), Object.keys(TIERS));
    const s = pickFromQuery(
      params.get("strategy"),
      STRATEGIES.map((x) => x.value)
    );
    if (t) setTier(t);
    if (s) setStrategy(s);
  }, [params]);

  const emailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    [email]
  );

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setErr("");
    setLoading(true);

    try {
      if (!emailValid) throw new Error("Enter a valid email");
      if (password.length < 8) throw new Error("Password must be at least 8 characters");

      const res = await api.post("/signup", {
        email: email.trim(),
        password,
        tier,
        strategy,
        execution_mode: tier === "starter" ? "auto" : "manual",
      });

      const token =
        res?.data?.token ||
        res?.data?.access_token ||
        res?.data?.jwt ||
        "";

      if (!saveToken(token)) {
        throw new Error("Signup succeeded but token was missing or invalid.");
      }

      fireConfetti(confettiRef.current);

      setTimeout(() => {
        navigate(`/billing?tier=${tier}&strategy=${strategy}`);
      }, 400);
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Signup failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={confettiRef} className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-extrabold text-center mb-2">
          Create your IMALI account
        </h1>

        <p className="text-center text-gray-300 mb-6">
          Signup → Billing → Activation → Trade
        </p>

        {err && (
          <div className="mb-4 rounded bg-red-500/10 border border-red-500/30 p-3 text-red-200">
            {err}
          </div>
        )}

        <form
          onSubmit={submit}
          className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4"
        >
          <input
            className="w-full p-3 rounded-xl bg-black/30 border border-white/10"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            className="w-full p-3 rounded-xl bg-black/30 border border-white/10"
            placeholder="Password (8+ chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            disabled={loading || !emailValid}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-700 font-bold disabled:opacity-60"
          >
            {loading ? "Creating Account…" : "Continue to Billing"}
          </button>

          <div className="text-xs text-center text-white/40">
            Already have an account? <Link to="/login" className="underline">Log in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
