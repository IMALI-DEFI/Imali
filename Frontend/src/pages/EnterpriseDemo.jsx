// src/pages/Enterprise.jsx
import React from "react";
import { Link } from "react-router-dom";
import {
  FaRobot,
  FaChartLine,
  FaShieldAlt,
  FaDatabase,
  FaUsers,
  FaCogs,
  FaArrowRight,
  FaCity,
  FaHospital,
  FaNetworkWired,
} from "react-icons/fa";

export default function Enterprise() {
  const capabilities = [
    {
      icon: <FaRobot />,
      title: "AI-Driven Automation",
      text: "Automation systems designed to reduce manual workflows and improve operational efficiency.",
    },
    {
      icon: <FaChartLine />,
      title: "Predictive Analytics",
      text: "Real-time analytics and forecasting tools for monitoring trends and operational performance.",
    },
    {
      icon: <FaDatabase />,
      title: "Centralized Dashboards",
      text: "Unified dashboards that improve visibility across systems, departments, and operations.",
    },
    {
      icon: <FaShieldAlt />,
      title: "Risk Monitoring",
      text: "Monitoring systems that support oversight, alerting, and operational awareness.",
    },
    {
      icon: <FaUsers />,
      title: "User & Access Management",
      text: "Role-based systems for permissions, reporting, administration, and oversight.",
    },
    {
      icon: <FaNetworkWired />,
      title: "System Integrations",
      text: "API-driven infrastructure capable of connecting multiple platforms and data sources.",
    },
  ];

  const adaptations = [
    {
      icon: <FaHospital />,
      title: "Health & Human Services",
      text: "Predictive analytics, workflow automation, and centralized dashboards can help improve operational coordination and visibility across services.",
    },
    {
      icon: <FaCity />,
      title: "Redevelopment & Planning",
      text: "Real-time dashboards and analytics systems can support redevelopment tracking, reporting, and data-driven prioritization.",
    },
    {
      icon: <FaCogs />,
      title: "Operational Modernization",
      text: "Automation infrastructure can streamline repetitive processes, improve reporting, and reduce operational fragmentation.",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* ================= HERO ================= */}
      <section className="relative border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent"></div>

        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* LEFT */}
            <div>
              <div className="inline-flex items-center px-4 py-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 text-sm mb-6">
                Enterprise Infrastructure & AI Solutions
              </div>

              <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
                AI Infrastructure
                <span className="block text-cyan-400">
                  Built For Operational Intelligence
                </span>
              </h1>

              <p className="mt-6 text-lg text-gray-300 leading-relaxed">
                IMALI began as an AI-driven financial automation platform,
                but the underlying infrastructure and analytics systems can
                also be adapted for enterprise and public-sector operational
                modernization.
              </p>

              <p className="mt-6 text-gray-400 leading-relaxed">
                The infrastructure behind IMALI demonstrates how AI-driven
                automation, analytics, and operational dashboards can be
                adapted to solve broader organizational challenges involving
                monitoring, workflow coordination, predictive analytics,
                reporting, and real-time operational visibility.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to="/signup"
                  className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition"
                >
                  Request Demo
                  <FaArrowRight className="group-hover:translate-x-1 transition" />
                </Link>

                <Link
                  to="/contact"
                  className="px-8 py-4 rounded-xl border border-white/20 hover:border-cyan-400 hover:text-cyan-300 transition"
                >
                  Contact Team
                </Link>
              </div>

              {/* STATS */}
              <div className="grid grid-cols-3 gap-4 mt-14">
                <div className="bg-gray-900/70 border border-white/10 rounded-2xl p-5 text-center">
                  <h3 className="text-2xl font-bold text-cyan-400">
                    AI
                  </h3>
                  <p className="text-sm text-gray-400 mt-2">
                    Automation
                  </p>
                </div>

                <div className="bg-gray-900/70 border border-white/10 rounded-2xl p-5 text-center">
                  <h3 className="text-2xl font-bold text-cyan-400">
                    Real-Time
                  </h3>
                  <p className="text-sm text-gray-400 mt-2">
                    Monitoring
                  </p>
                </div>

                <div className="bg-gray-900/70 border border-white/10 rounded-2xl p-5 text-center">
                  <h3 className="text-2xl font-bold text-cyan-400">
                    API
                  </h3>
                  <p className="text-sm text-gray-400 mt-2">
                    Infrastructure
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT IMAGE */}
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

      {/* ================= WHY TRADING ================= */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <div className="inline-flex px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-sm mb-6">
            Infrastructure & Adaptability
          </div>

          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            Why Trading Is
            <span className="block text-cyan-400">
              A Strong Technology Case Study
            </span>
          </h2>

          <p className="mt-6 text-lg text-gray-400 max-w-5xl mx-auto leading-relaxed">
            Trading systems require real-time monitoring, analytics,
            automation, predictive decision support, workflow coordination,
            reporting, and risk management. These are many of the same
            technical capabilities required in modern enterprise and
            public-sector environments.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">

          <div className="bg-gray-900/60 border border-white/10 rounded-3xl p-10">
            <h3 className="text-3xl font-bold text-cyan-400">
              Core Infrastructure Built Through IMALI
            </h3>

            <ul className="mt-8 space-y-5 text-gray-300">
              <li>• Real-time monitoring and alert systems</li>
              <li>• Predictive analytics and AI-assisted decision support</li>
              <li>• Workflow automation and event processing</li>
              <li>• Centralized dashboards and analytics reporting</li>
              <li>• User permissions and administration systems</li>
              <li>• API integrations across multiple services</li>
              <li>• Operational oversight and monitoring infrastructure</li>
              <li>• Scalable cloud-based architecture</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-400/20 rounded-3xl p-10">
            <h3 className="text-3xl font-bold text-cyan-400">
              Why This Matters Beyond Finance
            </h3>

            <p className="text-gray-300 mt-6 leading-relaxed">
              The same infrastructure principles used to process financial
              data, monitor activity, automate workflows, and generate
              analytics can also be adapted for operational intelligence,
              modernization initiatives, and organizational reporting systems.
            </p>

            <p className="text-gray-400 mt-6 leading-relaxed">
              IMALI demonstrates the ability to build scalable systems capable
              of handling live data, automation workflows, centralized
              dashboards, reporting infrastructure, and AI-assisted monitoring
              across complex environments.
            </p>
          </div>
        </div>
      </section>

      {/* ================= ADAPTATIONS ================= */}
      <section className="bg-gray-950/50 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-24">

          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold">
              Potential Enterprise & Public-Sector Adaptations
            </h2>

            <p className="mt-5 text-gray-400 max-w-4xl mx-auto">
              The underlying architecture and infrastructure concepts behind
              IMALI can be adapted to support broader organizational and
              operational modernization initiatives.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {adaptations.map((item, index) => (
              <div
                key={index}
                className="bg-gray-900/60 border border-white/10 rounded-3xl p-8 hover:border-cyan-400/30 transition"
              >
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400 text-3xl">
                  {item.icon}
                </div>

                <h3 className="text-2xl font-bold mt-6">
                  {item.title}
                </h3>

                <p className="text-gray-400 mt-5 leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CAPABILITIES ================= */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold">
            Enterprise Technology Capabilities
          </h2>

          <p className="mt-5 text-gray-400 max-w-3xl mx-auto">
            Scalable infrastructure designed around automation, analytics,
            operational visibility, and AI-assisted monitoring.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {capabilities.map((feature, index) => (
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

      {/* ================= IMPLEMENTATION ================= */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-14">

          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl font-extrabold">
              Modern Infrastructure
              <span className="block text-cyan-400">
                Designed For Adaptability
              </span>
            </h2>

            <p className="mt-6 text-lg text-gray-300 leading-relaxed">
              IMALI demonstrates how modern AI-driven infrastructure can support
              automation, analytics, operational monitoring, and centralized
              reporting across complex systems and environments.
            </p>

            <p className="mt-6 text-gray-400 leading-relaxed">
              Our long-term vision is to continue building scalable,
              data-driven infrastructure capable of supporting broader
              enterprise and operational modernization initiatives.
            </p>

            <div className="mt-10">
              <Link
                to="/signup"
                className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 transition text-black font-bold text-lg"
              >
                Schedule A Demo
                <FaArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}