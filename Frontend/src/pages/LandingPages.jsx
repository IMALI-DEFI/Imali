// =============================
// src/pages/LandingPages.jsx
// Compatible with your current package.json
// Uses: react, react-router-dom, react-icons, tailwindcss
// No lucide-react. No framer-motion. No nested BrowserRouter.
// =============================

import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaChartLine,
  FaShieldAlt,
  FaBolt,
  FaWallet,
  FaCheckCircle,
  FaLock,
  FaRobot,
} from "react-icons/fa";
import { MdKeyboardArrowRight, MdOutlineShowChart } from "react-icons/md";

const variants = {
  redditA: {
    source: "Reddit",
    title: "Solo Developer Built This AI Trading Platform",
    subtitle: "Public dashboard live. 1 week free paper trading. Cancel anytime.",
    cta: "Get Early Access",
    eyebrow: "Built in public",
    audience:
      "For users who want proof, transparency, and a low-friction way to test before risking capital.",
  },
  redditB: {
    source: "Reddit",
    title: "No Screenshots. No Fake Claims. Live Dashboard.",
    subtitle:
      "Built solo over the last year with automation, risk controls, and transparent tracking.",
    cta: "Start Free Trial",
    eyebrow: "Transparent beta access",
    audience:
      "For skeptical users who want to see the system clearly before committing.",
  },
  xA: {
    source: "X",
    title: "AI Trading for Crypto + Stocks",
    subtitle:
      "Fast execution, smart entries, and built-in risk controls across multiple markets.",
    cta: "Join Beta",
    eyebrow: "Signal to execution",
    audience:
      "For fast-moving users who want a simple entry point with immediate clarity.",
  },
  xB: {
    source: "X",
    title: "Turn Market Noise Into Signals",
    subtitle: "Crypto, stocks, and DeFi with automation, analytics, and paper trading first.",
    cta: "Start Now",
    eyebrow: "Automation-first workflow",
    audience: "For people who want speed, simplicity, and a strong CTA.",
  },
  liA: {
    source: "LinkedIn",
    title: "Built Solo. Relaunched Publicly.",
    subtitle:
      "AI-driven trading platform with transparent metrics, onboarding flow, and public dashboard.",
    cta: "Request Access",
    eyebrow: "Founder-led product",
    audience:
      "For professionals who want legitimacy, structure, and clear product value.",
  },
  liB: {
    source: "LinkedIn",
    title: "From Idea to Launch: AI Trading Platform",
    subtitle:
      "Now onboarding beta users across stocks, crypto, and DeFi with guided setup.",
    cta: "Join Early Users",
    eyebrow: "Launch phase",
    audience: "For users who resonate with founder story and early traction.",
  },
  tgA: {
    source: "Telegram",
    title: "Alpha Access Open",
    subtitle:
      "Join the first wave of users testing the platform with free paper trading access.",
    cta: "Enter Now",
    eyebrow: "First users in",
    audience: "For Telegram communities that respond to early access and urgency.",
  },
  tgB: {
    source: "Telegram",
    title: "Live Dashboard + Free Trial",
    subtitle: "Try the system risk-free, track performance live, and cancel anytime.",
    cta: "Join Beta Group",
    eyebrow: "Risk-free start",
    audience:
      "For users who want a quick explanation and a direct path into trial.",
  },
  socialA: {
    source: "Instagram/TikTok",
    title: "Learn Trading Without Guessing",
    subtitle:
      "Beginner-friendly flow, paper trading first, then live only when you are ready.",
    cta: "Tap To Join",
    eyebrow: "Beginner-first",
    audience: "For visual, mobile-first audiences who want simple onboarding.",
  },
  socialB: {
    source: "Instagram/TikTok",
    title: "Want To Start Trading?",
    subtitle:
      "No chart confusion. No upfront subscription. Just a guided start with AI tools.",
    cta: "Start Here",
    eyebrow: "Simple onboarding",
    audience:
      "For short-attention social traffic that needs a direct promise fast.",
  },
};

