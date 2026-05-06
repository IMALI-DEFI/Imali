// src/pages/EnterpriseDemo.jsx
import React from "react";
import { Link } from "react-router-dom";
import {
  FaChartLine,
  FaUsers,
  FaRobot,
  FaShieldAlt,
  FaGraduationCap,
  FaBuilding,
  FaArrowRight,
  FaCheckCircle,
} from "react-icons/fa";

export default function EnterpriseDemo() {
  const card =
    "rounded-2xl bg-white/10 border border-white/10 p-6 shadow-lg backdrop-blur";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      {/* HERO */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <span className="inline-block mb-5 rounded-full border border-blue-400/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-200">
          IMALI Enterprise / Community Lab
        </span>

        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
          AI-Powered Financial Automation, Education, and Analytics
        </h1>

        <p className="mt-6 max-w-4xl mx-auto text-lg text-slate-300 leading-8">
          IMALI Enterprise helps counties, schools, workforce programs,
          nonprofits, and organizations teach financial automation safely through
          simulation, dashboards, analytics, and AI-assisted learning tools.
        </p>

        <div className="mt-6 max-w-4xl mx-auto rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
          <p className="text-base md:text-lg font-semibold text-blue-100 leading-7">
            “Trade automation teaches people how AI-driven systems use data,
            risk management, and rules-based decision-making in modern digital
            environments.”
          </p>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://imali-defi.com/trade-demo?mode=enterprise"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 font-bold hover:bg-blue-700 transition"
          >
            Launch Interactive Demo <FaArrowRight />
          </a>

          <Link
            to="/signup?mode=enterprise"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-4 font-bold hover:bg-white/10 transition"
          >
            Start Pilot Conversation
          </Link>
        </div>
      </section>

      {/* USE CASES */}
      <section className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-6">
        <div className={card}>
          <FaGraduationCap className="text-3xl text-blue-300 mb-4" />
          <h3 className="text-xl font-bold mb-2">
            Financial Literacy
          </h3>

          <p className="text-slate-300 leading-7">
            Residents and students learn how automation, analytics, and
            AI-assisted systems make financial decisions using safe
            simulation-based environments.
          </p>
        </div>

        <div className={card}>
          <FaUsers className="text-3xl text-green-300 mb-4" />
          <h3 className="text-xl font-bold mb-2">
            Workforce Development
          </h3>

          <p className="text-slate-300 leading-7">
            Programs can teach AI literacy, automation concepts, dashboard
            analysis, and risk management through hands-on digital experiences.
          </p>
        </div>

        <div className={card}>
          <FaBuilding className="text-3xl text-purple-300 mb-4" />
          <h3 className="text-xl font-bold mb-2">
            Small Business Innovation
          </h3>

          <p className="text-slate-300 leading-7">
            Organizations and entrepreneurs gain exposure to automation,
            analytics, reporting, and modern digital decision-making tools.
          </p>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="rounded-3xl bg-slate-900 border border-white/10 p-8 md:p-12">
          <h2 className="text-3xl font-extrabold text-center mb-10">
            Why Organizations Use IMALI Enterprise
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <Feature
              icon={<FaRobot />}
              title="AI & Automation Education"
              text="Participants gain hands-on exposure to AI-assisted systems and automated decision-making."
            />

            <Feature
              icon={<FaChartLine />}
              title="Measurable Outcomes"
              text="Track engagement, activity, learning progress, and participation using real dashboards."
            />

            <Feature
              icon={<FaShieldAlt />}
              title="Safe Simulation Environment"
              text="Paper trading mode allows participants to learn without risking real funds."
            />

            <Feature
              icon={<FaUsers />}
              title="Program Visibility"
              text="Organizations can monitor usage, participation, readiness, and engagement trends."
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-3xl font-extrabold mb-5">
            How the Enterprise Experience Works
          </h2>

          <p className="text-slate-300 mb-6 leading-8">
            IMALI Enterprise uses a simulation-first approach to help users
            understand automation, strategies, analytics, and digital financial
            systems in a safe and modern learning environment.
          </p>

          <ul className="space-y-3 text-slate-200">
            <Bullet text="Simulation-based onboarding and paper trading" />
            <Bullet text="Interactive dashboards and performance tracking" />
            <Bullet text="AI-assisted strategy demonstrations" />
            <Bullet text="Real-time visual analytics and engagement metrics" />
            <Bullet text="Safe learning before real-world implementation" />
          </ul>
        </div>

        <div className="rounded-3xl bg-white/10 border border-white/10 p-8">
          <h3 className="text-2xl font-bold mb-5">
            Example Pilot Structure
          </h3>

          <div className="space-y-5">
            <Step
              number="1"
              title="Launch Demo Access"
              text="Participants enter the simulation environment through the IMALI demo platform."
            />

            <Step
              number="2"
              title="Learn Automation Concepts"
              text="Users explore strategies, dashboards, analytics, and AI-assisted decision systems."
            />

            <Step
              number="3"
              title="Track Participation"
              text="Organizations review engagement, readiness, and activity metrics."
            />

            <Step
              number="4"
              title="Measure Outcomes"
              text="Program leaders receive visibility into adoption, usage, and participant progress."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold">
          Explore the IMALI Enterprise Experience
        </h2>

        <p className="mt-5 text-slate-300 leading-8 text-lg">
          Experience how AI-assisted automation, simulation, and analytics can
          support workforce development, financial literacy, and digital
          education initiatives.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://imali-defi.com/trade-demo?mode=enterprise"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 font-bold hover:bg-blue-700 transition"
          >
            Open Demo <FaArrowRight />
          </a>

          <Link
            to="/signup?mode=enterprise"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-8 py-4 font-bold hover:bg-white/10 transition"
          >
            Request Pilot Access
          </Link>
        </div>
      </section>
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="flex gap-4 rounded-2xl bg-white/5 border border-white/10 p-5">
      <div className="text-2xl text-blue-300 mt-1">
        {icon}
      </div>

      <div>
        <h4 className="font-bold text-lg">
          {title}
        </h4>

        <p className="text-slate-300 mt-1 leading-7">
          {text}
        </p>
      </div>
    </div>
  );
}

function Bullet({ text }) {
  return (
    <li className="flex items-start gap-3">
      <FaCheckCircle className="text-green-400 mt-1 shrink-0" />
      <span>{text}</span>
    </li>
  );
}

function Step({ number, title, text }) {
  return (
    <div className="flex gap-4">
      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold shrink-0">
        {number}
      </div>

      <div>
        <h4 className="font-bold">
          {title}
        </h4>

        <p className="text-slate-300 text-sm leading-7">
          {text}
        </p>
      </div>
    </div>
  );
}