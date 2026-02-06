import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

// Background card images
import tradeLoss from "../assets/images/cards/trade_loss_template2.PNG";
import tradeWin from "../assets/images/cards/trade_win_template2.PNG";

/* ============================================================
   API BASE (PROD SAFE)
============================================================ */
const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  (typeof window !== "undefined" &&
  window.location.hostname === "localhost"
    ? "http://localhost:8080"
    : "https://api.imali-defi.com");

/* ============================================================
   COUNT UP (DEMO METRICS)
============================================================ */
function useCountUp(to, duration = 2000) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let start;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(progress * to));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [to, duration]);

  return val;
}

/* ============================================================
   PROMO STATUS
============================================================ */
function usePromoStatus() {
  const [state, setState] = useState({
    limit: 50,
    claimed: 0,
    spotsLeft: 50,
    active: true,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/promo/status`, {
          timeout: 6000,
        });

        const limit = Number(res.data?.limit ?? 50);
        const claimed = Number(res.data?.claimed ?? 0);

        if (!mounted) return;

        setState({
          limit,
          claimed,
          spotsLeft: Math.max(0, limit - claimed),
          active: claimed < limit,
          loading: false,
          error: null,
        });

        localStorage.setItem(
          "imali_promo_cache",
          JSON.stringify({ limit, claimed, ts: Date.now() })
        );
      } catch {
        const cached = JSON.parse(
          localStorage.getItem("imali_promo_cache") || "{}"
        );

        if (cached.limit != null) {
          setState({
            limit: cached.limit,
            claimed: cached.claimed,
            spotsLeft: Math.max(0, cached.limit - cached.claimed),
            active: cached.claimed < cached.limit,
            loading: false,
            error: "Using cached promo data",
          });
        } else {
          setState(s => ({
            ...s,
            loading: false,
            error: "Promo unavailable",
          }));
        }
      }
    };

    load();
    const i = setInterval(load, 30000);
    return () => {
      mounted = false;
      clearInterval(i);
    };
  }, []);

  return state;
}

/* ============================================================
   PROMO CLAIM
============================================================ */
function usePromoClaim() {
  const [state, setState] = useState({
    loading: false,
    success: false,
    error: null,
    data: null,
  });

  const claim = async (email) => {
    if (!email) return;

    setState({ loading: true, success: false, error: null, data: null });

    try {
      const res = await axios.post(
        `${API_BASE}/api/promo/claim`,
        { email, tier: "starter" },
        { timeout: 8000 }
      );

      setState({
        loading: false,
        success: true,
        error: null,
        data: res.data,
      });

      return true;
    } catch (err) {
      setState({
        loading: false,
        success: false,
        error:
          err?.response?.data?.message ||
          "Promo full or already claimed",
        data: null,
      });
      return false;
    }
  };

  const reset = () =>
    setState({ loading: false, success: false, error: null, data: null });

  return { state, claim, reset };
}

/* ============================================================
   HOME PAGE
============================================================ */
export default function Home() {
  const nav = useNavigate();

  const profits = useCountUp(3281907);
  const traders = useCountUp(24189);

  const promo = usePromoStatus();
  const { state: claimState, claim, reset } = usePromoClaim();

  const [email, setEmail] = useState("");
  const [showForm, setShowForm] = useState(false);

  const progress =
    promo.limit > 0 ? (promo.claimed / promo.limit) * 100 : 0;

  return (
    <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white">

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <img
            src={tradeLoss}
            className="absolute left-1/2 top-16 w-[80vw] max-w-[700px] -translate-x-1/2 -rotate-2"
            alt=""
          />
          <img
            src={tradeWin}
            className="absolute left-1/2 top-[40%] w-[80vw] max-w-[700px] -translate-x-1/2 rotate-2"
            alt=""
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 pt-28 pb-12 text-center">
          <h1 className="font-extrabold leading-tight">
            <span className="block text-indigo-400 text-4xl md:text-6xl">
              AI-POWERED
            </span>
            <span className="block text-white text-5xl md:text-7xl">
              STOCK & CRYPTO
            </span>
            <span className="block text-white text-5xl md:text-7xl">
              PROFITS
            </span>
          </h1>

          <p className="mt-6 max-w-3xl mx-auto text-lg text-white/90">
            Trade with automated strategies. <b>No fees</b> unless you exceed{" "}
            <b>3% net profit</b>. Cancel anytime.
          </p>

          {/* PROMO */}
          <div className="mt-10 max-w-3xl mx-auto bg-emerald-500/10 border border-emerald-400/30 rounded-2xl p-6 text-left">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-semibold text-emerald-300">
                  Limited Promo
                </div>
                <div className="text-xl font-extrabold mt-1">
                  First {promo.limit} users — 5% fee over 3% for 90 days
                </div>
                <div className="text-sm text-white/80 mt-1">
                  {promo.active
                    ? `${promo.spotsLeft} spots remaining`
                    : "Promo filled"}
                </div>
                {promo.error && (
                  <div className="text-xs text-yellow-300 mt-1">
                    ⚠ {promo.error}
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="text-xs text-white/60">Spots Left</div>
                <div className="text-3xl font-extrabold text-emerald-300">
                  {promo.loading ? "…" : promo.spotsLeft}
                </div>
              </div>
            </div>

            <div className="h-2 bg-white/10 rounded-full mt-4 overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            {!showForm && promo.active && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-bold"
              >
                Claim Your Spot
              </button>
            )}

            {showForm && (
              <form
                onSubmit={async e => {
                  e.preventDefault();
                  await claim(email);
                }}
                className="mt-4 space-y-3"
              >
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full rounded-lg bg-gray-900 border border-emerald-500 px-4 py-3"
                  required
                />

                {claimState.error && (
                  <div className="text-sm text-red-400">
                    {claimState.error}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={claimState.loading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-bold"
                  >
                    {claimState.loading ? "Claiming…" : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      reset();
                    }}
                    className="px-4 text-sm text-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {claimState.success && (
              <div className="mt-4 text-emerald-300 font-semibold">
                ✅ Spot claimed! Check your email.
              </div>
            )}
          </div>

          {/* METRICS */}
          <div className="mt-10 max-w-2xl mx-auto bg-gray-900/60 border border-white/10 rounded-xl p-6 flex justify-between">
            <div>
              <div className="text-2xl font-mono">
                ${profits.toLocaleString()}
              </div>
              <div className="text-xs text-white/60">Demo profits</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono">
                {traders.toLocaleString()}
              </div>
              <div className="text-xs text-white/60">Active traders</div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/signup"
              className="bg-indigo-600 hover:bg-indigo-700 px-8 py-4 rounded-full font-bold"
            >
              Start Free
            </Link>
            <Link
              to="/pricing"
              className="border-2 border-indigo-500 px-8 py-4 rounded-full font-bold"
            >
              See Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="text-center py-20">
        <h2 className="text-3xl font-bold mb-4">Open Your Dashboard</h2>
        <p className="text-white/80 mb-8">
          Control trades, alerts, and profits in one place.
        </p>
        <Link
          to="/MemberDashboard"
          className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 px-12 py-5 rounded-full font-bold"
        >
          Go to Dashboard
        </Link>
      </section>
    </div>
  );
}
