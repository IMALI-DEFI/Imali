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
  FaCheckCircle,
  FaArrowRight,
} from "react-icons/fa";

export default function Enterprise() {
  const card =
    "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-lg transition";

  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-4 pt-20 pb-16">

        <div className="grid lg:grid-cols-2 gap-14 items-center">

          {/* LEFT */}
          <div>

            <div className="flex items-center gap-4 mb-6">
              <img
                src={logo}
                alt="IMALI Enterprise"
                className="h-20 w-auto object-contain"
              />

              <div>
                <h2 className="text-2xl font-extrabold tracking-wide">
                  IMALI ENTERPRISE
                </h2>

                <p className="text-slate-500 text-sm">
                  AI Automation & Operational Intelligence
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 font-semibold">
              <FaBuilding />
              Enterprise & Government Innovation
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mt-7">
              Intelligent Automation For Modern Operations
            </h1>

            <p className="mt-7 text-lg text-slate-600 leading-8">
              IMALI Enterprise helps organizations modernize operations using
              AI-assisted automation, predictive analytics, intelligent dashboards,
              and simulation-driven decision support systems.
            </p>

            <p className="mt-5 text-slate-500 leading-8">
              The platform framework can support workforce analytics,
              operational visibility, training simulations, digital engagement,
              predictive maintenance, and real-time monitoring workflows.
            </p>

            <div className="flex flex-wrap gap-4 mt-10">

              <Link
                to="/trade-demo"
                className="px-7 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                Launch Interactive Demo
                <FaArrowRight />
              </Link>

              <Link
                to="/signup"
                className="px-7 py-4 rounded-2xl border border-slate-300 bg-white hover:bg-slate-100 font-bold transition"
              >
                Request Enterprise Access
              </Link>

            </div>

          </div>

          {/* RIGHT */}
          <div>

            <div className="rounded-[32px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-cyan-50 p-8">

              <div className="grid grid-cols-2 gap-5">

                <div className={card}>
                  <FaRobot className="text-3xl text-emerald-600" />

                  <div className="mt-4 text-xl font-bold">
                    AI Automation
                  </div>

                  <div className="text-sm text-slate-500 mt-2 leading-6">
                    Reduce repetitive operational tasks with intelligent automation.
                  </div>
                </div>

                <div className={card}>
                  <FaChartLine className="text-3xl text-cyan-600" />

                  <div className="mt-4 text-xl font-bold">
                    Analytics
                  </div>

                  <div className="text-sm text-slate-500 mt-2 leading-6">
                    Real-time dashboards, metrics, and operational reporting.
                  </div>
                </div>

                <div className={card}>
                  <FaBrain className="text-3xl text-purple-600" />

                  <div className="mt-4 text-xl font-bold">
                    Predictive Insights
                  </div>

                  <div className="text-sm text-slate-500 mt-2 leading-6">
                    Forecast operational risks and identify trends earlier.
                  </div>
                </div>

                <div className={card}>
                  <FaShieldAlt className="text-3xl text-yellow-500" />

                  <div className="mt-4 text-xl font-bold">
                    Monitoring
                  </div>

                  <div className="text-sm text-slate-500 mt-2 leading-6">
                    Centralized visibility across systems and workflows.
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-4 py-16">

        <div className="text-center max-w-3xl mx-auto">

          <h2 className="text-4xl font-extrabold">
            Designed For Enterprise Operations
          </h2>

          <p className="mt-6 text-slate-600 leading-8">
            IMALI Enterprise provides flexible AI-powered infrastructure
            designed to support operational intelligence, workflow automation,
            simulation environments, and advanced analytics.
          </p>

        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mt-16">

          <div className={card}>
            <div className="text-4xl">📊</div>

            <h3 className="text-2xl font-bold mt-5">
              Operational Dashboards
            </h3>

            <p className="text-slate-500 mt-4 leading-7">
              Visualize trends, metrics, alerts, and performance data
              across departments and systems.
            </p>
          </div>

          <div className={card}>
            <div className="text-4xl">🤖</div>

            <h3 className="text-2xl font-bold mt-5">
              Workflow Automation
            </h3>

            <p className="text-slate-500 mt-4 leading-7">
              Streamline repetitive operational workflows using AI-assisted automation.
            </p>
          </div>

          <div className={card}>
            <div className="text-4xl">📈</div>

            <h3 className="text-2xl font-bold mt-5">
              Predictive Analytics
            </h3>

            <p className="text-slate-500 mt-4 leading-7">
              Identify operational patterns and future risks before escalation.
            </p>
          </div>

          <div className={card}>
            <div className="text-4xl">🎓</div>

            <h3 className="text-2xl font-bold mt-5">
              Simulation & Training
            </h3>

            <p className="text-slate-500 mt-4 leading-7">
              Practice operational scenarios safely through simulation environments.
            </p>
          </div>

          <div className={card}>
            <div className="text-4xl">🌐</div>

            <h3 className="text-2xl font-bold mt-5">
              Digital Engagement
            </h3>

            <p className="text-slate-500 mt-4 leading-7">
              Improve communication and transparency through intelligent digital systems.
            </p>
          </div>

          <div className={card}>
            <div className="text-4xl">🔒</div>

            <h3 className="text-2xl font-bold mt-5">
              Enterprise Ready
            </h3>

            <p className="text-slate-500 mt-4 leading-7">
              Built for scalability, operational oversight, analytics, and future growth.
            </p>
          </div>

        </div>

      </section>

      {/* USE CASES */}
      <section className="max-w-7xl mx-auto px-4 py-16">

        <div className="rounded-[36px] border border-slate-200 bg-slate-50 p-8 md:p-12">

          <div className="text-center max-w-3xl mx-auto">

            <h2 className="text-4xl font-extrabold">
              Potential Operational Use Cases
            </h2>

            <p className="mt-6 text-slate-600 leading-8">
              The IMALI Enterprise framework can support multiple enterprise
              and operational intelligence initiatives.
            </p>

          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mt-14">

            {[
              "Predictive maintenance systems",
              "Operational analytics dashboards",
              "AI-assisted scheduling",
              "Simulation environments",
              "Digital operations monitoring",
              "Automated reporting workflows",
              "Community engagement analytics",
              "Workforce performance tracking",
              "Real-time operational visibility",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-white p-5 flex items-start gap-3 shadow-sm"
              >
                <FaCheckCircle className="text-emerald-500 mt-1 flex-shrink-0" />

                <span className="text-slate-700">
                  {item}
                </span>
              </div>
            ))}

          </div>

        </div>

      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 py-20">

        <div className="rounded-[40px] border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-10 text-center shadow-sm">

          <div className="text-6xl mb-5">
            🚀
          </div>

          <h2 className="text-4xl font-extrabold">
            Explore The Interactive Demo
          </h2>

          <p className="mt-6 text-slate-600 leading-8 max-w-3xl mx-auto">
            Experience a live AI-powered simulation environment demonstrating
            automation, analytics, confidence scoring, operational visibility,
            and intelligent decision-support systems in real time.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mt-10">

            <Link
              to="/trade-demo"
              className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg shadow-emerald-500/20"
            >
              Launch Demo
            </Link>

            <Link
              to="/signup"
              className="px-8 py-4 rounded-2xl border border-slate-300 bg-white hover:bg-slate-100 font-bold transition"
            >
              Contact Enterprise Team
            </Link>

          </div>

        </div>

      </section>

      {/* FOOTER */}
      <div className="text-center text-sm text-slate-500 pb-12 px-4">
        IMALI Enterprise • AI Automation • Analytics • Operational Intelligence
      </div>

    </div>
  );
}