import React, { useState } from "react";
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

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!form.email || !form.password) {
      setError("Email and password are required");
      return;
    }
    
    setLoading(true);

    try {
      // Create account - BotAPI stores token automatically
      const result = await BotAPI.signup(form);
      
      if (result?.token) {
        console.log("Signup successful, token saved");
        // Go to Billing first
        nav("/billing", { replace: true });
      } else {
        setError("No token received from server");
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
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
      </form>
    </div>
  );
}