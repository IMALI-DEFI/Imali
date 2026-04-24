// =============================
// src/pages/Newsletter.jsx
// Compatible with your current package.json
// Uses: react, react-router-dom, react-icons, tailwindcss
// No lucide-react.
// =============================

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaCheckCircle, FaChartLine, FaShieldAlt, FaBell } from "react-icons/fa";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [interest, setInterest] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Replace with your real endpoint when ready.
      // await fetch('/api/newsletter/subscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, first_name: firstName, interest }),
      // });

      await new Promise((resolve) => setTimeout(resolve, 700));
      navigate("/newsletter/success");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-1.5 text-sm text-emerald-200">
              <FaEnvelope className="h-4 w-4" /> Weekly newsletter
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Get market insights, platform updates, and trading tips in one email.
            </h1>

            <p className="mt-5 max-w-2xl text-lg text-slate-300">
              Join the Imali newsletter for platform releases, beginner-friendly trading education, dashboard updates, and selected market opportunities across stocks, crypto, and DeFi.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <FaChartLine className="h-5 w-5 text-emerald-300" />
                <p className="mt-3 font-medium">Market updates</p>
                <p className="mt-1 text-sm text-slate-400">Clear breakdowns without the noise.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <FaShieldAlt className="h-5 w-5 text-emerald-300" />
                <p className="mt-3 font-medium">Risk-first education</p>
                <p className="mt-1 text-sm text-slate-400">Built for users who want structure, not hype.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <FaBell className="h-5 w-5 text-emerald-300" />
                <p className="mt-3 font-medium">Platform news</p>
                <p className="mt-1 text-sm text-slate-400">Be first to hear about beta access and new features.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl sm:p-8">
            <h2 className="text-2xl font-semibold">Subscribe</h2>
            <p className="mt-2 text-sm text-slate-400">
              No spam. Just useful updates, product news, and trading education.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm text-slate-300">First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Wayne"
                  className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  What are you most interested in?
                </label>
                <select
                  value={interest}
                  onChange={(event) => setInterest(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none"
                >
                  <option value="all">Everything</option>
                  <option value="stocks">Stocks</option>
                  <option value="crypto">Crypto</option>
                  <option value="defi">DeFi</option>
                  <option value="beginner">Beginner education</option>
                  <option value="product">Platform updates</option>
                </select>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3.5 font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Subscribing..." : "Join the Newsletter"}
                {!loading ? <FaCheckCircle className="h-4 w-4" /> : null}
              </button>
            </form>

            <p className="mt-4 text-xs text-slate-500">
              By subscribing, you agree to receive emails from Imali. You can unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
