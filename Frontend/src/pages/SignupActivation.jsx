import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BotAPI from "../utils/BotAPI";

export default function SignupActivation() {
  const nav = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Get tier from URL or state
  const params = new URLSearchParams(location.search);
  const urlTier = params.get("tier") || params.get("plan");
  const stateTier = location.state?.tier;
  const selectedTier = urlTier || stateTier || "starter";

  // ✅ Get billing context from state
  const billingModel = location.state?.billingModel || "fixed";
  const profitSharePct = location.state?.profitSharePct || null;
  const tokenTier = location.state?.tokenTier || "none";

  // ✅ Save tier to localStorage when component mounts
  useEffect(() => {
    if (selectedTier) {
      localStorage.setItem("IMALI_SELECTED_TIER", selectedTier);
    }
    if (billingModel) {
      localStorage.setItem("IMALI_BILLING_MODEL", billingModel);
    }
    if (profitSharePct) {
      localStorage.setItem("IMALI_PROFIT_SHARE_PCT", String(profitSharePct));
    }
    if (tokenTier) {
      localStorage.setItem("IMALI_TOKEN_TIER", tokenTier);
    }
  }, [selectedTier, billingModel, profitSharePct, tokenTier]);

  const signup = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMsg("Creating your account...");

    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1️⃣ Create account with tier context
      await BotAPI.signup({
        email: cleanEmail,
        password,
        tier: selectedTier,
        billingModel: billingModel,
        profitSharePct: profitSharePct,
        tokenTier: tokenTier,
      });

      setMsg("Account created. Signing in...");

      // 2️⃣ Delay to avoid 429 rate limit
      await new Promise((r) => setTimeout(r, 1000));

      // 3️⃣ Auto-login (this sets token internally)
      await BotAPI.login({
        email: cleanEmail,
        password,
      });

      // 4️⃣ Store email and tier for persistence
      localStorage.setItem("IMALI_EMAIL", cleanEmail);
      localStorage.setItem("IMALI_SELECTED_TIER", selectedTier);

      setMsg("Signed in. Redirecting...");

      // 5️⃣ Determine redirect path based on tier
      let redirectPath;
      const state = {
        email: cleanEmail,
        fromSignup: true,
        tier: selectedTier,
        billingModel: billingModel,
        profitSharePct: profitSharePct,
        tokenTier: tokenTier,
      };

      if (selectedTier === "starter") {
        // ✅ Starter goes directly to dashboard
        redirectPath = "/dashboard";
      } else if (selectedTier === "enterprise") {
        // ✅ Enterprise goes to pending page
        redirectPath = "/enterprise-pending";
      } else {
        // ✅ Pro/Elite goes to billing
        redirectPath = `/billing?tier=${selectedTier}&email=${encodeURIComponent(cleanEmail)}`;
        state.updateCard = true;
      }

      // ✅ Navigate to the correct destination
      nav(redirectPath, {
        replace: true,
        state: state,
      });

    } catch (err) {
      const status = err?.response?.status;
      const errorMsg = err?.response?.data?.message || err?.message;

      if (status === 409) {
        setMsg("An account with this email already exists. Try logging in.");
      } else if (status === 429) {
        setMsg("Too many attempts. Please wait a moment and try again.");
      } else if (status === 401) {
        // Account created but auto-login failed
        setMsg("Account created! Please log in manually.");
        setTimeout(() => {
          nav("/login", {
            replace: true,
            state: {
              message: "Account created! Please log in to continue.",
              email: email.trim().toLowerCase(),
              tier: selectedTier,
            },
          });
        }, 1500);
        return;
      } else {
        setMsg(
          errorMsg || "Signup failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Helper to get tier display name
  const getTierDisplayName = (tier) => {
    const names = {
      starter: "Starter",
      pro: "Pro",
      elite: "Elite",
      enterprise: "Enterprise",
    };
    return names[tier] || tier;
  };

  // ✅ Helper to check if tier requires payment
  const requiresPayment = (tier) => {
    return tier === "pro" || tier === "elite";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Create Your Account</h1>
          <p className="text-gray-400 mt-2">
            {getTierDisplayName(selectedTier)} Plan
            {selectedTier !== "starter" && selectedTier !== "enterprise" && (
              <span className="ml-2 text-emerald-400">
                {billingModel === "profit_share" 
                  ? `· ${profitSharePct}% profit share` 
                  : `· Requires payment setup`}
              </span>
            )}
          </p>
          {selectedTier === "starter" && (
            <p className="text-sm text-emerald-400 mt-1">✅ No payment required • Paper trading included</p>
          )}
          {tokenTier !== "none" && selectedTier !== "starter" && (
            <p className="text-sm text-amber-400 mt-1">
              🎉 IMALI token discount applied
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Signup Form */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <form onSubmit={signup} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={loading}
                />
              </div>

              {msg && (
                <div className={`rounded-xl border p-3 text-sm ${
                  msg.includes("error") || msg.includes("failed") || msg.includes("already exists")
                    ? "border-red-500/30 bg-red-500/10 text-red-400"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                }`}>
                  {msg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 py-3 font-bold text-white transition hover:from-emerald-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  `Create ${getTierDisplayName(selectedTier)} Account →`
                )}
              </button>
            </form>

            <div className="mt-4 text-center text-sm text-gray-400">
              Already have an account?{" "}
              <button
                onClick={() => nav("/login", { 
                  state: { 
                    tier: selectedTier,
                    email: email,
                  } 
                })}
                className="text-emerald-400 hover:text-emerald-300 underline"
              >
                Log in
              </button>
            </div>
          </div>

          {/* Activation Info */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-xl font-bold mb-4">How Activation Works</h2>

            <div className="space-y-4">
              {selectedTier === "starter" ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold mt-0.5">1</div>
                    <div>
                      <p className="font-medium">Create Account</p>
                      <p className="text-sm text-gray-400">Sign up with your email and password</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold mt-0.5">2</div>
                    <div>
                      <p className="font-medium">Start Paper Trading</p>
                      <p className="text-sm text-gray-400">No payment required • $1,000 demo funds</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold mt-0.5">3</div>
                    <div>
                      <p className="font-medium">Practice & Learn</p>
                      <p className="text-sm text-gray-400">Test strategies risk-free before going live</p>
                    </div>
                  </div>
                </>
              ) : selectedTier === "enterprise" ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-bold mt-0.5">1</div>
                    <div>
                      <p className="font-medium">Create Account</p>
                      <p className="text-sm text-gray-400">Sign up with your email and password</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-bold mt-0.5">2</div>
                    <div>
                      <p className="font-medium">Enterprise Approval</p>
                      <p className="text-sm text-gray-400">Our team will review and approve your account</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-bold mt-0.5">3</div>
                    <div>
                      <p className="font-medium">Custom Setup</p>
                      <p className="text-sm text-gray-400">Team management, custom branding, dedicated support</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-bold mt-0.5">1</div>
                    <div>
                      <p className="font-medium">Create Account</p>
                      <p className="text-sm text-gray-400">Sign up with your email and password</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-bold mt-0.5">2</div>
                    <div>
                      <p className="font-medium">Add Payment Method</p>
                      <p className="text-sm text-gray-400">Secure card setup to activate your {getTierDisplayName(selectedTier)} plan</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-bold mt-0.5">3</div>
                    <div>
                      <p className="font-medium">Connect & Trade</p>
                      <p className="text-sm text-gray-400">Link OKX, Alpaca, or wallet and start live trading</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 p-4 rounded-xl border border-white/10 bg-black/30">
              <p className="text-sm text-gray-400">
                {selectedTier === "starter" ? (
                  <>
                    <span className="text-emerald-400">✅ No credit card required</span>
                    <span className="mx-2">•</span>
                    <span>Start paper trading immediately</span>
                  </>
                ) : selectedTier === "enterprise" ? (
                  <>
                    <span className="text-purple-400">🏢 Custom pricing</span>
                    <span className="mx-2">•</span>
                    <span>Team management & dedicated support</span>
                  </>
                ) : (
                  <>
                    <span className="text-blue-400">💳 Secure payment</span>
                    <span className="mx-2">•</span>
                    <span>{billingModel === "profit_share" ? "Profit share billing" : "Fixed monthly billing"}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Plan selection reminder */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <span className="inline-flex items-center gap-2">
            <span>Selected plan:</span>
            <span className="text-white font-semibold">{getTierDisplayName(selectedTier)}</span>
            <span className="mx-1">•</span>
            <button
              onClick={() => nav("/pricing", { 
                state: { tier: selectedTier } 
              })}
              className="text-emerald-400 hover:text-emerald-300 underline"
            >
              Change plan
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
