// src/pages/Enterprise.jsx

import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/imali-logo.png";

import {
  FaRobot,
  FaChartLine,
  FaShieldAlt,
  FaBuilding,
  FaBrain,
  FaUsers,
  FaCheckCircle,
  FaArrowRight,
} from "react-icons/fa";

export default function Enterprise() {
  const card =
    "rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-4 pt-20 pb-14">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          <div>

            {/* LOGO */}
            <div className="flex items-center gap-4 mb-6">
              <img
                src={logo}
                alt="IMALI Enterprise"
                className="h-20 w-auto object-contain"
              />

              <div>
                <div className="text-2xl font-extrabold tracking-wide">
                  IMALI ENTERPRISE
                </div>

                <div className="text-slate-400 text-sm">
                  AI Automation & Operational Intelligence
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
              <FaBuilding />
              Enterprise & Government Innovation
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mt-6">
              AI Automation & Analytics Platform
            </h1>

            <p className="mt-6 text-lg text-slate-300 leading-8">
              IMALI Enterprise transforms complex workflows into intelligent,
              automated systems with dashboards, predictive analytics,
              simulation tools, and real-time operational visibility.
            </p>

            <p className="mt-4 text-slate-400 leading-7">
              The same automation framework used for intelligent decision support
              can be adapted for workforce analytics, operational planning,
              training simulations, digital engagement, and performance monitoring.
            </p>

            <div className="flex flex-wrap gap-4 mt-10">

              <Link
                to="/trade-demo"
                className="px-7 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                Launch Interactive Demo
                <FaArrowRight />
              </Link>

              <Link
                to="/signup"
                className="px-7 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 font-bold transition"
              >
                Request Enterprise Access
              </Link>

            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="relative">

            <div className="rounded-[32px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-8 backdrop-blur">

              <div className="grid grid-cols-2 gap-4">

                <div className={card}>
                  <FaRobot className="text-3xl text-emerald-300" />
                  <div className="mt-4 text-xl font-bold">
                    AI Automation
                  </div>
                  <div className="text-sm text-slate-400 mt-2">
                    Reduce repetitive manual processes.
                  </div>
                </div>

                <div className={card}>
                  <FaChartLine className="text-3xl text-cyan-300" />
                  <div className="mt-4 text-xl font-bold">
                    Analytics
                  </div>
                  <div className="text-sm text-slate-400 mt-2">
                    Real-time dashboards and reporting.
                  </div>
                </div>

                <div className={card}>
                  <FaBrain className="text-3xl text-purple-300" />
                  <div className="mt-4 text-xl font-bold">
                    Predictive Insights
                  </div>
                  <div className="text-sm text-slate-400 mt-2">
                    Forecast trends and identify risks early.
                  </div>
                </div>

                <div className={card}>
                  <FaShieldAlt className="text-3xl text-yellow-300" />
                  <div className="mt-4 text-xl font-bold">
                    Monitoring
                  </div>
                  <div className="text-sm text-slate-400 mt-2">
                    Centralized operational visibility.
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-4 py-10">

        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-extrabold">
            Designed For Modern Operations
          </h2>

          <p className="mt-5 text-slate-400 leading-8">
            IMALI Enterprise provides a flexible AI-powered framework that can
            support operational planning, digital engagement, analytics,
            simulation, and intelligent automation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mt-14">

          <div className={card}>
            <div className="text-4xl">📊</div>

            <h3 className="text-2xl font-bold mt-5">
              Operational Dashboards
            </h3>

            <p className="text-slate-400 mt-4 leading-7">
              Visualize performance metrics, trends, alerts, and activity
              across departments and systems.
            </p>
          </div>

          <div className={card}>
            <div className="text-4xl">🤖</div>

            <h3 className="text-2xl font-bold mt-5">
              AI Workflow Automation
            </h3>

            <p className="text-slate-400 mt-4 leading-7">
              Streamline repetitive workflows using intelligent automation and
              AI-assisted processes.
            </p>
          </div>

          <div className={card}>
            <div className="text-4xl">📈</div>

            <h3 className="text-2xl font-bold mt-5">
              Predictive Analytics
            </h3>

            <p className="text-slate-400 mt-4 leading-7">
              Identify operational risks, performance trends, and planning
              opportunities before issues escalate.
            </p>
          </div>

          <div className={card}>
            <div className="text-4xl">🎓</div>

            <h3 className="text-2xl font-bold mt-5">
              Simulation & Training
            </h3>

            <p className="text-slate-400 mt-4 leading-7">
              Practice operational scenarios safely using AI-powered simulation
              environments and training tools.
            </p>
          </div>

          <div className={card}>
            <div className="text-4xl">👥</div>

            <h3 className="text-2xl font-bold mt-5">
              Digital Engagement
            </h3>

            <p className="text-slate-400 mt-4 leading-7">
              Improve communication, visibility, and responsiveness with
              modern digital interaction systems.
            </p>
          </div>

          <div className={card}>
            <div className="text-4xl">🔒</div>

            <h3 className="text-2xl font-bold mt-5">
              Enterprise Ready
            </h3>

            <p className="text-slate-400 mt-4 leading-7">
              Scalable architecture designed for operational oversight,
              security, analytics, and future expansion.
            </p>
          </div>

        </div>

      </section>

      {/* USE CASES */}
      <section className="max-w-7xl mx-auto px-4 py-10">

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 md:p-12">

          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl font-extrabold">
              Potential Use Cases
            </h2>

            <p className="mt-5 text-slate-400 leading-8">
              The IMALI Enterprise framework can be adapted to support
              operational intelligence across multiple sectors.
            </p>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mt-14">

            {[
              "Predictive maintenance systems",
              "Workforce analytics dashboards",
              "AI-assisted scheduling systems",
              "Simulation and training environments",
              "Digital operations monitoring",
              "Automated reporting workflows",
              "Community engagement analytics",
              "Operational performance tracking",
              "Real-time visibility dashboards",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-black/20 p-5 flex items-start gap-3"
              >
                <FaCheckCircle className="text-emerald-400 mt-1 flex-shrink-0" />

                <span className="text-slate-300">
                  {item}
                </span>
              </div>
            ))}

          </div>

        </div>

      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 py-16">

        <div className="rounded-[36px] border border-indigo-500/20 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 p-10 text-center">

          <div className="text-6xl mb-5">
            🚀
          </div>

          <h2 className="text-4xl font-extrabold">
            Explore The Interactive Demo
          </h2>

          <p className="mt-5 text-slate-300 leading-8 max-w-3xl mx-auto">
            Experience a live AI-powered simulation environment that demonstrates
            analytics, automation, confidence scoring, operational visibility,
            and intelligent decision support in real time.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mt-10">

            <Link
              to="/trade-demo"
              className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold transition shadow-lg shadow-emerald-500/20"
            >
              Launch Demo
            </Link>

            <Link
              to="/signup"
              className="px-8 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 font-bold transition"
            >
              Contact Enterprise Team
            </Link>

          </div>

        </div>

      </section>

      {/* FOOTER */}
      <div className="text-center text-xs text-white/30 pb-10 px-4">
        IMALI Enterprise • AI Automation • Analytics • Operational Intelligence
      </div>

    </div>
  );
}
