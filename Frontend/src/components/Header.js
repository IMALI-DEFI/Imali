// src/components/Header.js
import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import logo from "../assets/imali-logo.png";

export default function Header() {
  const [open, setOpen] = useState(false);

  const navItem =
    "px-3 py-2 rounded-md text-sm font-medium hover:bg-white/10 transition";

  const active = ({ isActive }) =>
    `${navItem} ${isActive ? "bg-white/15 text-white" : "text-indigo-100"}`;

  const closeMenu = () => setOpen(false);

  return (
    <header className="fixed top-0 inset-x-0 z-40 backdrop-blur bg-black border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 h-20 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" onClick={closeMenu} className="flex items-center gap-4">
          <img
            src={logo}
            alt="IMALI"
            className="h-14 w-auto object-contain"
            loading="eager"
          />

          <div className="flex flex-col leading-tight">
            <span className="text-white text-2xl font-extrabold tracking-wide">
              IMALI
            </span>
            <span className="text-[12px] uppercase tracking-widest text-white/60">
              AI Trading Platform
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

          <NavLink to="/enterprise" className={active}>
            For Organizations
          </NavLink>

          <NavLink to="/referrals" className={active}>
            Referral Partner
          </NavLink>
        </nav>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/live"
            className="text-sm font-semibold px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 transition"
          >
            Live Dashboard
          </Link>

          <Link
            to="/dashboard"
            className="text-sm font-semibold px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 transition"
          >
            Member Login
          </Link>
        </div>

        {/* Mobile Burger */}
        <button
          className="md:hidden text-indigo-100 p-2"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg width="28" height="28" fill="none" stroke="currentColor">
            {open ? (
              <path strokeWidth="2" d="M6 6l16 16M22 6L6 22" />
            ) : (
              <path strokeWidth="2" d="M4 6h20M4 12h20M4 18h20" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Panel */}
      {open && (
        <div className="md:hidden bg-black border-t border-white/10">
          <nav className="max-w-7xl mx-auto px-4 py-3 grid gap-2">
            <NavLink onClick={closeMenu} to="/" className={active} end>
              Home
            </NavLink>

            <NavLink
              onClick={closeMenu}
              to="/how-it-works"
              className={active}
            >
              How It Works
            </NavLink>

            <NavLink onClick={closeMenu} to="/pricing" className={active}>
              Pricing
            </NavLink>

            <NavLink onClick={closeMenu} to="/enterprise" className={active}>
              For Organizations
            </NavLink>

            <NavLink onClick={closeMenu} to="/referrals" className={active}>
              Referral Partner
            </NavLink>

            <Link
              to="/live"
              onClick={closeMenu}
              className="mt-2 text-center text-sm font-semibold px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 transition"
            >
              Live Dashboard
            </Link>

            <Link
              to="/dashboard"
              onClick={closeMenu}
              className="text-center text-sm font-semibold px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 transition"
            >
              Member Login
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}