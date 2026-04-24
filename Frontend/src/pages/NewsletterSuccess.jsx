import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Mail, ArrowRight } from 'lucide-react';

export default function NewsletterSuccess() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_28%),radial-gradient(circle_at_right,_rgba(59,130,246,0.14),_transparent_20%)]" />

      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900/85 p-8 sm:p-10 shadow-2xl text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Subscription Confirmed</h1>

        <p className="mt-4 text-lg text-slate-300">
          You're officially on the Imali newsletter list.
        </p>

        <p className="mt-3 text-slate-400 max-w-xl mx-auto">
          Expect market insights, platform updates, beta announcements, beginner trading education, and selected opportunities across stocks, crypto, and DeFi.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
            <Mail className="h-5 w-5 text-emerald-300" />
            <p className="mt-3 font-medium">Check your inbox</p>
            <p className="mt-1 text-sm text-slate-400">
              A welcome email may arrive shortly. If not, check spam or promotions.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
            <ArrowRight className="h-5 w-5 text-emerald-300" />
            <p className="mt-3 font-medium">What’s next</p>
            <p className="mt-1 text-sm text-slate-400">
              Watch for product launches, beta access invites, and weekly updates.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="rounded-2xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 hover:opacity-90"
          >
            Return Home
          </Link>

          <Link
            to="/live"
            className="rounded-2xl border border-white/10 px-6 py-3 font-semibold text-white hover:bg-white/5"
          >
            View Public Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
