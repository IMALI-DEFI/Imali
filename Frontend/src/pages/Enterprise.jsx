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
  FaEnvelope,
  FaPlayCircle,
} from "react-icons/fa";

export default function EnterpriseDemo() {
  const card =
    "rounded-2xl bg-white/10 border border-white/10 p-6 shadow-lg backdrop-blur";

  // Enterprise contact email
  const ENTERPRISE_EMAIL = "imalidefi@gmail.com";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="mb-6 flex justify-center">
          <img
            src="/enterprise.PNG"
            alt="IMALI Enterprise"
            className="h-20 w-auto mx-auto"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>

        <span className="inline-block mb-5 rounded-full border border-blue-400/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-200">
          IMALI Enterprise / Community Lab
        </span>

        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
          AI-Powered Financial Automation, Education, and Analytics for Organizations
        </h1>

        <p className="mt-6 max-w-3xl mx-auto text-lg text-slate-300">
          IMALI Enterprise helps counties, workforce programs, schools, and small
          business initiatives teach financial automation safely through simulation,
          dashboards, analytics, and guided strategy tools.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          {/* Request Demo - Opens email */}
          <a
            href={`mailto:${ENTERPRISE_EMAIL}?subject=Enterprise%20Pilot%20Demo%20Request&body=I%27m%20interested%20in%20learning%20more%20about%20IMALI%20Enterprise%20for%20our%20organization.`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 font-bold hover:from-blue-700 hover:to-blue-600 transition shadow-lg"
          >
            Request Pilot Demo <FaEnvelope />
          </a>

          {/* FIXED: Points to public demo route, NOT protected dashboard */}
          <Link
            to="/trade-demo"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3 font-bold hover:bg-white/10 hover:border-white/30 transition"
          >
            View Live Demo Dashboard <FaPlayCircle />
          </Link>
        </div>

        <p className="mt-4 text-sm text-slate-400">
          🎓 No login required • Paper trading simulation • Explore all features
        </p>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-6">
        <div className={card}>
          <FaGraduationCap className="text-3xl text-blue-300 mb-4" />
          <h3 className="text-xl font-bold mb-2">Financial Literacy</h3>
          <p className="text-slate-300">
            Residents learn how automated financial decisions work using paper
            trading and simulation — without risking real money.
          </p>
        </div>

        <div className={card}>
          <FaUsers className="text-3xl text-green-300 mb-4" />
          <h3 className="text-xl font-bold mb-2">Workforce Development</h3>
          <p className="text-slate-300">
            Programs can teach AI, automation, analytics, and digital finance using
            a real interactive platform instead of static lessons.
          </p>
        </div>

        <div className={card}>
          <FaBuilding className="text-3xl text-purple-300 mb-4" />
          <h3 className="text-xl font-bold mb-2">Small Business Support</h3>
          <p className="text-slate-300">
            Small businesses gain exposure to dashboards, reporting, automation,
            and decision-making tools that improve digital readiness.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="rounded-3xl bg-slate-900/50 border border-white/10 p-8 md:p-12 backdrop-blur-sm">
          <h2 className="text-3xl font-extrabold text-center mb-10 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            How the Platform Helps Organizations Serve People Better
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <Feature
              icon={<FaRobot />}
              title="Safe Automation Training"
              text="Users can explore AI-assisted strategy tools in a controlled simulation environment."
            />
            <Feature
              icon={<FaChartLine />}
              title="Measurable Outcomes"
              text="Dashboards help programs track participation, engagement, progress, and activity."
            />
            <Feature
              icon={<FaShieldAlt />}
              title="No-Risk Learning"
              text="Paper trading mode allows learning and experimentation without live capital exposure."
            />
            <Feature
              icon={<FaUsers />}
              title="Program Management"
              text="Admins can manage users, view activity, monitor performance, and support participants."
            />
          </div>
        </div>
      </section>

      {/* Product Overview */}
      <section className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-3xl font-extrabold mb-4 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Built as a Standing Product, Not Just an Event Demo
          </h2>

          <p className="text-slate-300 mb-6">
            This enterprise track can remain active after the event as a separate
            offering for counties, schools, nonprofits, workforce programs, and
            business development organizations.
          </p>

          <ul className="space-y-3 text-slate-200">
            <Bullet text="Separate landing page for organization buyers" />
            <Bullet text="Shared IMALI backend and dashboard infrastructure" />
            <Bullet text="Demo mode using paper trading and sample data" />
            <Bullet text="Future path for dedicated organization admin portals" />
            <Bullet text="Potential pilot, licensing, or managed-service model" />
          </ul>

          <div className="mt-8">
            <a
              href={`mailto:${ENTERPRISE_EMAIL}?subject=Enterprise%20Pilot%20Inquiry&body=I%27d%20like%20to%20discuss%20IMALI%20Enterprise%20for%20our%20organization.`}
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition font-medium"
            >
              Contact our enterprise team <FaArrowRight />
            </a>
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 p-8 backdrop-blur-sm">
          <h3 className="text-2xl font-bold mb-4 text-center">Pilot Program Structure</h3>

          <div className="space-y-5">
            <Step number="1" title="Launch Demo Environment" text="Use simulation mode and existing dashboards." />
            <Step number="2" title="Enroll Participants" text="Residents, students, entrepreneurs, or program members." />
            <Step number="3" title="Track Engagement" text="Monitor usage, strategy choices, activity, and progress." />
            <Step number="4" title="Report Outcomes" text="Provide county or organization leaders with clear results." />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="rounded-3xl bg-gradient-to-r from-blue-600/10 to-cyan-600/10 border border-white/10 p-12">
          <h2 className="text-3xl font-extrabold">
            Bring AI, Automation, and Financial Education to Your Community
          </h2>

          <p className="mt-4 text-slate-300 max-w-2xl mx-auto">
            IMALI Enterprise gives organizations a safe way to introduce modern
            financial technology, automation, and analytics to the people they serve.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`mailto:${ENTERPRISE_EMAIL}?subject=Enterprise%20Pilot%20Request&body=I%27m%20interested%20in%20starting%20a%20pilot%20program%20with%20IMALI%20Enterprise.`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-4 font-bold hover:from-blue-700 hover:to-cyan-700 transition shadow-lg"
            >
              Start a Pilot Conversation <FaArrowRight />
            </a>

            <Link
              to="/trade-demo"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-8 py-4 font-bold hover:bg-white/10 transition"
            >
              Try Demo First <FaPlayCircle />
            </Link>
          </div>

          <p className="mt-6 text-sm text-slate-400">
            📧 Or email us directly at{" "}
            <a href={`mailto:${ENTERPRISE_EMAIL}`} className="text-blue-400 hover:text-blue-300">
              {ENTERPRISE_EMAIL}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="flex gap-4 rounded-2xl bg-white/5 border border-white/10 p-5 hover:bg-white/10 transition">
      <div className="text-2xl text-blue-300 mt-1">{icon}</div>
      <div>
        <h4 className="font-bold text-lg">{title}</h4>
        <p className="text-slate-300 mt-1">{text}</p>
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
      <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center font-bold shrink-0 shadow-lg">
        {number}
      </div>
      <div>
        <h4 className="font-bold">{title}</h4>
        <p className="text-slate-300 text-sm">{text}</p>
      </div>
    </div>
  );
}