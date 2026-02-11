// src/pages/Login.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BotAPI from "../utils/BotAPI";
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      // Step 1: Login and get token
      const loginResponse = await BotAPI.login({
        email: email.trim(),
        password,
      });

      console.log('Login successful, token set:', BotAPI.getToken() ? 'Yes' : 'No');
      localStorage.setItem("IMALI_EMAIL", email.trim());

      // Step 2: Wait a moment for token to propagate and session to establish
      // This is crucial - give the backend a moment to process the login
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 3: Verify the token works by fetching user data first
      // This is more reliable than jumping straight to activation status
      let userData;
      try {
        userData = await BotAPI.me();
        console.log('User data fetched successfully:', userData);
      } catch (meError) {
        console.error('Failed to fetch user data, retrying...', meError);
        
        // Retry once with a longer delay
        await new Promise(resolve => setTimeout(resolve, 500));
        userData = await BotAPI.me();
      }

      // Step 4: Now check activation status
      let status;
      try {
        const act = await BotAPI.activationStatus();
        status = act?.status || act || {};
        console.log('Activation status:', status);
      } catch (statusError) {
        console.error('Failed to fetch activation status:', statusError);
        // Default to incomplete if we can't fetch status
        status = { complete: false, activation_complete: false, stripe_active: false };
      }

      // Step 5: Navigate based on status
      if (status.complete || status.activation_complete) {
        navigate("/dashboard", { replace: true });
        return;
      }

      if (status.stripe_active) {
        navigate("/activation", { replace: true });
        return;
      }

      // If no activation status or incomplete, go to signup/onboarding
      navigate("/signup", { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      
      // Handle specific error cases
      if (err.response?.status === 401) {
        setError("Invalid email or password");
      } else if (err.code === 'ERR_NETWORK') {
        setError("Network error. Please check your connection.");
      } else {
        setError(err?.response?.data?.message || err?.message || "Login failed");
      }
      
      // Clear any invalid token
      BotAPI.clearToken();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white flex items-center justify-center">
      <div className="w-full max-w-md p-6 rounded-2xl bg-white/5 border border-white/10">
        <h1 className="text-3xl font-extrabold text-center mb-2">
          Log in to IMALI
        </h1>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-2 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-xl bg-black/30 border border-white/10"
            autoComplete="email"
          />

          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-xl bg-black/30 border border-white/10"
            autoComplete="current-password"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-white/60">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-emerald-300 underline hover:text-emerald-200">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
