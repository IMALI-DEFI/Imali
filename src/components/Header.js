// src/components/Header.js — desktop: clean pill nav + "More" menu; phone: Demo + big tile menu.
import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import logo from "../assets/imali-logo.png";

const PRIMARY = [
  { to: "/", label: "Home", emoji: "🏠", end: true },
  { to: "/how-it-works", label: "How It Works", emoji: "🧭" },
  { to: "/live", label: "Watch Live", emoji: "📺" },
  { to: "/pricing", label: "Plans", emoji: "💎" },
  { to: "/blog", label: "Learn", emoji: "📰" },
];

const MORE = [
  { to: "/enterprise", label: "For Teams", emoji: "🏢" },
  { to: "/referrals", label: "Earn Rewards", emoji: "🎁" },
  { to: "/admin-platform", label: "Managed Admin", emoji: "🧱" },
  { to: "/support", label: "Help", emoji: "🙋" },
];

const ALL = [...PRIMARY, ...MORE];
const TILE_COLORS = ["fun-blue", "fun-green", "fun-red", "fun-purple", "fun-orange", "fun-gold"];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const { pathname } = useLocation();
  const closeMenu = () => setOpen(false);

  // close menus on navigation / outside click
  useEffect(() => { setOpen(false); setMoreOpen(false); }, [pathname]);
  useEffect(() => {
    if (!moreOpen) return undefined;
    const onDown = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setMoreOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [moreOpen]);

  const moreActive = MORE.some((l) => pathname.startsWith(l.to));
  const linkClass = ({ isActive }) => `hdr-link ${isActive ? "is-active" : ""}`;

  return (
    <header className="hdr fixed top-0 inset-x-0 z-40">
      <div className="mx-auto max-w-7xl px-4 h-20 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" onClick={closeMenu} className="flex items-center gap-3 shrink-0">
          <img src={logo} alt="IMALI" className="hdr-logo" loading="eager" />
          <div className="flex flex-col leading-tight">
            <span className="text-white text-2xl font-black tracking-wide">IMALI</span>
            <span className="hidden sm:block text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffe07a]">
              Robot Trading Made Easy
            </span>
          </div>
        </Link>

        {/* Desktop nav (laptop and up) */}
        <nav className="hdr-nav hidden lg:flex" aria-label="Main menu">
          {PRIMARY.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              <span className="hdr-emoji" aria-hidden="true">{l.emoji}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              className={`hdr-link ${moreActive || moreOpen ? "is-active" : ""}`}
              aria-haspopup="true"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
            >
              <span>More</span>
              <span className={`hdr-caret ${moreOpen ? "is-open" : ""}`} aria-hidden="true">▾</span>
            </button>
            {moreOpen && (
              <div className="hdr-menu fun-slide-in" role="menu">
                {MORE.map((l) => l.external ? (
                  <a key={l.to} href={l.to} role="menuitem" className="hdr-menu-item"><span className="text-lg" aria-hidden="true">{l.emoji}</span>{l.label}</a>
                ) : (
                  <NavLink key={l.to} to={l.to} role="menuitem" className={({ isActive }) => `hdr-menu-item ${isActive ? "is-active" : ""}`}>
                    <span className="text-lg" aria-hidden="true">{l.emoji}</span>
                    {l.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Desktop actions */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <Link to="/dashboard" className="hdr-btn hdr-btn-ghost">My Account</Link>
          <Link to="/trade-demo" className="hdr-btn hdr-btn-gold">
            <span aria-hidden="true">🎮</span> Try the Demo
          </Link>
        </div>

        {/* Phone/tablet: demo button + menu */}
        <div className="flex lg:hidden items-center gap-2">
          <Link to="/trade-demo" onClick={closeMenu} className="fun-btn fun-gold fun-small fun-nav-glow">
            🎮 Demo
          </Link>
          <button
            type="button"
            className="fun-btn fun-ghost fun-small"
            style={{ paddingLeft: 14, paddingRight: 14 }}
            onClick={() => setOpen((prev) => !prev)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? "✖️" : "☰"}
          </button>
        </div>
      </div>

      {/* Phone/tablet menu: big tappable tiles */}
      {open && (
        <div className="lg:hidden bg-[#070a1f] border-t-2 border-[#2b3470] fun-slide-in max-h-[calc(100dvh-11rem)] overflow-y-auto overscroll-contain">
          <nav className="max-w-7xl mx-auto px-3 py-3 pb-6 grid grid-cols-2 sm:grid-cols-3 gap-2" aria-label="Main menu">
            <Link to="/login" onClick={closeMenu} className="fun-btn fun-blue col-span-2 sm:col-span-3" style={{ minHeight: 48, padding: "0.5rem" }}>
              👤 Sign In / My Account
            </Link>
            <Link to="/signup" onClick={closeMenu} className="fun-btn fun-gold col-span-2 sm:col-span-3" style={{ minHeight: 48, padding: "0.5rem" }}>
              🚀 Sign Up Free
            </Link>
            {ALL.map((l, i) => l.external ? (
              <a key={l.to} href={l.to} onClick={closeMenu} className={`fun-tile ${TILE_COLORS[i % TILE_COLORS.length]}`} style={{ minHeight: 90, padding: "0.5rem 0.35rem", borderRadius: 18, gap: "0.2rem" }}><span className="fun-emoji" style={{ fontSize: "1.8rem" }} aria-hidden="true">{l.emoji}</span><strong style={{ fontSize: "0.88rem" }}>{l.label}</strong></a>
            ) : (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={closeMenu}
                className={`fun-tile ${TILE_COLORS[i % TILE_COLORS.length]}`}
                style={{ minHeight: 90, padding: "0.5rem 0.35rem", borderRadius: 18, gap: "0.2rem" }}
              >
                <span className="fun-emoji" style={{ fontSize: "1.8rem" }} aria-hidden="true">{l.emoji}</span>
                <strong style={{ fontSize: "0.88rem" }}>{l.label}</strong>
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
