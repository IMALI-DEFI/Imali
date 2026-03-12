// src/pages/ResetPassword.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import BotAPI from "../utils/BotAPI";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token");
    }
  }, [token]);

  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (success && countdown === 0) {
      navigate("/login", {
        state: {
          message: "Password reset successful! Please log in with your new password.",
        },
      });
    }
  }, [success, countdown, navigate]);

  const validate = () => {
    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (password.length > 72) {
      return "Password must be 72 characters or less";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      await BotAPI.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 
        err.message || 
        "Failed to reset password. Please try again.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white flex items-center justify-center">
        <div className="w-full max-w-md p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Invalid Reset Link</h1>
          <p className="text-gray-400 mb-6">
            This password reset link is invalid or has expired.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 rounded-xl bg-indigo-600 font-bold hover:bg-indigo-700 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white flex items-center justify-center">
      <div className="w-full max-w-md p-6 rounded-2xl bg-white/5 border border-white/10">
        <h1 className="text-3xl font-extrabold text-center mb-2">
          Reset Password
        </h1>
        <p className="text-gray-400 text-center mb-6">
          Enter your new password below
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-2 text-sm">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center">
            <div className="mb-4 text-green-400 text-lg">✅ Password reset successful!</div>
            <p className="text-gray-400 mb-4">
              Redirecting to login in {countdown} seconds...
            </p>
            <Link
              to="/login"
              className="inline-block px-6 py-3 rounded-xl bg-indigo-600 font-bold hover:bg-indigo-700 transition-colors"
            >
              Go to Login Now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              required
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500"
              autoComplete="new-password"
              disabled={loading}
            />

            <input
              type="password"
              required
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500"
              autoComplete="new-password"
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <div className="mt-5 text-center text-sm text-white/60">
          Remember your password?{" "}
          <Link to="/login" className="text-emerald-300 underline hover:text-emerald-200">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}