// src/pages/Enterprise.jsx
import React from "react";
import { Link } from "react-router-dom";
import {
  FaChartLine,
  FaShieldAlt,
  FaRobot,
  FaExchangeAlt,
  FaArrowRight,
  FaCogs,
} from "react-icons/fa";

export default function Enterprise() {
  const features = [
    {
      icon: <FaRobot />,
      title: "AI Trading Systems",
      text: "Automated strategies for Spot, Futures, Sniper, and Stock trading.",
    },
    {
      icon: <FaChartLine />,
      title: "Real-Time Analytics",
      text: "Monitor performance, trades, profits, and strategy metrics live.",
    },
    {
      icon: <FaShieldAlt />,
      title: "Risk Protection",
      text: "Built-in stop loss systems, profit targets, and trading safeguards.",
    },
    {
      icon: <FaExchangeAlt />,
      title: "Multi-Exchange Support",
      text: "Connect and manage multiple exchanges from one dashboard.",
    },
    {
      icon: <FaCogs />,
      title: "Managed Infrastructure",
      text: "Enterprise onboarding, white-label options, and scalable deployment.",
    },
    {
      icon: <FaRobot />,
      title: "Strategy Selection",
      text: "Choose trading styles based on risk tolerance and market conditions.",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent"></div>

        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* LEFT */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 text-sm mb-6">
                Enterprise Trading Platform
              </div>

              <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
                Enterprise Grade
                <span className="block text-cyan-400">
                  AI Trading Infrastructure
                </span>
              </h1>

              <p className="mt-6 text-lg text-gray-300 leading-relaxed">
                IMALI Enterprise helps organizations, trading groups,
                professionals, and high-volume traders automate crypto and stock
                trading using advanced AI-driven systems.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to="/signup"
                  className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition"
                >
                  Request Access
                  <FaArrowRight className="group-hover:translate-x-1 transition" />
                </Link>

                <Link
                  to="/pricing"
                  className="px-8 py-4 rounded-xl border border-white/20 hover:border-cyan-400 hover:text-cyan-300 transition"
                >
                  View Pricing
                </Link>
              </div>

              {/* STATS */}
              <div className="grid grid-cols-3 gap-4 mt-14">
                <div className="bg-gray-900/70 border border-white/10 rounded-2xl p-5 text-center">
                  <h3 className="text-3xl font-bold text-cyan-400">4</h3>
                  <p className="text-sm text-gray-400 mt-2">Trading Bots</p>
                </div>

                <div className="bg-gray-900/70 border border-white/10 rounded-2xl p-5 text-center">
                  <h3 className="text-3xl font-bold text-cyan-400">24/7</h3>
                  <p className="text-sm text-gray-400 mt-2">Automation</p>
                </div>

                <div className="bg-gray-900/70 border border-white/10 rounded-2xl p-5 text-center">
                  <h3 className="text-3xl font-bold text-cyan-400">AI</h3>
                  <p className="text-sm text-gray-400 mt-2">Strategy Engine</p>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full"></div>

              <div className="relative border border-white/10 rounded-3xl overflow-hidden bg-gray-900/70 shadow-2xl">
                <img
                  src="/enterprise.PNG"
                  alt="IMALI Enterprise"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold">
            Built For Serious Trading Operations
          </h2>

          <p className="mt-5 text-gray-400 max-w-3xl mx-auto">
            IMALI Enterprise combines automation, analytics, AI strategies,
            and scalable infrastructure into one simplified platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-gray-900/60 border border-white/10 hover:border-cyan-400/40 rounded-3xl p-8 transition duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400 text-2xl">
                {feature.icon}
              </div>

              <h3 className="text-2xl font-bold mt-6">
                {feature.title}
              </h3>

              <p className="text-gray-400 mt-4 leading-relaxed">
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ENTERPRISE SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          
          <div className="bg-gray-900/60 border border-white/10 rounded-3xl p-10">
            <h2 className="text-4xl font-bold">
              White Label & Managed Solutions
            </h2>

            <p className="text-gray-400 mt-6 leading-relaxed">
              IMALI Enterprise supports managed deployments for organizations
              looking to launch AI trading infrastructure under their own brand.
            </p>

            <ul className="mt-8 space-y-4 text-gray-300">
              <li>• Custom branding options</li>
              <li>• Managed infrastructure support</li>
              <li>• Advanced admin dashboards</li>
              <li>• Team and organization controls</li>
              <li>• Real-time trading analytics</li>
              <li>• Strategy management systems</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-400/20 rounded-3xl p-10">
            <h2 className="text-4xl font-bold">
              Designed To Simplify Advanced Trading
            </h2>

            <p className="text-gray-300 mt-6 leading-relaxed">
              IMALI is built to make automated trading more accessible while
              still providing advanced tools for experienced users and teams.
            </p>

            <div className="mt-10">
              <Link
                to="/signup"
                className="inline-flex items-center gap-3 px-8 py-4 bg-cyan-500 hover:bg-cyan-400 transition rounded-xl text-black font-bold"
              >
                Get Started
                <FaArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-14 text-center">
          <h2 className="text-5xl font-extrabold">
            Scale With IMALI Enterprise
          </h2>

          <p className="mt-6 text-gray-300 text-lg max-w-3xl mx-auto">
            Advanced automation, AI-driven strategies, analytics, and
            infrastructure designed for modern trading operations.
          </p>

          <div className="mt-10">
            <Link
              to="/signup"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 transition text-black font-bold text-lg"
            >
              Apply For Enterprise Access
              <FaArrowRight />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}