// src/pages/AdminPlatformLanding.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FaCheck, FaArrowRight, FaCubes, FaUsers, FaBuilding, FaChartLine, FaCreditCard, FaGift, FaUserPlus, FaEnvelope, FaNewspaper, FaShareAlt, FaShieldAlt, FaServer, FaRobot, FaStar } from "react-icons/fa";
import nftAdminBot from "../assets/images/nfts/nft-admin-bot.png";

const AdminPlatformLanding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(true);
  const videoId = "x6Dvj1ALs-w";

  const features = [
    { icon: <FaUsers className="text-purple-400" />, title: "User Management", desc: "Manage users, roles, permissions, and organizations with ease." },
    { icon: <FaBuilding className="text-blue-400" />, title: "Organizations", desc: "Multi-tenant support with complete organization management." },
    { icon: <FaChartLine className="text-emerald-400" />, title: "Reports & Analytics", desc: "Real-time dashboards, custom reports, and data visualizations." },
    { icon: <FaCreditCard className="text-cyan-400" />, title: "Billing", desc: "Stripe integration with plans, invoices, and payment management." },
    { icon: <FaGift className="text-pink-400" />, title: "Promo Codes", desc: "Create and manage promotional codes and discounts." },
    { icon: <FaUserPlus className="text-indigo-400" />, title: "Referral Program", desc: "Track referrals and reward your users for growth." },
    { icon: <FaEnvelope className="text-red-400" />, title: "Email Automation", desc: "Automated email campaigns, templates, and subscriber management." },
    { icon: <FaNewspaper className="text-amber-400" />, title: "Newsletter", desc: "Build and send newsletters to your user base." },
    { icon: <FaShareAlt className="text-teal-400" />, title: "Social Manager", desc: "Connect and manage social accounts from one dashboard." },
    { icon: <FaShieldAlt className="text-purple-400" />, title: "Permissions & Audit", desc: "Granular permissions, audit logs, and enterprise-grade security." },
    { icon: <FaServer className="text-orange-400" />, title: "System Health", desc: "Monitor uptime, performance, and system status in real time." },
    { icon: <FaBuilding className="text-indigo-400" />, title: "Enterprise Management", desc: "Complete enterprise tools including SSO, branding, and team management." },
  ];

  const plans = [
    {
      id: "professional",
      name: "Professional",
      price: "$49",
      period: "/ month",
      features: ["Up to 10 users", "5 organizations", "Basic analytics", "Email support", "API access"],
      popular: false,
      color: "from-purple-600/20 to-blue-500/10",
      buttonColor: "from-purple-600 to-blue-600",
    },
    {
      id: "business",
      name: "Business",
      price: "$99",
      period: "/ month",
      features: ["Up to 50 users", "25 organizations", "Advanced analytics", "Priority support", "API + webhooks", "Audit logs"],
      popular: true,
      color: "from-indigo-600/20 to-purple-500/10",
      buttonColor: "from-indigo-600 to-purple-600",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "Custom",
      period: "",
      features: ["Unlimited users", "Unlimited organizations", "Custom analytics", "24/7 dedicated support", "SSO & SAML", "On-premise option"],
      popular: false,
      color: "from-amber-600/20 to-orange-500/10",
      buttonColor: "from-amber-600 to-orange-600",
    },
  ];

  const faqs = [
    { q: "What's included in the free trial?", a: "You get full access to the Professional plan for 14 days. No credit card required." },
    { q: "Can I switch plans later?", a: "Yes, you can upgrade or downgrade at any time. Changes take effect immediately." },
    { q: "Is there a setup fee?", a: "No setup fees. All plans include free onboarding and migration assistance." },
    { q: "Do you offer a white-label option?", a: "Yes, Enterprise plans include full white-labeling and custom branding." },
    { q: "What kind of support do you offer?", a: "Email support for Professional, priority for Business, and 24/7 dedicated for Enterprise." },
    { q: "Can I use this with my existing app?", a: "Yes! Our REST API and webhooks make it easy to integrate with any existing application." },
  ];

  const testimonials = [
    { name: "Sarah Chen", role: "CTO, TechFlow Inc", text: "The Admin Platform saved us months of development time. We were able to launch our SaaS product in days instead of months.", rating: 5 },
    { name: "Michael Rodriguez", role: "CEO, DataVault", text: "The user management and billing features alone are worth the price. Our team loves how intuitive everything is.", rating: 5 },
    { name: "Emily Watson", role: "Product Manager, CloudSync", text: "We evaluated several admin panel solutions and this one was by far the most complete and well-designed.", rating: 5 },
  ];

  const handleSignup = (planId) => {
    if (planId === "enterprise") {
      window.location.href = "mailto:imalidefi@gmail.com";
      return;
    }
    navigate(`/admin-platform/signup?plan=${planId}&product_type=admin`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-white/5 px-6 h-16 flex items-center justify-between">
        <Link to="/admin-platform" className="text-xl font-bold flex items-center gap-2">
          <FaCubes className="text-purple-500" />
          Admin<span className="text-purple-500">Platform</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link to="/admin-platform#features" className="text-sm text-white/60 hover:text-white transition">Features</Link>
          <Link to="/admin-platform#pricing" className="text-sm text-white/60 hover:text-white transition">Pricing</Link>
          <Link to="/admin-platform/demo" className="text-sm text-white/60 hover:text-white transition">Demo</Link>
          <Link to="/docs" className="text-sm text-white/60 hover:text-white transition">Docs</Link>
          {user ? (
            <Link to="/admin/dashboard" className="px-4 py-2 bg-purple-600 rounded-lg text-sm font-semibold hover:bg-purple-500 transition">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/admin-platform/login" className="text-sm text-white/60 hover:text-white transition">Log In</Link>
              <Link to="/admin-platform/signup" className="px-4 py-2 bg-purple-600 rounded-lg text-sm font-semibold hover:bg-purple-500 transition">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-6">
            <FaRobot className="inline mr-2" /> Launch ready — use it today
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight bg-gradient-to-r from-white via-purple-300 to-purple-600 bg-clip-text text-transparent">
            Everything you need in an admin panel.<br />Already built.
          </h1>
          <p className="text-xl text-white/60 mt-6 max-w-2xl mx-auto">
            Full-featured admin platform with user management, billing, analytics, and more. Stop building from scratch.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Link to="/admin-platform/signup" className="px-8 py-3.5 bg-purple-600 rounded-xl font-semibold hover:bg-purple-500 transition flex items-center gap-2">
              <FaArrowRight /> Get Started Free
            </Link>
            <Link to="/admin-platform/demo" className="px-8 py-3.5 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 transition flex items-center gap-2">
              <FaRobot /> See Demo
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-white/40">
            <span>✓ 14-day free trial</span>
            <span>✓ No credit card required</span>
            <span>✓ Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="mx-auto max-w-4xl px-4 py-8">
        <div className="relative overflow-hidden rounded-2xl bg-black shadow-xl">
          <div className="relative pt-[56.25%]">
            <iframe
              className="absolute left-0 top-0 h-full w-full"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=0&loop=1&mute=${isMuted ? 1 : 0}&controls=1&modestbranding=1&rel=0&playsinline=1&playlist=${videoId}`}
              title="Admin Platform Demo"
              frameBorder="0"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <button onClick={() => setIsMuted((prev) => !prev)} className="absolute bottom-4 right-4 rounded-full bg-black/70 px-3 py-2 text-white backdrop-blur-sm text-sm">
            {isMuted ? "🔇" : "🔊"}
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 max-w-6xl mx-auto" id="features">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Everything you need</h2>
          <p className="text-white/60 mt-4">A complete admin panel with all the tools to manage your business.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition">
              <div className="text-2xl mb-4">{f.icon}</div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-white/60">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Screenshot Preview */}
      <section className="py-16 px-6 max-w-6xl mx-auto">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <img src={nftAdminBot} alt="Admin Platform Dashboard Preview" className="w-48 h-48 mx-auto mb-6 rounded-2xl object-cover shadow-lg ring-2 ring-purple-500/20" />
          <h3 className="text-2xl font-bold mb-4">Admin Dashboard Preview</h3>
          <p className="text-white/60 mb-6 max-w-2xl mx-auto">Clean, modern dashboard with user management, analytics, billing, and more.</p>
          <Link to="/admin-platform/demo" className="px-6 py-3 bg-purple-600 rounded-xl font-semibold hover:bg-purple-500 transition inline-flex items-center gap-2">
            <FaRobot /> Launch Demo
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-6 max-w-6xl mx-auto" id="pricing">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Choose your plan</h2>
          <p className="text-white/60 mt-4">Start free, scale as you grow. No hidden fees.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className={`bg-white/5 border rounded-2xl p-8 text-center ${plan.popular ? 'border-purple-500 bg-purple-500/5' : 'border-white/10'}`}>
              {plan.popular && (
                <div className="inline-block px-3 py-1 bg-purple-600 rounded-full text-xs font-semibold mb-4">
                  <FaStar className="inline mr-1" /> Most Popular
                </div>
              )}
              <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
              <div className="text-4xl font-bold mb-2">{plan.price}</div>
              <div className="text-sm text-white/60 mb-6">{plan.period}</div>
              <ul className="text-left space-y-2 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white/80">
                    <FaCheck className="text-purple-400" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSignup(plan.id)}
                className={`w-full py-3 rounded-xl font-semibold transition ${
                  plan.popular 
                    ? 'bg-purple-600 hover:bg-purple-500' 
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {plan.id === 'enterprise' ? 'Contact Sales' : 'Start Free Trial'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Loved by developers</h2>
          <p className="text-white/60 mt-4">See what our users are saying about Admin Platform</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex text-amber-400 mb-3">
                {[...Array(t.rating)].map((_, j) => (
                  <FaStar key={j} className="text-xs" />
                ))}
              </div>
              <p className="text-sm text-white/80 mb-4">"{t.text}"</p>
              <div>
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-white/40">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-4">
          {faqs.map((item, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="font-semibold mb-2">{item.q}</h3>
              <p className="text-white/60 text-sm">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-6 text-center">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/20 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to launch your admin platform?</h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">Get started today with a 14-day free trial. No credit card required.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/admin-platform/signup" className="px-8 py-3.5 bg-purple-600 rounded-xl font-semibold hover:bg-purple-500 transition flex items-center gap-2">
              <FaArrowRight /> Start Free Trial
            </Link>
            <Link to="/admin-platform/demo" className="px-8 py-3.5 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 transition flex items-center gap-2">
              <FaRobot /> View Demo
            </Link>
          </div>
          <p className="mt-4 text-sm text-white/40">14-day free trial • No credit card • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6 text-center text-sm text-white/40">
        <div className="flex flex-wrap justify-center gap-6 mb-4">
          <Link to="/admin-platform" className="hover:text-white transition">Home</Link>
          <Link to="/admin-platform#features" className="hover:text-white transition">Features</Link>
          <Link to="/admin-platform#pricing" className="hover:text-white transition">Pricing</Link>
          <Link to="/admin-platform/demo" className="hover:text-white transition">Demo</Link>
          <Link to="/docs" className="hover:text-white transition">Documentation</Link>
          <Link to="/admin-platform/login" className="hover:text-white transition">Log In</Link>
        </div>
        <p>&copy; 2026 Admin Platform. Built for developers.</p>
      </footer>
    </div>
  );
};

export default AdminPlatformLanding;
