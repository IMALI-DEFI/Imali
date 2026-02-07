import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BotAPI } from "../utils/BotAPI";

export default function Signup() {
  const nav = useNavigate();
  const [form, setForm] = useState({ 
    email: "", 
    password: "",
    tier: "starter",
    strategy: "ai_weighted"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debug, setDebug] = useState("");

  // Check if already logged in
  useEffect(() => {
    if (BotAPI.isLoggedIn()) {
      console.log("Already logged in, redirecting to dashboard");
      nav("/dashboard", { replace: true });
    }
  }, [nav]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setDebug("");
    
    if (!form.email || !form.password) {
      setError("Email and password are required");
      return;
    }
    
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    
    setLoading(true);
    console.log("Starting signup process...");

    try {
      // Step 1: Test if API is reachable
      setDebug("Testing API connection...");
      try {
        const health = await BotAPI.health();
        console.log("API health check:", health);
        setDebug(prev => prev + " ✓ API Connected\n");
      } catch (healthErr) {
        console.error("API connection failed:", healthErr);
        setError(`Cannot connect to server: ${healthErr.message}`);
        setDebug(prev => prev + ` ✗ API Connection failed: ${healthErr.message}\n`);
        return;
      }

      // Step 2: Attempt signup
      setDebug(prev => prev + "Attempting signup...\n");
      console.log("Signup payload:", { 
        email: form.email, 
        tier: form.tier,
        strategy: form.strategy 
      });
      
      const result = await BotAPI.signup(form);
      console.log("Signup response:", result);
      
      // Step 3: Check if token was received
      const token = BotAPI.getToken();
      console.log("Token after signup:", token ? "YES" : "NO");
      
      if (token) {
        setDebug(prev => prev + "Token received ✓\n");
        
        // Step 4: Verify token works by getting user profile
        setDebug(prev => prev + "Verifying token...\n");
        try {
          const user = await BotAPI.me();
          console.log("User verified:", user);
          setDebug(prev => prev + `User verified: ${user?.user?.email} ✓\n`);
          
          // Step 5: Auto-claim promo (silently)
          try {
            const promoStatus = await BotAPI.promoStatus();
            if (promoStatus.active || promoStatus.available) {
              try {
                await BotAPI.promoClaim({ email: form.email, tier: form.tier });
                console.log("Promo auto-claimed");
                setDebug(prev => prev + "Promo auto-claimed ✓\n");
              } catch (promoErr) {
                console.log("Could not auto-claim promo:", promoErr.message);
              }
            }
          } catch (promoErr) {
            // Ignore promo errors
          }
          
          // Step 6: Redirect to billing
          setDebug(prev => prev + "Redirecting to billing...\n");
          console.log("Signup successful, redirecting to billing");
          
          setTimeout(() => {
            nav("/billing", { 
              replace: true,
              state: { justSignedUp: true }
            });
          }, 500);
          
        } catch (userErr) {
          console.error("Token verification failed:", userErr);
          setDebug(prev => prev + `Token verification failed: ${userErr.message}\n`);
          setError("Account created but login failed. Please try logging in.");
          
          // Clear invalid token
          BotAPI.logout();
          
          setTimeout(() => {
            nav("/login", { 
              state: { 
                email: form.email,
                message: "Account created! Please log in."
              }
            });
          }, 2000);
        }
      } else {
        // No token in response
        console.warn("No token in response");
        setDebug(prev => prev + "No token in response\n");
        
        // Check if account was created anyway
        if (result.success || result.ok) {
          setDebug(prev => prev + "Account created (no token)\n");
          setError("Account created! Redirecting to login...");
          
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
          setDebug(prev => prev + `Response: ${JSON.stringify(result, null, 2)}\n`);
        }
      }
      
    } catch (err) {
      console.error("Signup error details:", err);
      
      let errorMessage = err.message || "Signup failed. Please try again.";
      
      // Handle specific error cases
      if (err.status === 404) {
        errorMessage = `Endpoint not found: ${err.url}. The signup endpoint may be misconfigured.`;
        setDebug(prev => prev + `404 Error: ${err.url}\n`);
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
      setDebug(prev => prev + `Error: ${err.message}\nStatus: ${err.status}\n`);
    } finally {
      setLoading(false);
    }
  };

  // Quick test function for debugging
  const testEndpoint = async () => {
    try {
      console.log("Testing /signup endpoint...");
      const response = await fetch(`${BotAPI.client.defaults.baseURL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({email: 'test@test.com', password: 'test1234', tier: 'starter'})
      });
      console.log("Test response:", response.status, await response.json());
    } catch (err) {
      console.error("Test error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 text-white">
      <form onSubmit={submit} className="w-full max-w-md space-y-6 p-8 bg-gray-900 rounded-2xl shadow-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Create Account</h1>
          <p className="text-gray-400">Start your IMALI trading journey</p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              placeholder="Minimum 8 characters"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              Must be at least 8 characters long
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Trading Tier
            </label>
            <select
              value={form.tier}
              onChange={(e) => setForm({ ...form, tier: e.target.value })}
              className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="starter">Starter (30% fee over 3% threshold)</option>
              <option value="pro">Pro (5% flat fee)</option>
              <option value="elite">Elite (5% flat fee)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl font-semibold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
            "Continue to Billing"
          )}
        </button>

        <p className="text-center text-gray-400 text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 underline">
            Log in
          </Link>
        </p>
        
        <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-800">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </div>

        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === 'development' && debug && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg">
            <details>
              <summary className="cursor-pointer text-sm text-gray-400 mb-2">Debug Info</summary>
              <pre className="text-xs mt-2 text-gray-300 whitespace-pre-wrap overflow-auto max-h-40">
                {debug}
              </pre>
            </details>
            <button 
              type="button"
              onClick={testEndpoint}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300"
            >
              Test Endpoint
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
