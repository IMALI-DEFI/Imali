// src/pages/SignupForm.jsx - MODIFIED (Added product_type and organization fields)
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getGoogleIdToken, signOutGoogle } from "../firebase";

const TIERS = {
  starter: {
    name: "Starter",
    price: "$0",
    period: "7‑day trial",
    icon: "🌱",
    requiresPayment: false,
    redirectTo: "/dashboard",
    profitShare: null,
  },
  pro: {
    name: "Pro",
    price: "$19",
    period: "/month",
    icon: "⭐",
    requiresPayment: true,
    redirectTo: "/billing",
    profitShare: 10,
  },
  elite: {
    name: "Elite",
    price: "$49",
    period: "/month",
    icon: "👑",
    requiresPayment: true,
    redirectTo: "/billing",
    profitShare: 8,
  },
  enterprise: {
    name: "Enterprise",
    price: "Custom",
    period: "",
    icon: "🏢",
    requiresPayment: false,
    redirectTo: "/enterprise-pending",
  },
};

// NEW: Admin platform tiers
const ADMIN_TIERS = {
  professional: {
    name: "Professional",
    price: "$49",
    period: "/month",
    icon: "💼",
    requiresPayment: true,
    redirectTo: "/admin/dashboard",
    stripePriceId: "price_admin_professional",
  },
  business: {
    name: "Business",
    price: "$99",
    period: "/month",
    icon: "🏢",
    requiresPayment: true,
    redirectTo: "/admin/dashboard",
    stripePriceId: "price_admin_business",
  },
  enterprise: {
    name: "Enterprise",
    price: "Custom",
    period: "",
    icon: "🏛️",
    requiresPayment: false,
    redirectTo: "/admin/dashboard",
    stripePriceId: null,
  },
};

