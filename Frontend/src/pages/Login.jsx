import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BotAPI } from "../utils/BotAPI";

export default function Login() {
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
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
      const result = await BotAPI.login(form);
      
      if (result?.token) {
        console.log("Login successful, token saved");
        // Check activation status first
        try {
          const status = await BotAPI.activationStatus();
          if (status?.status?.activation_complete && status?.status?.trading_enabled) {
            nav("/dashboard", { replace: true });
          } else {
            nav("/activation", { replace: true });
          }
        } catch (statusErr) {
          // If activation check fails, go to activation page
          nav("/activation", { replace: true });
        }
      } else {
        setError("No token received from server");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 text-white">
      <form onSubmit={submit} className="w-full max-w-md space-y-6 p-8 bg-gray-900 rounded-2xl shadow-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to your IMALI account</p>
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
              placeholder="Enter your password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
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
              Signing in...
            </span>
          ) : (
            "Sign In"
          )}
        </button>

        <p className="text-center text-gray-400 text-sm">
          Don't have an account?{" "}
          <Link to="/signup" className="text-blue-400 hover:text-blue-300 underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}