const metrics = [
  { label: "Paper trading access", value: "7 days free" },
  { label: "Pricing model", value: "Pay on performance" },
  { label: "Supported flows", value: "Stocks • Crypto • DeFi" },
  { label: "Beta capacity", value: "First 50 users" },
];

const integrations = [
  {
    name: "Alpaca",
    description:
      "Connect for stocks and ETFs. Good for users who want automated equity trading in a cleaner workflow.",
    icon: MdOutlineShowChart,
  },
  {
    name: "OKX",
    description:
      "Connect for crypto spot and futures. Built for users who want centralized exchange execution.",
    icon: FaChartLine,
  },
  {
    name: "MetaMask",
    description: "Connect for on-chain wallet activity and DeFi trading flows.",
    icon: FaWallet,
  },
];

const benefits = [
  {
    title: "Start with paper trading",
    text: "Learn how the system opens, manages, and closes trades before using real capital.",
    icon: FaShieldAlt,
  },
  {
    title: "Built-in risk controls",
    text: "Use structured settings instead of making emotional decisions on every move.",
    icon: FaLock,
  },
  {
    title: "Public dashboard",
    text: "Track performance, activity, and system behavior in one place.",
    icon: FaChartLine,
  },
  {
    title: "Guided onboarding",
    text: "Choose your market, connect accounts, pick a strategy, and get started quickly.",
    icon: FaRobot,
  },
];

function getVariantFromPath(pathname) {
  const key = pathname.replace("/", "");
  return variants[key] ? key : "redditA";
}

function useTracking(routeKey) {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const src = params.get("src") || routeKey;

  const track = (event, payload = {}) => {
    const body = {
      event,
      route: routeKey,
      src,
      path: location.pathname,
      ts: new Date().toISOString(),
      ...payload,
    };

    console.log("track", body);

    // Optional backend tracking endpoint:
    // fetch('/api/analytics/event', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(body),
    // }).catch(() => {});
  };

  return { src, track };
}

