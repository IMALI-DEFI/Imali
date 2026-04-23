import React, { useState } from 'react';
import { Mail, CheckCircle2, TrendingUp, ShieldCheck, BellRing } from 'lucide-react';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [interest, setInterest] = useState('all');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Replace this with your real newsletter endpoint
      // await fetch('/api/newsletter/subscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, first_name: firstName, interest })
      // });

      await new Promise((resolve) => setTimeout(resolve, 900));
      setSuccess(true);
      setEmail('');
      setFirstName('');
      setInterest('all');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_28%),radial-gradient(circle_at_right,_rgba(59,130,246,0.14),_transparent_20%)]" />

      <section className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-1.5 text-sm text-emerald-200">
              <Mail className="h-4 w-4" /> Weekly newsletter
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Get market insights, platform updates, and trading tips in one email.
            </h1>

            <p className="mt-5 max-w-2xl text-lg text-slate-300">
              Join the Imali newsletter for platform releases, beginner-friendly trading education, dashboard updates, and selected market opportunities across stocks, crypto, and DeFi.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <TrendingUp className="h-5 w-5 text-emerald-300" />
                <p className="mt-3 font-medium">Market updates</p>
                <p className="mt-1 text-sm text-slate-400">Clear breakdowns without the noise.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <p className="mt-3 font-medium">Risk-first education</p>
                <p className="mt-1 text-sm text-slate-400">Built for users who want structure, not hype.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <BellRing className="h-5 w-5 text-emerald-300" />
                <p className="mt-3 font-medium">Platform news</p>
                <p className="mt-1 text-sm text-slate-400">Be first to hear about beta access and new features.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/85 p-6 shadow-2xl sm:p-8">
            {!success ? (
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
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Wayne"
                      className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">What are you most interested in?</label>
                    <select
                      value={interest}
                      onChange={(e) => setInterest(e.target.value)}
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
                    className="w-full rounded-2xl bg-emerald-500 px-4 py-3.5 font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Subscribing...' : 'Join the Newsletter'}
                  </button>
                </form>

                <p className="mt-4 text-xs text-slate-500">
                  By subscribing, you agree to receive emails from Imali. You can unsubscribe anytime.
                </p>
              </>
            ) : (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="mt-5 text-2xl font-semibold">You’re in.</h2>
                <p className="mt-2 text-slate-400">
                  Thanks for subscribing. You’ll be first to hear about updates, beta access, and trading insights.
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  className="mt-6 rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white"
                >
                  Add another email
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
