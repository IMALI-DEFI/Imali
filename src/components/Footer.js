// src/components/Footer.js — game-style footer with a join call-to-action on every page.
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../assets/images/DefiFinanceLogo.png";
import { MascotLogo } from "./game/GameKit";

const LINKS = [
  { to: "/", label: "🏠 Home" },
  { to: "/how-it-works", label: "🧭 How It Works" },
  { to: "/trade-demo", label: "🎮 Free Demo" },
  { to: "/live", label: "📺 Watch Live" },
  { to: "/pricing", label: "💎 Plans" },
  { to: "/referrals", label: "🎁 Earn Rewards" },
  { to: "/enterprise", label: "🏢 For Teams" },
  { to: "/blog", label: "📰 Learn" },
  { to: "/admin-platform", label: "🧱 Managed Admin" },
  { to: "/support", label: "🙋 Help" },
  { to: "/data-deletion", label: "🗑️ Data Deletion" },
];

const HIDE_JOIN_ON = ["/signup", "/login", "/dashboard", "/billing", "/activation", "/admin"];

const Footer = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const showJoin = !user && !HIDE_JOIN_ON.some((p) => pathname.startsWith(p));

  return (
    <footer className="text-white bg-[#070a1f] border-t-2 border-[#2b3470]">
      {showJoin && (
        <>
          {/* Big join band */}
          <section className="mx-auto max-w-6xl px-4 pt-10">
            <div className="fun-sparkle p-6 sm:p-8 flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
              <div className="fun-sparkles" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
              <MascotLogo size={84} className="shrink-0" />
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-black">Get your own trading robot — free</h2>
                <p className="fun-help mt-1">Free 7-day Starter trial — no card. Or play the demo with pretend money first.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <Link to="/signup?tier=starter" className="fun-btn fun-gold fun-big"><span className="fun-btn-emoji" aria-hidden="true">🚀</span> Join Free</Link>
                <Link to="/trade-demo" className="fun-btn fun-ghost fun-big">🎮 Try Demo</Link>
              </div>
            </div>
          </section>

          {/* Phone-only sticky join bar */}
          <div className="md:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-[#070a1f]/95 backdrop-blur border-t-2 border-[#2b3470] flex gap-2"
               style={{ paddingBottom: "calc(.75rem + env(safe-area-inset-bottom))" }}>
            <Link to="/trade-demo" className="fun-btn fun-ghost fun-small flex-1">🎮 Demo</Link>
            <Link to="/signup?tier=starter" className="fun-btn fun-gold fun-small flex-[2]">🚀 Join Free — No Card</Link>
          </div>
        </>
      )}

      <div className={`mx-auto max-w-6xl px-4 py-10 grid gap-8 md:grid-cols-3 ${showJoin ? "pb-28 md:pb-10" : ""}`}>
        <div>
          <img src={Logo} alt="IMALI" className="h-10 mb-3" />
          <p className="fun-help text-sm">Trading robots made easy — learn how markets work while your robot trades.</p>
          <p className="text-xs text-white/40 mt-3">Your money stays in your own account. IMALI never holds it.</p>
        </div>

        <nav aria-label="Footer" className="md:col-span-2">
          <h3 className="font-black mb-3">Explore</h3>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm font-bold">
            {LINKS.map((l) => (
              <li key={l.to}><Link to={l.to} className="fun-nav-link">{l.label}</Link></li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/10 py-4 px-4 text-center text-xs text-white/40">
        <p>Trading involves risk, including loss of money. Practice mode uses pretend money. Past results don't promise future results.</p>
        <p className="mt-2">
          &copy; {new Date().getFullYear()} IMALI DeFi ·{" "}
          <Link to="/terms" className="underline">Terms</Link> ·{" "}
          <Link to="/privacy" className="underline">Privacy</Link>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
