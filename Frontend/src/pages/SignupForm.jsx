import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BotAPI } from "../utils/BotAPI";

export default function Signup() {
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      // 1️⃣ Create account (BotAPI stores token automatically)
      await BotAPI.signup(form);

      // 2️⃣ Go to Billing FIRST
      nav("/billing", { replace: true });
    } catch (e) {
      setErr(e.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 text-white">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Create Account</h1>

        {err && <div className="text-red-400 text-sm">{err}</div>}

        <input
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full p-3 rounded bg-gray-800"
        />

        <input
          type="password"
          placeholder="Password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full p-3 rounded bg-gray-800"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 rounded-xl font-semibold disabled:opacity-50"
        >
          {loading ? "Creating…" : "Continue to Billing"}
        </button>

        <p className="text-sm text-center">
          Already have an account?{" "}
          <Link to="/login" className="underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
