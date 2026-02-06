// src/pages/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

// Background card images
import tradeLoss from "../assets/images/cards/trade_loss_template2.PNG";
import tradeWin from "../assets/images/cards/trade_win_template2.PNG";

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

/* -------------------------- Helpers -------------------------- */

function useCountUp({ to = 1000, durationMs = 2000, fps = 60 }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let raf;
    const totalFrames = Math.max(1, Math.round((durationMs / 1000) * fps));
    let frame = 0;

    const tick = () => {
      frame += 1;
      const p = Math.min(1, frame / totalFrames);
      const eased = 1 - Math.pow(1 - p, 2); // easeOutQuad
      setVal(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, durationMs, fps]);

  return val;
}

const clampInt = (n, min, max) => Math.max(min, Math.min(max, n));

/* -------------------------- Promo Hook -------------------------- */

function usePromoStatus() {
  const [promoData, setPromoData] = useState({
    limit: 50,
    claimed: 0,
    spotsLeft: 50,
    active: true,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchPromoStatus = async () => {
      try {
        setPromoData(prev => ({ ...prev, loading: true, error: null }));
        
        const response = await axios.get(`${API_BASE_URL}/api/promo/status`, {
          timeout: 5000,
        });
        
        if (response.data.success) {
          const data = response.data;
          const claimed = data.claimed || 0;
          const limit = data.limit || 50;
          const spotsLeft = data.spots_left || Math.max(0, limit - claimed);
          const active = data.active !== false;
          
          setPromoData({
            limit,
            claimed,
            spotsLeft,
            active,
            loading: false,
            error: null,
          });
        } else {
          throw new Error(response.data.message || "Failed to fetch promo status");
        }
      } catch (error) {
        console.error("Failed to fetch promo status:", error);
        
        // Fallback to localStorage cache
        try {
          const cached = localStorage.getItem("imali_promo_cache");
          if (cached) {
            const parsed = JSON.parse(cached);
            const isValid = Date.now() - parsed.timestamp < 5 * 60 * 1000; // 5 minute cache
            if (isValid) {
              setPromoData({
                ...parsed.data,
                loading: false,
                error: "Using cached data (offline)",
              });
              return;
            }
          }
        } catch (cacheError) {
          console.error("Cache error:", cacheError);
        }
        
        setPromoData(prev => ({
          ...prev,
          loading: false,
          error: error.message || "Unable to fetch promo status",
        }));
      }
    };

    fetchPromoStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchPromoStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return promoData;
}

/* -------------------------- Claim Promo Hook -------------------------- */

function usePromoClaim() {
  const [claimState, setClaimState] = useState({
    loading: false,
    success: false,
    error: null,
    data: null,
  });

  const claimPromo = async (email, tier = "starter", wallet = null) => {
    if (!email) {
      setClaimState({
        loading: false,
        success: false,
        error: "Email is required",
        data: null,
      });
      return false;
    }

    setClaimState({
      loading: true,
      success: false,
      error: null,
      data: null,
    });

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/promo/claim`,
        { email, tier, wallet },
        { timeout: 10000 }
      );

      if (response.data.success) {
        // Update localStorage cache
        const cached = {
          data: {
            claimed: response.data.spot_number || 0,
            limit: response.data.limit || 50,
            spotsLeft: response.data.spots_left || 0,
            active: (response.data.spots_left || 0) > 0,
          },
          timestamp: Date.now(),
        };
        localStorage.setItem("imali_promo_cache", JSON.stringify(cached));
        
        // Also store that this user claimed
        localStorage.setItem(`imali_promo_claimed_${email}`, "true");
        
        setClaimState({
          loading: false,
          success: true,
          error: null,
          data: response.data,
        });
        
        // Show success message
        window.dispatchEvent(new CustomEvent('promo:claimed', {
          detail: response.data
        }));
        
        return true;
      } else {
        throw new Error(response.data.message || "Claim failed");
      }
    } catch (error) {
      console.error("Promo claim error:", error);
      setClaimState({
        loading: false,
        success: false,
        error: error.response?.data?.message || error.message || "Claim failed",
        data: null,
      });
      return false;
    }
  };

  const resetClaim = () => {
    setClaimState({
      loading: false,
      success: false,
      error: null,
      data: null,
    });
  };

  return { claimState, claimPromo, resetClaim };
}

/* -------------------------- Component -------------------------- */

export default function Home() {
  const navigate = useNavigate();
  
  // Promo hooks
  const promoData = usePromoStatus();
  const { claimState, claimPromo, resetClaim } = usePromoClaim();
  
  // State for email input
  const [email, setEmail] = useState("");
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animated counters (demo numbers)
  const totalProfits = useCountUp({ to: 3281907, durationMs: 2200 });
  const activeTraders = useCountUp({ to: 24189, durationMs: 2200 });

  // Calculate progress
  const progressPct = promoData.limit > 0 
    ? (promoData.claimed / promoData.limit) * 100 
    : 0;

  // Handle promo claim
  const handlePromoClaim = async (e) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    const success = await claimPromo(email.trim());
    setIsSubmitting(false);
    
    if (success) {
      setEmail("");
      setShowClaimForm(false);
    }
  };

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (claimState.success) {
      const timer = setTimeout(() => {
        resetClaim();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [claimState.success, resetClaim]);

  // Success notification component
  const SuccessNotification = () => (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in">
      <div className="rounded-lg bg-emerald-500/90 backdrop-blur-sm p-4 shadow-lg border border-emerald-400/50">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-white">Promo Claimed Successfully!</p>
            <p className="text-sm text-emerald-100 mt-1">
              Spot #{claimState.data?.spot_number} • {claimState.data?.spots_left} spots left
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full overflow-x-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white">
      {/* Success Notification */}
      {claimState.success && <SuccessNotification />}

      {/* ================= HERO ================= */}
      <section className="relative w-full overflow-hidden">
        {/* Background Art */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 opacity-20 md:opacity-25">
            <img
              src={tradeLoss}
              alt=""
              className="absolute left-1/2 top-10 w-[88vw] max-w-[720px] -translate-x-1/2 -rotate-2 object-contain"
              draggable="false"
            />
            <img
              src={tradeWin}
              alt=""
              className="absolute left-1/2 top-[38%] w-[88vw] max-w-[720px] -translate-x-1/2 rotate-2 object-contain"
              draggable="false"
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-b from-gray-950/80 via-gray-950/40 to-indigo-950/80" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-24 text-center md:pt-28">
          <h1 className="mx-auto max-w-5xl font-extrabold tracking-tight leading-[1.05]">
            <span className="block text-indigo-400 text-[clamp(2.1rem,8vw,4.25rem)]">
              AI-POWERED
            </span>
            <span className="block text-white text-[clamp(2.3rem,9vw,4.75rem)]">
              STOCK & CRYPTO
            </span>
            <span className="block text-white text-[clamp(2.3rem,9vw,4.75rem)]">
              PROFITS
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-base sm:text-lg md:text-xl text-white/90">
            <span className="font-bold">IMALI</span> helps beginners trade with
            automated strategies — <span className="font-semibold">no fees</span>{" "}
            unless your account exceeds a{" "}
            <span className="font-semibold">3% net profit</span>. Cancel anytime.
          </p>

          {/* Promo Banner */}
          <div className="mx-auto mt-8 mb-10 max-w-3xl rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-6 py-5 text-left">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-sm font-semibold text-emerald-200">
                  {promoData.loading ? "Loading promo status..." : "Limited promo"}
                </div>
                <div className="mt-1 text-xl font-extrabold">
                  First {promoData.limit} customers: 5% performance fee over 3% for 90 days
                </div>
                <div className="mt-2 text-sm text-white/80">
                  {promoData.active 
                    ? `Only ${promoData.spotsLeft} spots remaining!`
                    : "Promo has ended"}
                </div>
                
                {/* Error message */}
                {promoData.error && (
                  <div className="mt-2 text-xs text-amber-300">
                    ⚠ {promoData.error}
                  </div>
                )}
              </div>

              <div className="shrink-0 text-right">
                <div className="text-xs text-white/70">Spots left</div>
                <div className="text-3xl font-extrabold text-emerald-200">
                  {promoData.loading ? "..." : promoData.spotsLeft}
                </div>
                <div className="text-[11px] text-white/60">
                  out of {promoData.limit}
                </div>
              </div>
            </div>

            <div className="mt-4 h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  promoData.active ? "bg-emerald-400/80" : "bg-gray-500"
                }`}
                style={{ width: `${promoData.loading ? 0 : progressPct}%` }}
              />
            </div>

            {/* Claim Form */}
            {!showClaimForm && promoData.active && !promoData.loading && (
              <button
                onClick={() => setShowClaimForm(true)}
                className="mt-4 w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-3 font-bold transition-colors"
                disabled={claimState.loading}
              >
                {claimState.loading ? "Claiming..." : "Claim Your Spot Now!"}
              </button>
            )}

            {showClaimForm && (
              <form onSubmit={handlePromoClaim} className="mt-4 space-y-3">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-emerald-200 mb-1">
                    Enter your email to claim
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full rounded-lg bg-gray-900 border border-emerald-500/50 px-4 py-3 text-white placeholder-gray-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                
                {claimState.error && (
                  <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                    ⚠ {claimState.error}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !email.trim()}
                    className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-3 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Claiming...
                      </span>
                    ) : "Claim Spot"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowClaimForm(false);
                      resetClaim();
                    }}
                    className="px-4 py-3 text-sm text-gray-300 hover:text-white"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                </div>
                
                <p className="text-xs text-gray-400 text-center">
                  By claiming, you agree to receive updates about your promo status
                </p>
              </form>
            )}
            
            {/* Success message inline */}
            {claimState.success && !showClaimForm && (
              <div className="mt-4 rounded-lg bg-emerald-500/20 border border-emerald-400/30 p-3">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="font-medium text-emerald-200">Promo claimed successfully!</p>
                    <p className="text-xs text-emerald-300/80">
                      Check your email for confirmation. Spot #{claimState.data?.spot_number}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CTAs */}
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/signup"
              className="rounded-full bg-indigo-600 px-8 py-4 text-lg font-bold hover:bg-indigo-700 transition-colors"
            >
              Start (Free Tier)
            </Link>

            <Link
              to="/pricing"
              className="rounded-full border-2 border-indigo-500 px-8 py-4 text-lg font-bold hover:bg-indigo-500/20 transition-colors"
            >
              See Pricing + Rules
            </Link>
          </div>

          {/* Feature Strip */}
          <div className="mx-auto mb-10 grid max-w-3xl grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg bg-white/10 border border-white/10 px-4 py-3">
              ✅ Simple strategies
            </div>
            <div className="rounded-lg bg-white/10 border border-white/10 px-4 py-3">
              🛡️ Built-in risk controls
            </div>
            <div className="rounded-lg bg-white/10 border border-white/10 px-4 py-3">
              ⛔ One-click stop
            </div>
          </div>

          {/* Counters */}
          <div className="mx-auto mb-10 max-w-2xl rounded-xl border border-white/10 bg-gray-900/50 p-6">
            <div className="flex justify-between">
              <div>
                <div className="text-2xl font-mono">
                  ${totalProfits.toLocaleString()}
                </div>
                <div className="text-xs text-white/60">Demo profits</div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-mono">
                  {activeTraders.toLocaleString()}
                </div>
                <div className="text-xs text-white/60">Active traders</div>
              </div>
            </div>
          </div>

          {/* Demo Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white/10 border border-white/10 p-5 text-left">
              <div className="text-sm uppercase text-indigo-300">Crypto Bot</div>
              <h3 className="text-2xl font-bold mt-1">
                New + Established Crypto
              </h3>
              <div className="mt-4 flex gap-3">
                <Link
                  to="/demo"
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-500 transition-colors"
                >
                  Launch Demo
                </Link>
                <button
                  onClick={() => navigate("/how-it-works")}
                  className="text-sm underline text-white/80 hover:text-white transition-colors"
                >
                  How it works
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 border border-white/10 p-5 text-left">
              <div className="text-sm uppercase text-emerald-300">Stock Bot</div>
              <h3 className="text-2xl font-bold mt-1">Stocks (Alpaca)</h3>
              <div className="mt-4 flex gap-3">
                <Link
                  to="/demo?venue=stocks"
                  className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 transition-colors"
                >
                  Launch Demo
                </Link>
                <button
                  onClick={() => navigate("/pricing")}
                  className="text-sm underline text-white/80 hover:text-white transition-colors"
                >
                  Requirements
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="mx-auto max-w-4xl px-4 pb-24 pt-10 text-center">
        <h2 className="mb-6 text-3xl font-bold">Open the Dashboard 🚀</h2>
        <p className="mb-10 text-lg text-white/90">
          Track PnL, alerts, and control everything in one place.
        </p>

        <div className="inline-block rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 p-1">
          <Link
            to="/MemberDashboard"
            className="block rounded-full bg-gray-950 px-12 py-5 text-lg font-bold hover:bg-gray-900 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>

        <p className="mt-6 text-indigo-300">
          Cancel anytime • Start in Demo • Upgrade when ready
        </p>
      </section>
    </div>
  );
}

// Animation styles for notification
const styles = `
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
`;

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