function DashboardMock() {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900 p-4 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <p className="text-sm text-slate-400">Live Dashboard</p>
          <h3 className="text-lg font-semibold">Performance Snapshot</h3>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
          <FaBolt className="h-3 w-3" /> Live
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-800 p-4">
          <p className="text-xs text-slate-400">Win Rate</p>
          <p className="mt-2 text-2xl font-semibold">64.2%</p>
        </div>
        <div className="rounded-2xl bg-slate-800 p-4">
          <p className="text-xs text-slate-400">Tracked Trades</p>
          <p className="mt-2 text-2xl font-semibold">128</p>
        </div>
        <div className="rounded-2xl bg-slate-800 p-4">
          <p className="text-xs text-slate-400">Beta Offer</p>
          <p className="mt-2 text-2xl font-semibold">7-Day Trial</p>
        </div>
      </div>

      <div className="mt-4 h-40 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-4">
        <div className="flex h-full items-end gap-2">
          {[35, 55, 48, 74, 62, 88, 94, 79, 105, 112, 124, 136].map(
            (height, index) => (
              <div
                key={index}
                className="flex-1 rounded-t-xl bg-white/80"
                style={{ height: `${height}px` }}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

function SignupCard({ cta, routeKey }) {
  const [email, setEmail] = useState("");
  const [market, setMarket] = useState("stocks");
  const [experience, setExperience] = useState("beginner");
  const [submitted, setSubmitted] = useState(false);
  const { track } = useTracking(routeKey);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    track("landing_signup_submit", { email, market, experience });
    setSubmitted(true);

    // Low-friction option: send user to your existing signup page.
    setTimeout(() => {
      navigate(`/signup?email=${encodeURIComponent(email)}&src=${encodeURIComponent(routeKey)}&market=${encodeURIComponent(market)}&experience=${encodeURIComponent(experience)}`);
    }, 500);
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
      <h3 className="text-xl font-semibold">Start your beta access</h3>
      <p className="mt-2 text-sm text-slate-400">
        Begin with paper trading first. Cancel anytime.
      </p>

      {submitted ? (
        <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <div className="flex items-center gap-2 font-medium">
            <FaCheckCircle /> Sending you to signup
          </div>
          <p className="mt-2 text-emerald-100/90">
            Your email and source will be passed into the signup flow.
          </p>
        </div>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm text-slate-300">Email</label>
            <input
              className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Market</label>
              <select
                className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white"
                value={market}
                onChange={(event) => setMarket(event.target.value)}
              >
                <option value="stocks">Stocks / ETFs</option>
                <option value="crypto">Crypto</option>
                <option value="defi">DeFi</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Experience</label>
              <select
                className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white"
                value={experience}
                onChange={(event) => setExperience(event.target.value)}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 font-semibold text-slate-950 transition hover:opacity-90"
          >
            {cta}
            <MdKeyboardArrowRight className="h-5 w-5" />
          </button>

          <p className="text-xs text-slate-500">
            You’ll create your account on the next step.
          </p>
        </form>
      )}
    </div>
  );
}

function SectionTitle({ eyebrow, title, text }) {
  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-300">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {text ? <p className="text-slate-400">{text}</p> : null}
    </div>
  );
}

export default function LandingPages() {
  const location = useLocation();
  const routeKey = getVariantFromPath(location.pathname);
  const config = variants[routeKey];
  const { track, src } = useTracking(routeKey);

  React.useEffect(() => {
    track("landing_view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-white/5 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-lg font-semibold">Imali</p>
            <p className="text-xs text-slate-500">Source: {config.source}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 sm:inline-block">
              UTM: {src}
            </span>
            <Link
              to={`/signup?src=${encodeURIComponent(routeKey)}`}
              onClick={() => track("nav_cta_click")}
              className="rounded-2xl border border-white/10 bg-white px-4 py-2 text-sm font-medium text-slate-950"
            >
              {config.cta}
            </Link>
          </div>
        </div>
      </div>

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div className="space-y-8">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-sm text-sky-200">
                <FaBolt className="h-4 w-4" /> {config.eyebrow}
              </div>

              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                {config.title}
              </h1>
              <p className="max-w-2xl text-lg text-slate-300 sm:text-xl">
                {config.subtitle}
              </p>
              <p className="max-w-2xl text-sm text-slate-500">{config.audience}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-slate-400">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={`/signup?src=${encodeURIComponent(routeKey)}`}
                onClick={() => track("hero_primary_cta_click")}
                className="rounded-2xl bg-white px-6 py-3.5 font-semibold text-slate-950 transition hover:opacity-90"
              >
                {config.cta}
              </Link>
              <Link
                to="/live"
                onClick={() => track("hero_dashboard_click")}
                className="rounded-2xl border border-white/10 px-6 py-3.5 font-semibold text-white"
              >
                View Dashboard
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium">1 week free paper trading</p>
                <p className="mt-1 text-sm text-slate-400">Test without risking capital first.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium">No upfront subscription</p>
                <p className="mt-1 text-sm text-slate-400">Lower-friction entry for early users.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium">Cancel anytime</p>
                <p className="mt-1 text-sm text-slate-400">Keep the offer simple and easy to try.</p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <SignupCard cta={config.cta} routeKey={routeKey} />
            <DashboardMock />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <SectionTitle
            eyebrow="How it works"
            title="Simple onboarding for stocks, crypto, and DeFi"
            text="Designed to make the path from signup to first paper trade easier to understand."
          />

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {integrations.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.name} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{item.name}</h3>
                  <p className="mt-2 text-sm text-slate-400">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <SectionTitle
            eyebrow="Why users convert"
            title="The offer reduces friction for first-time users"
            text="You can test the system, understand the workflow, and decide later whether to continue."
          />

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {benefits.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-3xl border border-white/10 bg-slate-900 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{item.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-8 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-sky-300">Offer</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">First 50 beta users</h2>
              <p className="mt-3 max-w-2xl text-slate-400">
                Start with paper trading, learn the system, then go live only when ready.
              </p>
            </div>
            <Link
              to={`/signup?src=${encodeURIComponent(routeKey)}`}
              onClick={() => track("footer_cta_click")}
              className="rounded-2xl bg-white px-6 py-3.5 text-center font-semibold text-slate-950"
            >
              {config.cta}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
