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
  FaHospital,
  FaCity,
  FaDatabase,
  FaUsers,
} from "react-icons/fa";

export default function Enterprise() {
  const features = [
    {
      icon: <FaRobot />,
      title: "AI Automation",
      text: "AI-driven automation tools for analytics, workflows, monitoring, and decision support.",
    },
    {
      icon: <FaChartLine />,
      title: "Predictive Analytics",
      text: "Advanced reporting and forecasting systems designed to improve operational visibility.",
    },
    {
      icon: <FaShieldAlt />,
      title: "Risk & Compliance",
      text: "Centralized controls, monitoring, and transparency for modern organizations.",
    },
    {
      icon: <FaExchangeAlt />,
      title: "Integrated Systems",
      text: "Connect multiple departments, platforms, and services into one dashboard.",
    },
    {
      icon: <FaCogs />,
      title: "Workflow Automation",
      text: "Reduce manual processes through automation and digital infrastructure.",
    },
    {
      icon: <FaDatabase />,
      title: "Data Infrastructure",
      text: "Real-time dashboards, reporting systems, and operational intelligence tools.",
    },
  ];

  const countySolutions = [
    {
      icon: <FaHospital />,
      title: "Health & Human Services",
      text: "Predictive analytics and centralized case management systems that help organizations identify high-risk populations, improve coordination, and increase operational efficiency.",
    },
    {
      icon: <FaCity />,
      title: "Redevelopment & Economic Planning",
      text: "Data-driven dashboards for redevelopment prioritization, vacancy tracking, project analytics, and transparency reporting.",
    },
    {
      icon: <FaUsers />,
      title: "Community & Citizen Engagement",
      text: "Digital engagement tools, automated communication systems, and public-facing dashboards that improve accessibility and transparency.",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* HERO */}
      <section className="relative border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent"></div>

        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* LEFT */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 text-sm mb-6">
                Enterprise Technology & AI Solutions
              </div>

              <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
                Modern Infrastructure
                <span className="block text-cyan-400">
                  For Public & Enterprise Systems
                </span>
              </h1>

              <p className="mt-6 text-lg text-gray-300 leading-relaxed">
                IMALI Enterprise delivers AI-driven automation, analytics,
                workflow modernization, and operational intelligence tools
                designed to help organizations improve efficiency,
                transparency, and scalability.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to="/signup"
                  className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition"
                >
                  Request Enterprise Demo
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
                  <h3 className="text-3xl font-bold text-cyan-400">AI</h3>
                  <p className="text-sm text-gray-400 mt-2">
                    Automation
                  </p>
                </div>

                <div className="bg-gray-900/70 border border-white/10 rounded-2xl p-5 text-center">
                  <h3 className="text-3xl font-bold text-cyan-400">24/7</h3>
                  <p className="text-sm text-gray-400 mt-2">
                    Monitoring
                  </p>
                </div>

                <div className="bg-gray-900/70 border border-white/10 rounded-2xl p-5 text-center">
                  <h3 className="text-3xl font-bold text-cyan-400">
                    Real-Time
                  </h3>
                  <p className="text-sm text-gray-400 mt-2">
                    Analytics
                  </p>
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

      {/* EVENT ALIGNMENT */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <div className="inline-flex px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-sm mb-6">
            County & Government Solution Alignment
          </div>

          <h2 className="text-4xl md:text-5xl font-bold">
            Solutions Designed Around
            <span className="block text-cyan-400">
              Modern Government Challenges
            </span>
          </h2>

          <p className="mt-6 text-gray-400 max-w-4xl mx-auto text-lg leading-relaxed">
            Our platform aligns with current public-sector technology priorities
            including predictive analytics, operational modernization,
            workflow automation, transparency, digital accessibility,
            and centralized data infrastructure.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {countySolutions.map((item, index) => (
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
      </section>

      {/* FEATURES */}
      <section className="bg-gray-950/50 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold">
              Enterprise Technology Capabilities
            </h2>

            <p className="mt-5 text-gray-400 max-w-3xl mx-auto">
              Scalable systems designed to improve efficiency, transparency,
              operational intelligence, and digital transformation efforts.
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
        </div>
      </section>

      {/* IMPLEMENTATION */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-10">

          <div className="bg-gray-900/60 border border-white/10 rounded-3xl p-10">
            <h2 className="text-4xl font-bold">
              Implementation Approach
            </h2>

            <p className="text-gray-400 mt-6 leading-relaxed">
              Our implementation model focuses on phased deployment,
              scalability, integration support, and operational continuity.
            </p>

            <ul className="mt-8 space-y-4 text-gray-300">
              <li>• Discovery & operational assessment</li>
              <li>• Platform integration planning</li>
              <li>• Dashboard & workflow customization</li>
              <li>• Staff onboarding & training</li>
              <li>• Analytics & reporting configuration</li>
              <li>• Ongoing optimization & support</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-400/20 rounded-3xl p-10">
            <h2 className="text-4xl font-bold">
              Strategic Vision
            </h2>

            <p className="text-gray-300 mt-6 leading-relaxed">
              We believe modern organizations require integrated digital
              systems that reduce fragmentation, improve access to information,
              and support faster, data-driven decision making.
            </p>

            <p className="text-gray-400 mt-6 leading-relaxed">
              Our long-term focus is building scalable AI-enabled infrastructure
              that helps organizations modernize operations while improving
              transparency, efficiency, and user experience.
            </p>

            <div className="mt-10">
              <Link
                to="/signup"
                className="inline-flex items-center gap-3 px-8 py-4 bg-cyan-500 hover:bg-cyan-400 transition rounded-xl text-black font-bold"
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