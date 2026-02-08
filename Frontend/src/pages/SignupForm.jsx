import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BotAPI } from "../utils/BotAPI";

export default function Signup() {
  const nav = useNavigate();
  const [form, setForm] = useState({ 
    email: "", 
    password: "",
    confirmPassword: "",
    tier: "starter",
    strategy: "ai_weighted",
    acceptTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [debugInfo, setDebugInfo] = useState("");

  // Check if already logged in
  useEffect(() => {
    const token = BotAPI.getToken();
    console.log("Initial token check:", token ? "YES" : "NO");
    
    if (BotAPI.isLoggedIn()) {
      console.log("Already logged in, checking if token is valid...");
      // Test the token first
      testTokenAndRedirect();
    }
  }, [nav]);

  const testTokenAndRedirect = async () => {
    try {
      const user = await BotAPI.me();
      console.log("Token is valid, user:", user?.user?.email);
      nav("/dashboard", { replace: true });
    } catch (err) {
      console.log("Token is invalid, clearing it");
      BotAPI.clearToken();
    }
  };

  const validateForm = () => {
    setError("");
    setDebugInfo("");

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email || !emailRegex.test(form.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    // Password validation
    if (!form.password || form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    // Terms acceptance
    if (!form.acceptTerms) {
      setError("You must accept the Terms of Service and Privacy Policy");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setDebugInfo("Starting signup process...\n");

    try {
      console.log("🔐 Attempting signup with:", { email: form.email, tier: form.tier });
      setDebugInfo(prev => prev + "Sending signup request...\n");
      
      // Step 1: Signup
      const result = await BotAPI.signup({
        email: form.email,
        password: form.password,
        tier: form.tier,
        strategy: form.strategy
      });

      console.log("🔐 Signup response:", result);
      setDebugInfo(prev => prev + `Signup response received\n`);
      
      // Check for token in response
      let token = null;
      
      // Try multiple possible token locations
      if (result.token) {
        token = result.token;
        console.log("🔐 Token found at result.token");
      } else if (result.data?.token) {
        token = result.data.token;
        console.log("🔐 Token found at result.data.token");
      } else if (result.access_token) {
        token = result.access_token;
        console.log("🔐 Token found at result.access_token");
      } else if (result.accessToken) {
        token = result.accessToken;
        console.log("🔐 Token found at result.accessToken");
      }
      
      if (token) {
        console.log("🔐 Token received:", token.substring(0, 30) + "...");
        setDebugInfo(prev => prev + `Token received (${token.length} chars)\n`);
        
        // Manually set the token
        BotAPI.setToken(token);
        console.log("🔐 Token set in storage");
        
        // Verify token was saved
        const savedToken = BotAPI.getToken();
        console.log("🔐 Token verified in storage:", savedToken ? "YES" : "NO");
        
        if (savedToken) {
          setDebugInfo(prev => prev + "Token saved successfully\n");
          
          // Wait a moment for token to be fully processed
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Step 2: Test the token with a simple API call
          try {
            setDebugInfo(prev => prev + "Testing token with /me endpoint...\n");
            
            // Add a custom header or param to avoid caching issues
            const user = await BotAPI.me();
            console.log("✅ Token test successful:", user?.user?.email || user?.email);
            setDebugInfo(prev => prev + `Token test successful! User: ${user?.user?.email || user?.email}\n`);
            
            // Success! Account is created and token is valid
            setSuccess("Account created successfully! Redirecting to billing...");
            
            // Step 3: Try to claim promo (optional)
            try {
              const promoStatus = await BotAPI.promoStatus();
              if (promoStatus.active || promoStatus.available) {
                await BotAPI.promoClaim({ email: form.email, tier: form.tier });
                console.log("Promo auto-claimed");
                setDebugInfo(prev => prev + "Promo auto-claimed\n");
              }
            } catch (promoErr) {
              console.log("Could not auto-claim promo:", promoErr.message);
              // Not critical
            }
            
            // Step 4: Redirect to billing
            setTimeout(() => {
              console.log("Redirecting to billing...");
              nav("/billing", { 
                replace: true,
                state: { 
                  justSignedUp: true,
                  email: form.email 
                }
              });
            }, 1000);
            
          } catch (userErr) {
            console.error("❌ Token test failed:", userErr);
            setDebugInfo(prev => prev + `Token test failed: ${userErr.message}\n`);
            
            // Try one more time with a different approach
            try {
              console.log("🔄 Retrying token test...");
              setDebugInfo(prev => prev + "Retrying token test...\n");
              
              // Force a fresh token check
              const freshToken = localStorage.getItem("imali_token");
              console.log("Fresh token from localStorage:", freshToken?.substring(0, 30) + "...");
              
              if (freshToken) {
                // Try the health endpoint first (doesn't require auth)
                await BotAPI.health();
                console.log("✅ Health check passed");
                
                // Now try me endpoint again
                const retryUser = await BotAPI.me();
                console.log("✅ Retry successful:", retryUser?.user?.email);
                
                setSuccess("Account verified! Redirecting...");
                setTimeout(() => {
                  nav("/billing", { replace: true });
                }, 1000);
              } else {
                throw new Error("Token not found in localStorage");
              }
              
            } catch (retryErr) {
              console.error("❌ Retry also failed:", retryErr);
              setDebugInfo(prev => prev + `Retry failed: ${retryErr.message}\n`);
              
              // Account was created but token isn't working
              setError("Account created but login failed. Please try logging in.");
              
              // Clear any invalid token
              BotAPI.clearToken();
              
              setTimeout(() => {
                nav("/login", { 
                  state: { 
                    email: form.email,
                    message: "Account created! Please log in."
                  }
                });
              }, 2000);
            }
          }
        } else {
          setDebugInfo(prev => prev + "Token not saved properly\n");
          throw new Error("Token not saved");
        }
      } else {
        // No token in response
        console.warn("⚠️ No token in response");
        setDebugInfo(prev => prev + "No token found in response\n");
        
        // Check if account was created anyway
        if (result.success || result.ok || result.user_id) {
          setDebugInfo(prev => prev + "Account created (no token)\n");
          setSuccess("Account created! Redirecting to login...");
          
          setTimeout(() => {
            nav("/login", { 
              state: { 
                email: form.email,
                message: "Account created! Please log in."
              }
            });
          }, 1500);
        } else {
          setError(result.message || "Signup failed - no token received");
          setDebugInfo(prev => prev + `Response: ${JSON.stringify(result, null, 2)}\n`);
        }
      }
      
    } catch (err) {
      console.error("❌ Signup error:", err);
      setDebugInfo(prev => prev + `Error: ${err.message}\n`);
      
      let errorMessage = err.message || "Signup failed. Please try again.";
      
      if (err.status === 404) {
        errorMessage = "Signup service is currently unavailable. Please try again later.";
      } else if (err.status === 409 || err.message.includes("already exists")) {
        errorMessage = "An account with this email already exists. Please log in instead.";
        setTimeout(() => {
          nav("/login", { state: { email: form.email } });
        }, 2000);
      } else if (err.status === 400) {
        if (err.message.includes("email")) {
          errorMessage = "Please enter a valid email address";
        } else if (err.message.includes("password")) {
          errorMessage = "Password must be at least 8 characters";
        }
      } else if (err.status === 500) {
        errorMessage = "Server error. Please try again later.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Debug function
  const checkTokenStatus = () => {
    const token = BotAPI.getToken();
    console.log("=== TOKEN STATUS ===");
    console.log("Token exists:", token ? "YES" : "NO");
    console.log("Token length:", token?.length || 0);
    console.log("Token preview:", token?.substring(0, 30) + "...");
    console.log("localStorage token:", localStorage.getItem("imali_token"));
    
    setDebugInfo(prev => prev + 
      `Token check:\n` +
      `Exists: ${token ? "YES" : "NO"}\n` +
      `Length: ${token?.length || 0}\n` +
      `Preview: ${token?.substring(0, 30) || "N/A"}...\n`
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center gap-12">
        
        {/* Left Side - Information */}
        <div className="w-full lg:w-1/2 space-y-8">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Start Your Trading Journey
            </h1>
            <p className="text-gray-400 mt-4 text-lg">
              Join thousands of traders using AI-powered strategies to maximize their profits.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400">🤖</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">AI-Powered Trading</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Advanced algorithms analyze market data 24/7 to find the best trading opportunities.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-green-400">⚡</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">Automated Execution</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Execute trades instantly based on your strategy. No manual intervention required.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
              <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-400">🔒</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">Secure & Reliable</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Bank-level security with encrypted connections and secure API key management.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-gray-400 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              <span>50,000+ Active Traders</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span>99.9% Uptime</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
              <span>24/7 Support</span>
            </div>
          </div>
        </div>

        {/* Right Side - Signup Form */}
        <div className="w-full lg:w-1/2">
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800 p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white">Create Your Account</h2>
              <p className="text-gray-400 mt-2">Get started in less than 2 minutes</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="text-red-400">⚠️</div>
                  <div>
                    <p className="text-red-400 font-medium">Signup Error</p>
                    <p className="text-red-300 text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="text-emerald-400">✓</div>
                  <div>
                    <p className="text-emerald-400 font-medium">Success!</p>
                    <p className="text-emerald-300 text-sm mt-1">{success}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-2">Minimum 8 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    required
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Your Tier
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { id: "starter", label: "Starter", fee: "30% over 3%", price: "Free" },
                    { id: "pro", label: "Pro", fee: "5% flat", price: "$99/mo" },
                    { id: "elite", label: "Elite", fee: "5% flat", price: "$299/mo" }
                  ].map((tierOption) => (
                    <div
                      key={tierOption.id}
                      onClick={() => !loading && setForm({ ...form, tier: tierOption.id })}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        form.tier === tierOption.id
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-gray-700 bg-gray-800 hover:border-gray-600"
                      } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-white">{tierOption.label}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          form.tier === tierOption.id 
                            ? "bg-blue-500 text-white" 
                            : "bg-gray-700 text-gray-300"
                        }`}>
                          {tierOption.price}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">Fee: {tierOption.fee}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Trading Strategy
                </label>
                <select
                  value={form.strategy}
                  onChange={(e) => setForm({ ...form, strategy: e.target.value })}
                  className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
                  disabled={loading}
                >
                  <option value="ai_weighted">AI Weighted (Recommended)</option>
                  <option value="momentum">Momentum Trading</option>
                  <option value="mean_reversion">Mean Reversion</option>
                  <option value="arbitrage">Arbitrage</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  {form.strategy === "ai_weighted" && "AI analyzes multiple factors for optimal trades"}
                  {form.strategy === "momentum" && "Follows strong price movements in either direction"}
                  {form.strategy === "mean_reversion" && "Trades based on price returning to average"}
                  {form.strategy === "arbitrage" && "Exploits price differences across exchanges"}
                </p>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={form.acceptTerms}
                  onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-blue-500"
                  disabled={loading}
                />
                <label htmlFor="terms" className="text-sm text-gray-400">
                  I agree to the{" "}
                  <Link to="/terms" className="text-blue-400 hover:text-blue-300 underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                    Privacy Policy
                  </Link>
                  . I understand that trading involves risk and past performance does not guarantee future results.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating Account...
                  </span>
                ) : (
                  "Create Account & Continue to Billing"
                )}
              </button>

              <div className="text-center pt-4 border-t border-gray-800">
                <p className="text-gray-400">
                  Already have an account?{" "}
                  <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium underline">
                    Log in here
                  </Link>
                </p>
              </div>
            </form>

            <div className="mt-8 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Limited Time Offer</span>
                <span className="text-emerald-400 font-semibold">First 50 users: 5% fee for 90 days</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-green-500" style={{ width: '65%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">35/50 spots claimed</p>
            </div>
            
            {/* Debug Panel - Remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-4 bg-gray-800/30 rounded-xl border border-gray-700">
                <details>
                  <summary className="cursor-pointer text-sm text-gray-400 mb-2">Debug Info</summary>
                  <div className="space-y-3">
                    <pre className="text-xs mt-2 text-gray-300 whitespace-pre-wrap overflow-auto max-h-40">
                      {debugInfo}
                    </pre>
                    <div className="flex gap-2">
                      <button
                        onClick={checkTokenStatus}
                        className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                      >
                        Check Token
                      </button>
                      <button
                        onClick={() => {
                          BotAPI.clearToken();
                          setDebugInfo(prev => prev + "Token cleared\n");
                        }}
                        className="px-3 py-1 text-xs bg-red-700 hover:bg-red-600 rounded"
                      >
                        Clear Token
                      </button>
                    </div>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add some CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}