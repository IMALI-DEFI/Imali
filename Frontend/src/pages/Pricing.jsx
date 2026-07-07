// src/pages/Pricing.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FaCheck, FaLock, FaRobot, FaChartLine, FaWallet, FaCrown,
  FaRocket, FaCoins, FaQuestionCircle, FaStar, FaBuilding,
  FaUsers, FaShieldAlt, FaGift, FaPercentage, FaArrowRight,
  FaCubes, FaDatabase, FaServer, FaUserCog,
} from "react-icons/fa";

import nftStarter from "../assets/images/nfts/nft-starter.png";
import nftPro from "../assets/images/nfts/nft-pro.png";
import nftElite from "../assets/images/nfts/nft-elite.png";
import nftAdminBot from "../assets/images/nfts/nft-admin-bot.png";

const ENTERPRISE_IMAGE = "/enterprise.PNG";

// ---------- Token discount tiers ----------
const TOKEN_DISCOUNTS = {
  none: { discount: 0, label: "No token" },
  bronze: { discount: 5, label: "100 IMALI" },
  silver: { discount: 10, label: "500 IMALI" },
  gold: { discount: 15, label: "1,000 IMALI" },
  platinum: { discount: 20, label: "5,000 IMALI" },
};

const PROFIT_SHARE_BOOST = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 5,
};

