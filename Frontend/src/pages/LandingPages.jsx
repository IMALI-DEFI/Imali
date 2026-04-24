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
}
