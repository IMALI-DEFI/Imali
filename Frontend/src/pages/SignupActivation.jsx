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

      setMsg("Account created. Signing in...");

      // 2️⃣ Delay to avoid 429 rate limit from back-to-back requests
      await new Promise((r) => setTimeout(r, 1000));

      // 3️⃣ Auto-login (this sets token internally)
      await BotAPI.login({
        email: cleanEmail,
        password,
      });

      // 4️⃣ Store email for billing page
      localStorage.setItem("IMALI_EMAIL", cleanEmail);

      setMsg("Signed in. Redirecting to billing...");

      // 5️⃣ Navigate immediately — don't wait for loadUserData
      nav("/billing", {
        replace: true,
        state: {
          email: cleanEmail,
          fromSignup: true,
        },
      });

    } catch (err) {
      const status = err?.response?.status;

      if (status === 409) {
        setMsg("An account with this email already exists. Try logging in.");
      } else if (status === 429) {
        setMsg("Too many attempts. Please wait a moment and try again.");
      } else if (status === 401) {
        // Account created but auto-login failed
        setMsg("Account created! Please log in manually.");
        setTimeout(() => {
          nav("/login", {
            replace: true,
            state: {
              message: "Account created! Please log in to continue.",
              email: email.trim().toLowerCase(),
            },
          });
        }, 1500);
        return;
      } else {
        setMsg(
          err?.response?.data?.message ||
          err?.message ||
          "Signup failed. Please try again."
        );
      }
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
          disabled={loading}
        />

        <input
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="border rounded-xl px-3 py-2 w-full"
          disabled={loading}
        />

        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading}
        >
          {loading ? "Please wait…" : "Create account"}
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
