// src/pages/SignupForm.jsx (Updated section)
// ... keep imports and initial setup ...

// Update STRATEGIES to match TradeDemo terminology
const STRATEGIES = [
  { value: "momentum", label: "Growth" },
  { value: "mean_reversion", label: "Conservative" },
  { value: "ai_weighted", label: "Balanced" },
  { value: "volume_spike", label: "Aggressive" },
];

// Update TIERS with fee information
const TIERS = {
  starter: {
    img: StarterNFT,
    label: "Starter",
    base: 0,
    color: "from-sky-500 to-sky-700",
    fee: "30% on profits over 3%",
    monthly: "No monthly fee",
    description: "Auto-trading only with performance fee",
  },
  pro: {
    img: ProNFT,
    label: "Pro",
    base: 19,
    color: "from-fuchsia-500 to-fuchsia-700",
    fee: "5% on profits over 3%",
    monthly: "$19/month",
    description: "Manual + Auto trading with lower fees",
  },
  elite: {
    img: EliteNFT,
    label: "Elite",
    base: 49,
    color: "from-amber-500 to-amber-700",
    fee: "5% on profits over 3%",
    monthly: "$49/month",
    description: "All features including DEX trading",
  },
  stock: {
    img: StockNFT,
    label: "Stocks",
    base: 99,
    color: "from-yellow-500 to-yellow-700",
    fee: "5% on profits over 3%",
    monthly: "$99/month",
    description: "Stock trading focused",
  },
  bundle: {
    img: BundleNFT,
    label: "Bundle",
    base: 199,
    color: "from-zinc-500 to-zinc-700",
    fee: "5% on profits over 3%",
    monthly: "$199/month",
    description: "Complete trading package",
  },
};

// In the submit function, update execution_mode logic
const submit = async (e) => {
  e.preventDefault();
  if (loading) return;

  setLoading(true);
  setErr("");

  try {
    const cleanEmail = email.trim();

    if (!emailValid) throw new Error("Enter a valid email.");
    if (!password || password.length < 8) throw new Error("Password must be at least 8 characters.");

    // IMPORTANT: All tiers require billing setup
    const executionMode = tier === "starter" ? "auto" : "manual";
    
    // 1) Create account (Python backend: POST /api/signup)
    const signupResponse = await axios.post(
      API.signup,
      { 
        email: cleanEmail, 
        password, 
        tier, 
        strategy: STRATEGIES.find(s => s.label === strategy)?.value || "ai_weighted",
        execution_mode: executionMode
      },
      { withCredentials: true, timeout: 15000 }
    );

    console.log("Signup response:", signupResponse.data);

    localStorage.setItem("IMALI_EMAIL", cleanEmail);
    localStorage.setItem("IMALI_TIER", tier);
    localStorage.setItem("IMALI_STRATEGY", strategy);

    // 2) ALL tiers go to Activation (even Starter needs billing setup)
    fireConfetti(confettiRootRef.current);
    
    setTimeout(() => {
      navigate("/activation", { 
        replace: true,
        state: { 
          email: cleanEmail, 
          tier: tier,
          strategy: strategy,
          requiresBilling: true // All tiers require billing
        }
      });
    }, 500);
    
  } catch (error) {
    console.error("Signup error:", error);
    
    let errorMessage = "Signup failed.";
    
    if (error.response) {
      const { data } = error.response;
      errorMessage = data.detail || data.error || data.message || "Server error";
    } else if (error.request) {
      errorMessage = "Network error. Please check your connection.";
    } else {
      errorMessage = error.message || "An error occurred.";
    }
    
    setErr(errorMessage);
  } finally {
    setLoading(false);
  }
};

// Update the tier info display in the aside section
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
      <div className="font-bold">{activeTier.base ? `${activeTier.monthly}` : "Free"}</div>
      <div className="text-xs text-white/70">
        {activeTier.fee} performance fee
      </div>
      <div className="text-xs text-emerald-300 mt-1">
        ⚡ {activeTier.description}
      </div>
    </div>
  </div>

  <div className="mt-4 text-sm text-white/80 space-y-2">
    <div>✅ {tier === "starter" ? "Auto Trading ONLY" : "Manual + Auto Trading"}</div>
    <div>✅ Cancel any time</div>
    <div className="text-xs text-amber-200/90">All tiers require billing setup for fee collection</div>
  </div>

  <div className="mt-4 text-xs text-white/60">
    "Stocks and Established Crypto Trades" {tier === "elite" && "+ DEX Trading"}
  </div>
</div>
