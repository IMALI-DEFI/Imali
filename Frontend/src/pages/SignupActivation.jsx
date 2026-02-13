// src/pages/SignupActivation.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BotAPI from "../utils/BotAPI";

export default function SignupActivation() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const signup = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMsg("Creating your account...");

    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1️⃣ Create account
      await BotAPI.signup({
        email: cleanEmail,
        password,
      });

      // 2️⃣ Auto-login (this sets token internally)
      await BotAPI.login({
        email: cleanEmail,
        password,
      });

      setMsg("Account created. Redirecting to billing...");

      setTimeout(() => {
        nav("/billing", { replace: true });
      }, 800);

    } catch (err) {
      setMsg(
        err?.response?.data?.message ||
        err?.message ||
        "Signup failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      
      {/* Signup Form */}
      <form onSubmit={signup} className="card space-y-3">
        <h2 className="font-bold text-xl">Create Your Account</h2>

        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="border rounded-xl px-3 py-2 w-full"
        />

        <input
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="border rounded-xl px-3 py-2 w-full"
        />

        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      {/* Activation Info */}
      <div className="card space-y-3">
        <h2 className="font-bold text-xl">How Activation Works</h2>

        <p className="text-slate-600 text-sm">
          After signup you will:
        </p>

        <ul className="list-disc pl-5 text-sm text-slate-600">
          <li>Add billing details</li>
          <li>Connect required integrations</li>
          <li>Enable trading</li>
        </ul>

        <button
          onClick={() => nav("/login")}
          className="btn btn-secondary"
        >
          Already have an account? Log in
        </button>
      </div>

      {msg && (
        <div className="col-span-2 text-slate-600 text-sm">
          {msg}
        </div>
      )}
    </div>
  );
}
