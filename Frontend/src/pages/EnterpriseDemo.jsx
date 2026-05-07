// src/pages/Enterprise.jsx
import React from "react";
import { Link } from "react-router-dom";
import enterpriseLogo from "../public/enterprise.PNG";

export default function Enterprise() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white">
      {/* HERO */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          
          {/* LEFT SIDE */}
          <div>
            <div className="inline-flex items-center px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-sm mb-6">
              Enterprise Trading Infrastructure
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
              Institutional Grade
              <span className="block text-cyan-400">
                AI Trading Automation
              </span>
            </h1>

            <p className="mt-6 text-lg text-gray-300 leading-relaxed">
              IMALI Enterprise gives organizations, trading groups, DAOs,
              investment teams, and high-volume traders access to advanced
              automated trading systems across crypto and stock markets.
            </p>

            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              <div className="bg-gray-900/70 border border-white/10 rounded-xl p-4">
                <h3 className="font-bold text-cyan-400">
                  Multi-Bot Infrastructure
                </h3>
                <p className="text-gray-400 text-sm mt-2">
                  Spot, Futures, Sniper, and Stock trading automation.
                </p>
              </div>

              <div className="bg-gray-900/70 border border-white/10 rounded-xl p-4">
                <h3 className="font-bold text-cyan-400">
                  AI Strategy Selection
                </h3>
                <p className="text-gray-400 text-sm mt-2">
                  Dynamic strategy systems designed for changing markets.
                </p>
              </div>

              <div className="bg-gray-900/70 border border-white/10 rounded-xl p-4">
                <h3 className="font-bold text-cyan-400">
                  Enterprise Analytics
                </h3>
                <p className="text-gray-400 text-sm mt-2">
                  Real-time dashboards, metrics, and portfolio visibility.
                </p>
              </div>

              <div className="bg-gray-900/70 border border-white/10 rounded-xl p-4">
                <h3 className="font-bold text-cyan-400">
                  Managed Solutions
                </h3>
                <p className="text-gray-400 text-sm mt-2">
                  White-label and managed trading infrastructure available.
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/signup"
                className="px-7 py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 transition font-semibold text-black"
              >
                Request Enterprise Access
              </Link>

              <Link
                to="/pricing"
                className="px-7 py-4 rounded-xl border border-white/20 hover:border-cyan-400 hover:text-cyan-300 transition"
              >
                View Pricing
              </Link>
            </div>
          </div>

          {/* RIGHT SIDE IMAGE */}
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full"></div>

            <div className="relative bg-gray-900/60 border border-white/10 rounded-3xl p-6 shadow-2xl">
              <img
                src={enterpriseLogo}
                alt="IMALI Enterprise"
                className="w-full rounded-2xl object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold">
            Built For Scale
          </h2>

          <p className="text-gray-400 mt-4 max-w-3xl mx-auto">
            IMALI Enterprise is designed for serious users who need automation,
            analytics, and advanced execution tools in one unified platform.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-cyan-400">
              Advanced Trading
            </h3>

            <p className="text-gray-400 mt-4 leading-relaxed">
              Execute automated strategies across multiple exchanges and market
              types using configurable AI-driven systems.
            </p>
          </div>

          <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-cyan-400">
              Risk Controls
            </h3>

            <p className="text-gray-400 mt-4 leading-relaxed">
              Integrated stop-loss logic, profit targeting, position monitoring,
              and strategy-level protection systems.
            </p>
          </div>

          <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-cyan-400">
              Enterprise Support
            </h3>

            <p className="text-gray-400 mt-4 leading-relaxed">
              White-label solutions, managed onboarding, and scalable
              infrastructure for larger organizations and teams.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-3xl p-12">
          <h2 className="text-4xl font-bold">
            Ready To Scale With IMALI?
          </h2>

          <p className="text-gray-300 mt-6 text-lg">
            Start using enterprise-grade automation tools designed to simplify
            advanced trading systems for teams and organizations.
          </p>

          <div className="mt-10">
            <Link
              to="/signup"
              className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 transition rounded-xl text-black font-bold"
            >
              Apply For Enterprise Access
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