// ---------- Plan definitions ----------
const plans = [
  {
    id: "starter",
    name: "Starter",
    image: nftStarter,
    alt: "Starter NFT Artwork",
    price: 0,
    profitShare: null,
    subtitle: "Paper trade first. No risk. No credit card.",
    cta: "Start Free",
    ctaLoggedIn: "Current Plan",
    color: "from-emerald-500/20 to-teal-500/10",
    buttonColor: "from-emerald-600 to-teal-600",
    category: "trading",
    features: [
      "$1,000 paper trading demo",
      "Test all bots risk‑free",
      "Stock & crypto preview",
      "No credit card required",
      "Instant access",
    ],
    locked: ["Live trading", "DEX sniper", "Staking / Lending"],
  },
  {
    id: "pro",
    name: "Pro",
    image: nftPro,
    alt: "Pro NFT Artwork",
    price: 19,
    profitShare: 10,
    subtitle: "Live trading + advanced signals.",
    cta: "Start Pro",
    ctaLoggedIn: "Upgrade to Pro",
    color: "from-blue-600/20 to-indigo-500/10",
    buttonColor: "from-blue-600 to-indigo-600",
    popular: true,
    category: "trading",
    features: [
      "Live stock trading (Alpaca)",
      "Live crypto spot (OKX)",
      "AI‑assisted strategies",
      "Take‑profit / stop‑loss",
      "Performance dashboard",
      "Trade history",
      "Priority support",
    ],
    locked: ["DEX sniper", "Futures", "Staking / Lending", "NFT membership"],
  },
  {
    id: "elite",
    name: "Elite",
    image: nftElite,
    alt: "Elite NFT Artwork",
    price: 49,
    profitShare: 8,
    subtitle: "Full access + DeFi & advanced tools.",
    cta: "Start Elite",
    ctaLoggedIn: "Upgrade to Elite",
    color: "from-purple-600/20 to-pink-500/10",
    buttonColor: "from-purple-600 to-pink-600",
    category: "trading",
    features: [
      "Everything in Pro",
      "DEX sniper (Uniswap, QuickSwap)",
      "Futures trading",
      "Staking & Lending",
      "NFT membership benefits",
      "IMALI token discounts",
      "Referral rewards",
      "Advanced risk tools",
    ],
    locked: ["DAO governance", "Treasury tools", "White‑label"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    image: ENTERPRISE_IMAGE,
    alt: "Enterprise Plan",
    price: "Custom",
    profitShare: "Custom",
    subtitle: "For teams, funds, and institutions.",
    cta: "Contact Sales",
    ctaLoggedIn: "Contact Sales",
    color: "from-indigo-600/20 to-purple-500/10",
    buttonColor: "from-indigo-600 to-purple-600",
    isEnterprise: true,
    category: "trading",
    features: [
      "Everything in Elite",
      "Custom branded dashboard",
      "Dedicated account manager",
      "Team roles & permissions",
      "Custom bot development",
      "White‑label options",
      "SLAs & priority support",
    ],
    locked: [],
  },
];

// ---------- NEW: Admin Platform Plans ----------
const adminPlans = [
  {
    id: "admin_professional",
    name: "Professional",
    image: nftAdminBot,
    alt: "Admin Platform Professional",
    price: 49,
    profitShare: null,
    subtitle: "Everything you need in an admin panel. Already built.",
    cta: "Start Free Trial",
    ctaLoggedIn: "Current Plan",
    color: "from-purple-600/20 to-blue-500/10",
    buttonColor: "from-purple-600 to-blue-600",
    category: "admin",
    stripePriceId: "price_admin_professional",
    features: [
      "Up to 10 users",
      "5 organizations",
      "Basic analytics",
      "User management",
      "Role-based permissions",
      "Email support",
      "API access",
      "Billing management",
    ],
    locked: ["Advanced analytics", "Audit logs", "Priority support", "Webhooks"],
  },
  {
    id: "admin_business",
    name: "Business",
    image: nftAdminBot,
    alt: "Admin Platform Business",
    price: 99,
    profitShare: null,
    subtitle: "Full admin platform for growing teams.",
    cta: "Start Free Trial",
    ctaLoggedIn: "Upgrade to Business",
    color: "from-indigo-600/20 to-purple-500/10",
    buttonColor: "from-indigo-600 to-purple-600",
    popular: true,
    category: "admin",
    stripePriceId: "price_admin_business",
    features: [
      "Up to 50 users",
      "25 organizations",
      "Advanced analytics",
      "Priority support",
      "API + webhooks",
      "Audit logs",
      "Marketing tools",
      "Newsletter management",
      "Social media manager",
      "Promo codes",
    ],
    locked: ["Unlimited users", "Custom branding", "SSO/SAML", "Dedicated support"],
  },
  {
    id: "admin_enterprise",
    name: "Enterprise",
    image: nftAdminBot,
    alt: "Admin Platform Enterprise",
    price: "Custom",
    profitShare: null,
    subtitle: "Enterprise-grade admin platform.",
    cta: "Contact Sales",
    ctaLoggedIn: "Contact Sales",
    color: "from-amber-600/20 to-orange-500/10",
    buttonColor: "from-amber-600 to-orange-600",
    isEnterprise: true,
    category: "admin",
    stripePriceId: null,
    features: [
      "Unlimited users",
      "Unlimited organizations",
      "Custom analytics",
      "24/7 dedicated support",
      "SSO & SAML",
      "On-premise option",
      "Custom branding",
      "White-label",
      "Dedicated account manager",
      "SLA guarantees",
    ],
    locked: [],
  },
];

const faqs = [
  {
    q: "Can I switch plans later?",
    a: "Yes, you can upgrade or downgrade anytime. Changes take effect immediately.",
  },
  {
    q: "Is there a free trial?",
    a: "Starter includes a 7‑day free trial. Paid plans require billing setup before live trading.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Credit card, PayPal, and crypto (USDC, USDT, IMALI with 10% discount).",
  },
  {
    q: "How does profit sharing work?",
    a: "You keep 100% of your first 3% monthly return. We only take a share of profits above that threshold. $0 when you don't profit.",
  },
  {
    q: "Is my API key safe?",
    a: "Keys are AES‑256 encrypted and stored with trade‑only permissions (no withdrawals).",
  },
  {
    q: "What's the IMALI token utility?",
    a: "IMALI tokens unlock fee discounts (up to 20%), staking rewards, governance voting, and exclusive NFT benefits.",
  },
  {
    q: "What is the Admin Platform?",
    a: "A complete admin panel solution with user management, organizations, billing, analytics, permissions, and more. Ready to use out of the box.",
  },
  {
    q: "Can I use both Trading and Admin Platform?",
    a: "Yes! You can have separate subscriptions for trading and admin platform, or use them together in one organization.",
  },
];

// ==================== PLAN CARD ====================
function PlanCard({ plan, billingModel, tokenTier, userTier, onSelectPlan, isAdmin }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = !!user;

  // ✅ FIX: Only use actual user tier from backend, not localStorage
  const actualUserTier = userTier || user?.tier || "starter";
  const isCurrentPlan = actualUserTier === plan.id;

  const tokenDiscount = TOKEN_DISCOUNTS[tokenTier]?.discount || 0;
  const profitBoost = PROFIT_SHARE_BOOST[tokenTier] || 0;

  const fixedPrice =
    typeof plan.price === "number"
      ? Math.round(plan.price * (1 - tokenDiscount / 100))
      : plan.price;

  const profitSharePct =
    typeof plan.profitShare === "number"
      ? Math.max(5, plan.profitShare - profitBoost)
      : plan.profitShare;

  const handleClick = (e) => {
    e.preventDefault();
    
    // ✅ Pass the selected plan to parent for handling
    if (onSelectPlan) {
      onSelectPlan(plan.id);
    }

    if (plan.isEnterprise) {
      window.location.href = "mailto:imalidefi@gmail.com";
      return;
    }

    const navState = {
      tier: plan.id,
      billingModel,
      profitSharePct: billingModel === "profit_share" ? profitSharePct : null,
      tokenTier,
      product_type: isAdmin ? "admin" : "trading",
    };

    // ✅ If it's the current plan, just go to dashboard
    if (isCurrentPlan) {
      navigate("/dashboard");
      return;
    }

    if (!isLoggedIn) {
      const signupPath = isAdmin ? "/admin-platform/signup" : "/signup";
      navigate(`${signupPath}?plan=${plan.id}&tier=${plan.id}&product_type=${isAdmin ? "admin" : "trading"}`, { 
        state: { ...navState, from: "pricing" }
      });
    } else {
      // ✅ Navigate to billing with the tier they want
      const billingPath = isAdmin ? `/billing?tier=${plan.id}&product_type=admin` : `/billing?tier=${plan.id}`;
      navigate(billingPath, { 
        state: { ...navState, from: "pricing", updateCard: true }
      });
    }
  };

  // ✅ Determine button text based on actual plan status
  const getButtonText = () => {
    if (isCurrentPlan) return "✅ Current Plan";
    if (isLoggedIn) return plan.ctaLoggedIn || plan.cta;
    return plan.cta;
  };

  return (
    <div className={`relative rounded-3xl border border-white/10 bg-gradient-to-br ${plan.color} p-6 backdrop-blur transition-all hover:scale-[1.02] hover:border-white/20`}>
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1 text-xs font-extrabold text-black shadow-lg">
          🔥 Most Popular
        </div>
      )}
      {isCurrentPlan && (
        <div className="absolute -top-3 right-4 rounded-full bg-emerald-500 px-4 py-1 text-xs font-extrabold text-white shadow-lg animate-pulse">
          ✓ Current Plan
        </div>
      )}
      {isAdmin && (
        <div className="absolute -top-3 left-4 rounded-full bg-purple-500 px-3 py-1 text-xs font-extrabold text-white shadow-lg">
          <FaCubes className="inline mr-1" /> Admin
        </div>
      )}

      <div className="flex justify-center">
        <img src={plan.image} alt={plan.alt} className="h-32 w-32 rounded-2xl object-cover shadow-lg ring-2 ring-white/20" loading="lazy" />
      </div>

      <h3 className="mt-4 text-center text-2xl font-extrabold text-white">{plan.name}</h3>

      <div className="mt-2 text-center">
        {billingModel === "profit_share" && plan.id !== "starter" && plan.id !== "enterprise" && !isAdmin ? (
          <div>
            <span className="text-4xl font-extrabold text-white">{profitSharePct}%</span>
            <p className="text-sm text-white/70">of profits</p>
            <p className="text-xs text-white/50">above 3% monthly return</p>
          </div>
        ) : plan.price === 0 ? (
          <span className="text-4xl font-extrabold text-white">Free</span>
        ) : plan.price === "Custom" ? (
          <span className="text-3xl font-extrabold text-white">Custom</span>
        ) : (
          <>
            {tokenDiscount > 0 && (
              <span className="text-sm text-white/50 line-through">${plan.price}</span>
            )}
            <span className="text-4xl font-extrabold text-white">${fixedPrice}</span>
            <span className="text-sm text-white/50">/mo</span>
          </>
        )}

        {tokenTier !== "none" && plan.id !== "starter" && plan.id !== "enterprise" && !isAdmin && (
          <div className="mt-1 text-xs text-amber-400">
            {billingModel === "profit_share"
              ? `${profitBoost}% reduction with ${TOKEN_DISCOUNTS[tokenTier].label}`
              : `${tokenDiscount}% off with ${TOKEN_DISCOUNTS[tokenTier].label}`}
          </div>
        )}
      </div>

      <p className="mt-3 min-h-[48px] text-center text-sm leading-6 text-slate-300">{plan.subtitle}</p>

      <button 
        onClick={handleClick} 
        disabled={isCurrentPlan}
        className={`mt-6 block w-full rounded-2xl px-5 py-3 text-center font-bold text-white transition ${
          isCurrentPlan 
            ? "bg-emerald-600/50 cursor-default" 
            : `bg-gradient-to-r ${plan.buttonColor} hover:opacity-90`
        }`}
      >
        {getButtonText()} {!isCurrentPlan && <FaArrowRight className="inline ml-2" />}
      </button>

      <div className="mt-6">
        <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/60">Included</h4>
        <ul className="space-y-2">
          {plan.features.slice(0, 6).map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-slate-200">
              <FaCheck className="mt-0.5 shrink-0 text-emerald-400 text-xs" />
              <span>{feature}</span>
            </li>
          ))}
          {plan.features.length > 6 && (
            <li className="text-xs text-white/40 pl-5">+{plan.features.length - 6} more features</li>
          )}
        </ul>
      </div>

      {plan.locked.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/40">Unlock with higher tier</h4>
          <ul className="space-y-2">
            {plan.locked.slice(0, 4).map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-white/40">
                <FaLock className="mt-0.5 shrink-0 text-amber-300/50 text-xs" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ==================== FAQ ITEM ====================
function FAQItem({ question, answer, isOpen, onClick }) {
  return (
    <div className="border-b border-white/10 last:border-0">
      <button onClick={onClick} className="flex w-full items-center justify-between py-5 text-left">
        <span className="text-lg font-semibold text-white">{question}</span>
        <FaQuestionCircle className={`text-cyan-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && <div className="pb-5 text-slate-300 leading-relaxed">{answer}</div>}
    </div>
  );
}

// ==================== MAIN PRICING PAGE ====================
export default function Pricing() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [billingModel, setBillingModel] = useState("fixed");
  const [tokenTier, setTokenTier] = useState("none");
  const [openFaq, setOpenFaq] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [activeTab, setActiveTab] = useState("trading"); // "trading" or "admin"

  // ✅ Get actual user tier from backend (not localStorage)
  const actualUserTier = user?.tier || "starter";

  // ✅ Check for tier in URL params on load
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const selectedTier = params.get("selected") || params.get("tier");
    const productType = params.get("product_type");
    if (selectedTier) {
      setSelectedTier(selectedTier);
    }
    if (productType === "admin") {
      setActiveTab("admin");
    }
  }, [location.search]);

  // ✅ Auto-scroll to plan if tier is in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const highlightTier = params.get("highlight") || params.get("tier");
    if (highlightTier) {
      const element = document.getElementById(`plan-${highlightTier}`);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
      }
    }
  }, [location.search]);

  const handleSelectPlan = (planId) => {
    setSelectedTier(planId);
  };

  const currentPlans = activeTab === "admin" ? adminPlans : plans;
  const isAdminTab = activeTab === "admin";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200">
            <FaRobot /> Simple. Transparent. Start Free.
          </div>

          <h1 className="mt-6 text-4xl font-extrabold leading-tight md:text-6xl">
            Choose Your <span className="text-emerald-400">Platform</span>
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            {activeTab === "trading" 
              ? "Start with paper trading, then go live with OKX, Alpaca, or MetaMask."
              : "Everything you need in an admin panel. Already built. User management, billing, analytics, and more."}
          </p>

          {/* ✅ Show current plan status */}
          {user && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
              <span>Current Plan:</span>
              <span className="font-bold text-white uppercase">{actualUserTier}</span>
            </div>
          )}

          {/* Product Type Tabs */}
          <div className="mt-8 flex justify-center gap-2">
            <button 
              onClick={() => setActiveTab("trading")} 
              className={`px-6 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === "trading" 
                  ? "bg-emerald-600 text-white shadow-lg" 
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              <FaRobot /> Trading Platform
            </button>
            <button 
              onClick={() => setActiveTab("admin")} 
              className={`px-6 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === "admin" 
                  ? "bg-purple-600 text-white shadow-lg" 
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              <FaCubes /> Admin Platform
            </button>
          </div>

          {/* Billing Model Toggle - Only for Trading */}
          {activeTab === "trading" && (
            <div className="mt-4 flex justify-center gap-2">
              <button onClick={() => setBillingModel("fixed")} className={`px-6 py-2 rounded-xl text-sm font-semibold transition ${billingModel === "fixed" ? "bg-emerald-600 text-white shadow-lg" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
                Fixed Monthly
              </button>
              <button onClick={() => setBillingModel("profit_share")} className={`px-6 py-2 rounded-xl text-sm font-semibold transition ${billingModel === "profit_share" ? "bg-emerald-600 text-white shadow-lg" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
                Profit Share
              </button>
            </div>
          )}

          {/* Token Tier Selector - Only for Trading */}
          {activeTab === "trading" && (
            <div className="mt-4 flex justify-center items-center gap-3 text-sm">
              <span className="text-white/50">IMALI Token:</span>
              <select value={tokenTier} onChange={(e) => setTokenTier(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white">
                {Object.entries(TOKEN_DISCOUNTS).map(([key, val]) => (
                  <option key={key} value={key}>{val.label} ({val.discount}% off)</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Plans Grid */}
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {currentPlans.map((plan) => (
            <div key={plan.id} id={`plan-${plan.id}`}>
              <PlanCard 
                plan={plan} 
                billingModel={billingModel} 
                tokenTier={tokenTier} 
                userTier={actualUserTier}
                onSelectPlan={handleSelectPlan}
                isAdmin={isAdminTab}
              />
            </div>
          ))}
        </div>

        {/* Admin Platform Features Section */}
        {activeTab === "admin" && (
          <div className="mt-12 rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-600/10 to-blue-600/10 p-8">
            <div className="flex flex-col items-center text-center">
              <FaCubes className="text-6xl text-purple-400" />
              <h2 className="mt-4 text-3xl font-extrabold">Admin Platform Features</h2>
              <p className="mt-3 max-w-2xl text-slate-300">Everything you need to manage your business in one place.</p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                <FaUsers className="mx-auto text-2xl text-purple-400" />
                <p className="mt-2 text-sm font-semibold">User Management</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                <FaBuilding className="mx-auto text-2xl text-blue-400" />
                <p className="mt-2 text-sm font-semibold">Organizations</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                <FaChartLine className="mx-auto text-2xl text-emerald-400" />
                <p className="mt-2 text-sm font-semibold">Analytics & Reports</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                <FaShieldAlt className="mx-auto text-2xl text-amber-400" />
                <p className="mt-2 text-sm font-semibold">Permissions & Audit</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                <FaWallet className="mx-auto text-2xl text-cyan-400" />
                <p className="mt-2 text-sm font-semibold">Billing Management</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                <FaGift className="mx-auto text-2xl text-pink-400" />
                <p className="mt-2 text-sm font-semibold">Promo Codes</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                <FaUserCog className="mx-auto text-2xl text-indigo-400" />
                <p className="mt-2 text-sm font-semibold">Referral Program</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                <FaServer className="mx-auto text-2xl text-red-400" />
                <p className="mt-2 text-sm font-semibold">System Health</p>
              </div>
            </div>
          </div>
        )}

        {/* IMALI Token Utility - Only for Trading */}
        {activeTab === "trading" && (
          <div className="mt-16 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-600/10 to-teal-600/10 p-8">
            <div className="flex flex-col items-center text-center">
              <FaCoins className="text-6xl text-emerald-400" />
              <h2 className="mt-4 text-3xl font-extrabold">IMALI Token Utility</h2>
              <p className="mt-3 max-w-2xl text-slate-300">Hold IMALI tokens to unlock platform discounts, governance rights, and exclusive benefits.</p>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-center">
                <FaPercentage className="mx-auto text-3xl text-emerald-400" />
                <h3 className="mt-3 text-xl font-bold">Fee Discounts</h3>
                <p className="mt-2 text-sm text-slate-300">Up to 20% discount on trading fees when paying with IMALI tokens.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-center">
                <FaStar className="mx-auto text-3xl text-amber-400" />
                <h3 className="mt-3 text-xl font-bold">Staking Rewards</h3>
                <p className="mt-2 text-sm text-slate-300">Stake IMALI tokens to earn platform revenue share (up to 12% APY).</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-center">
                <FaUsers className="mx-auto text-3xl text-purple-400" />
                <h3 className="mt-3 text-xl font-bold">DAO Governance</h3>
                <p className="mt-2 text-sm text-slate-300">Vote on platform features, fee structures, and treasury allocation.</p>
              </div>
            </div>
            <div className="mt-8 text-center">
              <Link to="/buy-imali" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-700">
                Buy IMALI Tokens <FaArrowRight />
              </Link>
            </div>
          </div>
        )}

        {/* Comparison Table */}
        <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-center text-2xl font-extrabold md:text-3xl">
            {activeTab === "admin" ? "Compare Admin Plans" : "Compare Trading Plans"}
          </h2>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-4 text-sm font-semibold text-white/60">Feature</th>
                  {currentPlans.map((plan) => (
                    <th key={plan.id} className="pb-4 text-center text-sm font-semibold text-white/60">{plan.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeTab === "admin" ? (
                  // Admin platform comparison
                  [
                    ["User Management", true, true, true],
                    ["Organizations", true, true, true],
                    ["Billing Management", true, true, true],
                    ["Basic Analytics", true, true, true],
                    ["Advanced Analytics", false, true, true],
                    ["Audit Logs", false, true, true],
                    ["API Access", true, true, true],
                    ["Webhooks", false, true, true],
                    ["Marketing Tools", false, true, true],
                    ["Newsletter", false, true, true],
                    ["Social Media Manager", false, true, true],
                    ["Promo Codes", false, true, true],
                    ["Referral Program", false, true, true],
                    ["Custom Branding", false, false, true],
                    ["SSO/SAML", false, false, true],
                    ["Dedicated Support", false, false, true],
                    ["White-label", false, false, true],
                  ].map(([feature, ...checks]) => (
                    <tr key={feature}>
                      <td className="py-3 text-sm">{feature}</td>
                      {checks.map((check, i) => (
                        <td key={i} className={`py-3 text-center ${check ? "text-emerald-400" : "text-white/30"}`}>
                          {check ? "✓" : "✗"}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  // Trading platform comparison
                  [
                    ["Paper Trading", true, true, true, true],
                    ["Live Crypto (OKX)", false, true, true, true],
                    ["Live Stocks (Alpaca)", false, true, true, true],
                    ["DEX Sniper / DeFi", false, false, true, true],
                    ["Futures Trading", false, false, true, true],
                    ["Staking / Lending", false, false, true, true],
                    ["Token Discounts", false, false, true, true],
                    ["NFT Membership", false, false, true, true],
                    ["Team Management", false, false, false, true],
                    ["Custom Branding", false, false, false, true],
                  ].map(([feature, ...checks]) => (
                    <tr key={feature}>
                      <td className="py-3 text-sm">{feature}</td>
                      {checks.map((check, i) => (
                        <td key={i} className={`py-3 text-center ${check ? "text-emerald-400" : "text-white/30"}`}>
                          {check ? "✓" : "✗"}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
                <tr className="border-t border-white/10">
                  <td className="py-4 text-sm font-bold">Price</td>
                  {currentPlans.map((plan) => (
                    <td key={plan.id} className="py-4 text-center font-bold">
                      {plan.price === 0 ? "Free" : plan.price === "Custom" ? "Custom" : `$${plan.price}/mo`}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-center text-3xl font-extrabold">Frequently Asked Questions</h2>
          <div className="mt-8 mx-auto max-w-3xl">
            {faqs.map((faq, index) => (
              <FAQItem key={index} question={faq.q} answer={faq.a} isOpen={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? null : index)} />
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-12 rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-600/10 to-cyan-600/10 p-8 text-center">
          <FaCrown className="mx-auto text-5xl text-amber-300" />
          <h2 className="mt-5 text-3xl font-extrabold">
            {activeTab === "admin" ? "Ready to launch your admin platform?" : "Ready to start your trading journey?"}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl leading-8 text-slate-300">
            {activeTab === "admin" 
              ? "Get a complete admin panel with user management, billing, analytics, and more. Already built for you."
              : "Join thousands of traders using IMALI to automate their strategies. Start free, practice first, go live when ready."}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link 
              to={activeTab === "admin" ? "/admin-platform/signup" : "/signup?plan=starter&tier=starter"} 
              className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-4 font-bold text-white transition hover:from-emerald-700 hover:to-teal-700"
            >
              {activeTab === "admin" ? "Start Admin Free Trial →" : "Start Free Trial →"}
            </Link>
            <Link to={activeTab === "admin" ? "/admin-platform/demo" : "/trade-demo"} className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold text-white transition hover:bg-white/10">
              {activeTab === "admin" ? "View Demo →" : "Try Demo First →"}
            </Link>
            <a href="mailto:imalidefi@gmail.com" className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold text-white transition hover:bg-white/10">
              Contact Sales →
            </a>
          </div>
        </div>

        <div className="mt-8 text-center text-xs leading-6 text-white/30">
          {activeTab === "admin" ? (
            <>
              <p>Admin Platform includes everything you need to manage your business. All plans include a free trial.</p>
              <p className="mt-2">No hidden fees. Cancel anytime. Enterprise plans include custom terms and SLAs.</p>
            </>
          ) : (
            <>
              <p>Paper trading uses simulated funds. Live trading requires connected accounts and carries risk. IMALI does not guarantee profits.</p>
              <p className="mt-2">All paid plans require billing setup before live trading. Cancel anytime.</p>
              <p className="mt-2">IMALI tokens are utility tokens. No investment advice. DYOR.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