export default function SignupForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, googleAuth } = useAuth();

  // Read tier and product_type from URL
  const params = new URLSearchParams(location.search);
  const routeTier = location.pathname.split("/").pop();
  
  // MODIFIED: Check for product_type
  const urlProductType = params.get("product_type") || params.get("product");
  const isAdminSignup = urlProductType === "admin" || location.pathname.includes("/admin-platform/signup");
  
  const selectedTier =
    params.get("tier") ||
    params.get("plan") ||
    (routeTier && routeTier !== "signup" ? routeTier : null) ||
    location.state?.tier ||
    localStorage.getItem("IMALI_SELECTED_TIER") ||
    "starter";

  // Use admin tiers if admin signup
  const availableTiers = isAdminSignup ? ADMIN_TIERS : TIERS;
  const validTiers = Object.keys(availableTiers);
  const initialTier = validTiers.includes(selectedTier) ? selectedTier : (isAdminSignup ? "professional" : "starter");

  // Save tier and product_type to localStorage
  useEffect(() => {
    if (initialTier) {
      localStorage.setItem("IMALI_SELECTED_TIER", initialTier);
    }
    if (isAdminSignup) {
      localStorage.setItem("IMALI_PRODUCT_TYPE", "admin");
    }
  }, [initialTier, isAdminSignup]);

  // Billing model & token tier from pricing page state
  const initialBillingModel = location.state?.billingModel || 
    localStorage.getItem("IMALI_BILLING_MODEL") || "fixed";
  
  const initialProfitSharePct = location.state?.profitSharePct || 
    localStorage.getItem("IMALI_PROFIT_SHARE_PCT") || null;
  
  const initialTokenTier = location.state?.tokenTier || 
    localStorage.getItem("IMALI_TOKEN_TIER") || "none";

  const [form, setForm] = useState({
    // NEW: Admin platform fields
    name: "",
    company: "",
    organizationName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    newsletterSubscribed: true,
    tier: initialTier,
    billingModel: initialBillingModel,
    profitSharePct: initialProfitSharePct,
    tokenTier: initialTokenTier,
    productType: isAdminSignup ? "admin" : "trading",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sync tier from URL changes
  useEffect(() => {
    const newTier = validTiers.includes(selectedTier) ? selectedTier : (isAdminSignup ? "professional" : "starter");
    setForm(f => ({ ...f, tier: newTier }));
    localStorage.setItem("IMALI_SELECTED_TIER", newTier);
  }, [selectedTier, validTiers, isAdminSignup]);

  // Sync billing context from location state
  useEffect(() => {
    const billingModel = location.state?.billingModel || "fixed";
    const profitSharePct = location.state?.profitSharePct || null;
    const tokenTier = location.state?.tokenTier || "none";
    
    setForm(f => ({
      ...f,
      billingModel,
      profitSharePct,
      tokenTier,
    }));
    
    if (billingModel) localStorage.setItem("IMALI_BILLING_MODEL", billingModel);
    if (profitSharePct) localStorage.setItem("IMALI_PROFIT_SHARE_PCT", String(profitSharePct));
    if (tokenTier) localStorage.setItem("IMALI_TOKEN_TIER", tokenTier);
  }, [location.state]);

  const handleTierChange = (tierId) => {
    setForm(f => ({ ...f, tier: tierId }));
    localStorage.setItem("IMALI_SELECTED_TIER", tierId);
    const basePath = isAdminSignup ? "/admin-platform/signup" : "/signup";
    navigate(`${basePath}?tier=${tierId}&product_type=${form.productType}`, { 
      replace: true, 
      state: { 
        ...location.state,
        tier: tierId,
        product_type: form.productType,
      } 
    });
  };

  const validate = () => {
    if (!form.email.trim()) return "Email is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Enter a valid email address";
    if (form.password.length < 8) return "Password must be at least 8 characters";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    if (!form.acceptTerms) return "You must accept the Terms and Privacy Policy";
    
    // NEW: Admin platform validations
    if (isAdminSignup) {
      if (!form.name.trim()) return "Full name is required";
      if (!form.company.trim()) return "Company name is required";
    }
    
    return null;
  };


  const persistSignupContext = () => {
    localStorage.setItem("IMALI_SELECTED_TIER", form.tier);
    localStorage.setItem("IMALI_BILLING_MODEL", form.billingModel);
    localStorage.setItem("IMALI_PRODUCT_TYPE", form.productType);

    if (form.profitSharePct) {
      localStorage.setItem("IMALI_PROFIT_SHARE_PCT", String(form.profitSharePct));
    }

    if (form.tokenTier) {
      localStorage.setItem("IMALI_TOKEN_TIER", form.tokenTier);
    }
  };

  const getSignupRedirect = (result, email = "") => {
    if (result?.requiresApproval || form.tier === "enterprise") {
      return "/enterprise-pending";
    }

    if (isAdminSignup) {
      const tierInfo = ADMIN_TIERS[form.tier];

      if (tierInfo?.requiresPayment) {
        return `/billing?tier=${form.tier}&product_type=admin`;
      }

      return "/admin/dashboard";
    }

    if (form.tier === "starter") {
      return "/dashboard";
    }

    if (TIERS[form.tier]?.requiresPayment) {
      const emailParam = email ? `&email=${encodeURIComponent(email)}` : "";
      return `/billing?tier=${form.tier}${emailParam}`;
    }

    return result?.redirectTo || TIERS[form.tier]?.redirectTo || "/dashboard";
  };

  const handleGoogleSignup = async () => {
    if (loading) return;

    // Google signup is kept off the admin-platform signup path because the
    // backend Google route currently creates standard IMALI accounts.
    if (isAdminSignup) {
      setError("Use the email signup form for Admin Platform accounts.");
      return;
    }

    if (!form.acceptTerms) {
      setError("You must accept the Terms and Privacy Policy before continuing with Google.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      persistSignupContext();

      const { idToken, firebaseUser } = await getGoogleIdToken();

      const result = await googleAuth({
        idToken,
        tier: form.tier,
        strategy: "ai_weighted",
        acceptedTerms: true,
        newsletterSubscribed: form.newsletterSubscribed,
        productType: form.productType,
        billingModel: form.billingModel,
        profitSharePct: form.profitSharePct,
        tokenTier: form.tokenTier,
      });

      if (!result?.success) {
        await signOutGoogle();
        setError(result?.error || "Google signup failed. Please try again.");
        setLoading(false);
        return;
      }

      const googleEmail =
        result?.user?.email ||
        firebaseUser?.email ||
        "";

      const redirectPath = getSignupRedirect(result, googleEmail);

      navigate(redirectPath, {
        replace: true,
        state: {
          tier: form.tier,
          billingModel: form.billingModel,
          profitSharePct: form.profitSharePct,
          tokenTier: form.tokenTier,
          product_type: form.productType,
          from: "google-signup",
        },
      });
    } catch (err) {
      const code = err?.code || "";

      if (code === "auth/popup-closed-by-user") {
        setError("Google sign-up was canceled.");
      } else if (code === "auth/popup-blocked") {
        setError("Your browser blocked the Google sign-in window. Allow pop-ups and try again.");
      } else {
        setError(err?.message || "Google signup failed. Please try again.");
      }

      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Save all context before signup
      persistSignupContext();

      // MODIFIED: Include admin platform fields in signup
      const signupData = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        tier: form.tier,
        accepted_terms: form.acceptTerms,
        billingModel: form.billingModel,
        profitSharePct: form.profitSharePct,
        tokenTier: form.tokenTier,
        product_type: form.productType,
        newsletter_subscribed: form.newsletterSubscribed,
        ...(isAdminSignup && {
          name: form.name.trim(),
          company: form.company.trim(),
          organization_name: form.company.trim(), // Map to organization
        }),
      };

      const result = await signup(signupData);

      if (!result?.success) {
        setError(result?.error || "Signup failed. Please try again.");
        setLoading(false);
        return;
      }

      const redirectPath = getSignupRedirect(
        result,
        form.email.trim().toLowerCase()
      );

      navigate(redirectPath, {
        replace: true,
        state: {
          tier: form.tier,
          billingModel: form.billingModel,
          profitSharePct: form.profitSharePct,
          tokenTier: form.tokenTier,
          product_type: form.productType,
          from: "signup",
        },
      });
    } catch (err) {
      setError(err?.message || "Signup failed. Please try again.");
      setLoading(false);
    }
  };

  const currentTier = availableTiers[form.tier] || availableTiers[Object.keys(availableTiers)[0]];
  
  // Show loading while determining tier
  if (!form.tier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-black">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-black px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{currentTier.icon}</div>
          <h1 className="text-3xl font-bold text-white">
            {isAdminSignup ? "Create your admin account" : "Create your account"}
          </h1>
          <p className="text-gray-400 mt-2">
            {currentTier.name} Plan
            {form.billingModel === "profit_share" && form.profitSharePct
              ? ` · ${form.profitSharePct}% profit share`
              : ` · ${currentTier.price}${currentTier.period}`}
          </p>
          {isAdminSignup && (
            <p className="text-xs text-purple-400 mt-1">
              <i className="fas fa-cubes mr-1"></i> Admin Platform
            </p>
          )}
        </div>

        {/* Tier Selection */}
        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-3">Select your plan:</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(availableTiers).map(([id, tier]) => (
              <button
                key={id}
                type="button"
                onClick={() => handleTierChange(id)}
                className={`px-3 py-2 rounded-xl text-center transition-all ${
                  form.tier === id
                    ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg"
                    : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
                }`}
              >
                <div className="text-xl">{tier.icon}</div>
                <div className="text-xs font-semibold">{tier.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {!isAdminSignup && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={loading}
                className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white px-4 py-3 font-semibold text-gray-900 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                >
                  <path
                    fill="#4285F4"
                    d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.797 2.716v2.258h2.909c1.703-1.568 2.684-3.878 2.684-6.614Z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.963 10.706A5.42 5.42 0 0 1 3.681 9c0-.592.102-1.167.282-1.706V4.962H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.038l3.007-2.332Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.962l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z"
                  />
                </svg>
                {loading ? "Connecting..." : "Continue with Google"}
              </button>

              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs uppercase tracking-wider text-gray-500">
                  or continue with email
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* NEW: Admin platform fields */}
            {isAdminSignup && (
              <>
                <input
                  type="text"
                  required
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={loading}
                />
                <input
                  type="text"
                  required
                  placeholder="Company name"
                  value={form.company}
                  onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={loading}
                />
              </>
            )}
            
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={loading}
            />
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="Password (minimum 8 characters)"
              value={form.password}
              onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={loading}
            />
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="Confirm password"
              value={form.confirmPassword}
              onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={loading}
            />

            <label className="flex items-start gap-3 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={form.acceptTerms}
                onChange={(e) => setForm(f => ({ ...f, acceptTerms: e.target.checked }))}
                className="mt-1"
                disabled={loading}
              />
              <span>
                I agree to the{" "}
                <Link to="/terms" className="text-emerald-400 underline">Terms of Service</Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-emerald-400 underline">Privacy Policy</Link>
              </span>
            </label>

            {!isAdminSignup && (
              <label className="flex items-start gap-3 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={form.newsletterSubscribed}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      newsletterSubscribed: e.target.checked,
                    }))
                  }
                  className="mt-1"
                  disabled={loading}
                />
                <span>
                  Send me IMALI AI Signals summaries, market updates, product
                  news, and educational trading content. I can unsubscribe later.
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold disabled:opacity-50 transition hover:from-emerald-500 hover:to-cyan-500"
            >
              {loading
                ? "Creating account..."
                : isAdminSignup
                ? `Start ${currentTier.name} Plan →`
                : form.tier === "starter"
                ? "Start Free Trial →"
                : form.tier === "enterprise"
                ? "Request Enterprise Access →"
                : `Start ${currentTier.name} (${currentTier.price}/mo) →`}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-gray-400 text-sm">
          Already have an account?{" "}
          <Link to={isAdminSignup ? "/admin-platform/login" : "/login"} className="text-emerald-400 underline">
            Log in
          </Link>
        </p>

        <div className="mt-6 text-center text-xs text-gray-500">
          {isAdminSignup ? (
            <>
              <span>💼 Full admin platform access</span>
              <span className="mx-2">•</span>
              <span>👥 User & organization management</span>
              <span className="mx-2">•</span>
              <span>📊 Analytics & reports</span>
              <span className="mx-2">•</span>
              <span>🔒 Enterprise-grade security</span>
            </>
          ) : (
            <>
              <span>✅ 7‑day free trial</span>
              <span className="mx-2">•</span>
              <span>💰 $1,000 paper trading</span>
              <span className="mx-2">•</span>
              <span>🔒 No credit card required</span>
              <span className="mx-2">•</span>
              <span>🎮 Practice trading immediately</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
