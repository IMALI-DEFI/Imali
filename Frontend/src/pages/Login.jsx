// src/pages/Login.jsx
import React, { useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function safeInternalPath(path, fallback = "/activation") {
  if (!path || typeof path !== "string") return fallback;

  // Allow only internal relative paths
  if (!path.startsWith("/")) return fallback;

  // Prevent protocol-based or // style redirects
  if (path.startsWith("//")) return fallback;
  if (path.includes("://")) return fallback;

  return path;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Support:
  // 1) BotAPI 401 redirect -> /login?next=/admin
  // 2) RequireAuth redirect -> state.from
  const nextFromQuery = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search || "");
      return params.get("next") || "";
    } catch {
      return "";
    }
  }, [location.search]);

  const fromState = useMemo(() => {
    const raw = location.state?.from;
    // RequireAuth sets: state={{ from: location.pathname + location.search }}
    // so it should already be a string path.
    return typeof raw === "string" ? raw : "";
  }, [location.state]);

  const destination = useMemo(() => {
    // Priority: next query param > state.from > default
    const raw = nextFromQuery || fromState || "/activation";
    return safeInternalPath(raw, "/activation");
  }, [nextFromQuery, fromState]);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const result = await login(normalizedEmail, password);

      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      localStorage.setItem("IMALI_EMAIL", normalizedEmail);

      // Go where the app originally intended:
      // - /admin should be allowed (AdminPanel will enforce admin/owner)
      // - /dashboard will still be protected by activation guard
      navigate(destination, { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
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
            className="w-full p-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500"
            autoComplete="email"
            disabled={loading}
          />

          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500"
            autoComplete="current-password"
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-white/60">
          Don’t have an account?{" "}
          <Link
            to="/signup"
            className="text-emerald-300 underline hover:text-emerald-200"
          >
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}