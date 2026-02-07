// src/pages/SignupActivation.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BotAPI from "../../utils/BotAPI";

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
      await BotAPI.signup({ email, password });
      setMsg("Signup successful. Redirecting to login…");

      setTimeout(() => {
        nav("/login", { replace: true });
      }, 1500);
    } catch (err) {
      setMsg(err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Signup */}
      <form onSubmit={signup} className="card space-y-3">
        <h2 className="font-bold text-xl">Sign up</h2>

        <input
          required
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
          {loading ? "Signing up…" : "Create account"}
        </button>
      </form>

      {/* Activation info (no fake API calls) */}
      <div className="card space-y-3">
        <h2 className="font-bold text-xl">Account Activation</h2>
        <p className="text-slate-600 text-sm">
          Activation happens automatically after you:
        </p>
        <ul className="list-disc pl-5 text-sm text-slate-600">
          <li>Create an account</li>
          <li>Add billing details</li>
          <li>Complete setup</li>
        </ul>

        <button
          onClick={() => nav("/login")}
          className="btn btn-secondary"
        >
          Go to login
        </button>
      </div>

      {msg && (
        <div className="col-span-2 text-slate-600">
          {msg}
        </div>
      )}
    </div>
  );
}
