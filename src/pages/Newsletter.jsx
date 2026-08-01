// =============================
// src/pages/Newsletter.jsx
// Compatible with your current package.json
// Uses: react, react-router-dom, react-icons, tailwindcss
// No lucide-react.
// =============================

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaEnvelope, FaCheckCircle, FaChartLine, FaShieldAlt, FaBell, FaArrowLeft } from "react-icons/fa";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [interest, setInterest] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
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
      setSuccess(true);
      // Reset form after success
      setEmail("");
      setFirstName("");
      setInterest("all");
      
      // Navigate after showing success message
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Back to Home */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
        >
          <FaArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>

      <section className="mx-auto max-w-6xl px-6 py-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-6">
              <img 
                src="/logo192.png" 
                alt="IMALI Logo" 
                className="h-12 w-12 rounded-xl"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' rx='12' fill='%2310b981'/%3E%3Ctext x='24' y='32' text-anchor='middle' font-size='24' fill='white' font-weight='bold'%3EI%3C/text%3E%3C/svg%3E";
                }}
              />
              <span className="text-xl font-bold text-white">IMALI</span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-1.5 text-sm text-emerald-200">
              <FaEnvelope className="h-4 w-4" /> Weekly newsletter
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Get market insights, platform updates, and trading tips in one email.
            </h1>

            <p className="mt-5 max-w-2xl text-lg text-slate-300">
              Join the IMALI newsletter for platform releases, beginner-friendly trading education, dashboard updates, and selected market opportunities across stocks, crypto, and DeFi.
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
            {success ? (
              <div className="text-center py-8">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                  <FaCheckCircle className="h-10 w-10 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-semibold">You're subscribed! 🎉</h2>
                <p className="mt-2 text-slate-400">
                  Thanks for joining the IMALI newsletter. You'll hear from us soon.
                </p>
                <p className="mt-4 text-sm text-slate-500">Redirecting to home...</p>
              </div>
            ) : (
              <>
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
                      className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
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
                      className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">
                      What are you most interested in?
                    </label>
                    <select
                      value={interest}
                      onChange={(event) => setInterest(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
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
                    {loading ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Subscribing...
                      </>
                    ) : (
                      <>
                        Join the Newsletter
                        <FaCheckCircle className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-4 text-xs text-slate-500">
                  By subscribing, you agree to receive emails from IMALI. You can unsubscribe anytime.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-8">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <img 
              src="/logo192.png" 
              alt="IMALI" 
              className="h-6 w-6 rounded"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%2310b981'/%3E%3Ctext x='12' y='17' text-anchor='middle' font-size='14' fill='white' font-weight='bold'%3EI%3C/text%3E%3C/svg%3E";
              }}
            />
            <span>© {new Date().getFullYear()} IMALI. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-white transition">Home</Link>
            <Link to="/pricing" className="hover:text-white transition">Pricing</Link>
            <Link to="/trade-demo" className="hover:text-white transition">Demo</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}