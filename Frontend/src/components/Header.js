// src/components/Header.js
import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import logo from "../assets/imali-logo.png"; // <-- logo file

export default function Header() {
  const [open, setOpen] = useState(false);

  const navItem =
    "px-3 py-2 rounded-md text-sm font-medium hover:bg-white/10 transition";
  const active = ({ isActive }) =>
    `${navItem} ${isActive ? "bg-white/15 text-white" : "text-indigo-100"}`;

  return (
    <header className="fixed top-0 inset-x-0 z-40 backdrop-blur bg-black border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 h-20 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-4">
          <img
            src={logo}
            alt="IMALI Trading Bot"
            className="h-14 w-auto object-contain" // bigger + no crop
            loading="eager"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-white text-2xl font-extrabold tracking-wide">
              IMALI
            </span>
            <span className="text-[12px] uppercase tracking-widest text-white/60">
              Trading Bot
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/" className={active} end>
            Home
          </NavLink>
          <NavLink to="/how-it-works" className={active}>
            How It Works
          </NavLink>
          <NavLink to="/pricing" className={active}>
            Pricing
          </NavLink>
          <NavLink to="/referral" className={active}>
            Referral Partner
          </NavLink>
        </nav>

        {/* Member Login */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/dashboard"
            className="text-sm font-semibold px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 transition"
          >
            Member Login
          </Link>
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden text-indigo-100 p-2"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <svg width="28" height="28" fill="none" stroke="currentColor">
            <path strokeWidth="2" d="M4 6h20M4 12h20M4 18h20" />
          </svg>
        </button>
      </div>

      {/* Mobile panel */}
      {open && (
        <div className="md:hidden bg-black border-t border-white/10">
          <nav className="max-w-7xl mx-auto px-4 py-3 grid gap-2">
            <NavLink onClick={() => setOpen(false)} to="/" className={active} end>
              Home
            </NavLink>
            <NavLink
              onClick={() => setOpen(false)}
              to="/how-it-works"
              className={active}
            >
              How It Works
            </NavLink>
            <NavLink
              onClick={() => setOpen(false)}
              to="/pricing"
              className={active}
            >
              Pricing
            </NavLink>
            <NavLink
              onClick={() => setOpen(false)}
              to="/referral"
              className={active}
            >
              Referral Partner
            </NavLink>
            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="mt-2 text-center text-sm font-semibold px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 transition"
            >
              Member Login
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
