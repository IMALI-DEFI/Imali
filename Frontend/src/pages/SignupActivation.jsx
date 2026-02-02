// src/pages/SignupActivation.jsx
import { useState } from "react";
import { BotAPI } from "../utils/api";

export default function SignupActivation() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activationToken, setActivationToken] = useState("");
  const [msg, setMsg] = useState("");

  const signup = async (e) => {
    e.preventDefault();
    setMsg("Signing up...");
    try {
      await BotAPI.signup({ email, password });
      setMsg("Signup successful. Check your email for activation token/link.");
    } catch (e) {
      setMsg(e?.response?.data?.message || e?.response?.data?.error || "Signup failed");
    }
  };

  const activate = async (e) => {
    e.preventDefault();
    setMsg("Activating...");
    try {
      const res = await BotAPI.activate(activationToken);

      // If backend returns a usable auth token, store it
      const t =
        res?.data?.token ||
        res?.data?.access_token ||
        res?.data?.auth_token ||
        res?.data?.jwt ||
        "";

      if (t) {
        localStorage.setItem("imali_token", t);
        setMsg("Activation complete. Token saved. You can now continue.");
      } else {
        setMsg(
          "Activation complete. (No auth token returned.) You still need to log in to access /api/me."
        );
      }
    } catch (e) {
      setMsg(e?.response?.data?.message || e?.response?.data?.error || "Activation failed");
    }
  };

  const testMe = async () => {
    setMsg("Calling /api/me...");
    try {
      const res = await BotAPI.me();
      setMsg(`✅ /api/me OK: ${JSON.stringify(res.data)}`);
    } catch (e) {
      setMsg(
        `❌ /api/me failed: ${e?.response?.status} ${JSON.stringify(e?.response?.data || {})}`
      );
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
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

        <button className="btn btn-primary" type="submit">
          Create account
        </button>
      </form>

      <form onSubmit={activate} className="card space-y-3">
        <h2 className="font-bold text-xl">Activate account</h2>

        <input
          required
          value={activationToken}
          onChange={(e) => setActivationToken(e.target.value)}
          placeholder="Activation token"
          className="border rounded-xl px-3 py-2 w-full"
        />

        <button className="btn btn-primary" type="submit">
          Activate
        </button>

        <button type="button" className="btn" onClick={testMe}>
          Test /api/me
        </button>
      </form>

      {msg && <div className="col-span-2 text-slate-600 break-words">{msg}</div>}
    </div>
  );
}
