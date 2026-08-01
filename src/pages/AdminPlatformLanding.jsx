// src/pages/AdminPlatformLanding.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaCheck, FaArrowRight, FaCubes, FaUsers, FaBuilding, FaChartLine, 
  FaCreditCard, FaGift, FaUserPlus, FaEnvelope, FaNewspaper, 
  FaShareAlt, FaShieldAlt, FaServer, FaRobot, FaStar, FaCrown,
  FaRocket, FaCode, FaPlug, FaDatabase, FaLock, FaCloud, FaTerminal,
  FaArrowDown, FaPlay, FaHeart, FaTwitter, FaGithub, FaLinkedin,
  FaQuoteLeft, FaQuoteRight, FaClock, FaDollarSign, FaFileAlt,
  FaGlobe, FaLayerGroup, FaTools, FaCalendarCheck, FaBolt,
  FaInfinity, FaUserCheck, FaShieldVirus
} from "react-icons/fa";
import { HiSparkles } from "react-icons/hi";
import nftAdminBot from "../assets/images/nfts/nft-admin-bot.png";

// Glass Card Component
const GlassCard = ({ children, className = "", gradient = "from-white/5 to-white/5" }) => (
  <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${gradient} backdrop-blur-xl shadow-xl ${className}`}>
    <div className="absolute inset-0 bg-white/5" />
    <div className="relative z-10">{children}</div>
  </div>
);

// Pricing Card Component
const PricingCard = ({ plan, onSelect }) => {
  const isPopular = plan.popular;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: plan.delay || 0 }}
      viewport={{ once: true }}
      className={`relative rounded-2xl p-8 text-center ${
        isPopular 
          ? 'border-2 border-purple-500/30 bg-gradient-to-br from-purple-600/10 to-purple-900/10 shadow-xl shadow-purple-500/10' 
          : 'border border-white/10 bg-white/5'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full text-xs font-bold text-white shadow-lg shadow-purple-500/30">
            <FaStar className="text-yellow-300" /> Most Popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
        <div className="mt-3">
          <span className="text-4xl font-bold text-white">{plan.price}</span>
          {plan.period && <span className="text-white/50 text-sm ml-1">{plan.period}</span>}
        </div>
        <p className="text-sm text-white/50 mt-1">{plan.description}</p>
      </div>

      <ul className="text-left space-y-2.5 mb-8">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2.5 text-sm text-white/70">
            <FaCheck className="text-purple-400 mt-0.5 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan.id)}
        className={`w-full py-3.5 rounded-xl font-semibold transition-all duration-300 ${
          isPopular
            ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02]'
            : 'bg-white/10 text-white hover:bg-white/20 hover:scale-[1.02]'
        }`}
      >
        {plan.id === 'enterprise' ? 'Contact Sales' : 'Start Free Trial'}
        {plan.id !== 'enterprise' && <FaArrowRight className="inline ml-2 text-xs" />}
      </button>
    </motion.div>
  );
};

// FAQ Item Component
const FAQItem = ({ question, answer, isOpen, onClick }) => (
  <motion.div 
    className="border-b border-white/5 last:border-0 py-4"
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    viewport={{ once: true }}
  >
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full text-left group"
    >
      <span className="text-white font-medium group-hover:text-purple-400 transition">{question}</span>
      <span className={`text-white/50 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
        <FaArrowDown className="text-xs" />
      </span>
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <p className="pt-3 text-sm text-white/50">{answer}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

// Feature Card
const FeatureCard = ({ icon, title, desc, problem, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true }}
    className="group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-white/5 to-white/0 p-6 hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/5 group-hover:to-purple-500/5 transition-all duration-500" />
    <div className="relative z-10">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="font-semibold text-white text-lg mb-1">{title}</h3>
      <p className="text-sm text-white/50">{desc}</p>
      <p className="text-xs text-purple-400/60 mt-2">✓ {problem}</p>
    </div>
  </motion.div>
);

// Tech Badge
const TechBadge = ({ name, icon }) => (
  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:border-purple-500/30 transition">
    <span className="text-lg">{icon}</span>
    <span className="text-sm text-white/70">{name}</span>
  </div>
);

// Pricing Comparison Table
const PricingComparison = ({ plans }) => {
  const allFeatures = [
    { key: "users", label: "User Management" },
    { key: "orgs", label: "Organizations" },
    { key: "billing", label: "Billing & Payments" },
    { key: "analytics", label: "Analytics & Reports" },
    { key: "email", label: "Email Automation" },
    { key: "api", label: "REST API" },
    { key: "webhooks", label: "Webhooks" },
    { key: "whiteLabel", label: "White Label" },
    { key: "sso", label: "SSO / SAML" },
    { key: "support", label: "24/7 Support" },
  ];

  const planFeatures = {
    professional: { users: true, orgs: true, billing: true, analytics: true, email: false, api: true, webhooks: false, whiteLabel: false, sso: false, support: false },
    business: { users: true, orgs: true, billing: true, analytics: true, email: true, api: true, webhooks: true, whiteLabel: false, sso: false, support: "Priority" },
    enterprise: { users: true, orgs: true, billing: true, analytics: true, email: true, api: true, webhooks: true, whiteLabel: true, sso: true, support: "Dedicated" },
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 text-white/40 font-medium">Feature</th>
            {plans.map((plan) => (
              <th key={plan.id} className="text-center py-3 font-medium text-white">
                {plan.name}
                {plan.popular && <span className="block text-[10px] text-purple-400">★ Popular</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {allFeatures.map((feature) => (
            <tr key={feature.key} className="hover:bg-white/5 transition">
              <td className="py-3 text-white/60">{feature.label}</td>
              {plans.map((plan) => {
                const value = planFeatures[plan.id]?.[feature.key];
                return (
                  <td key={plan.id} className="text-center py-3">
                    {value === true && <FaCheck className="text-emerald-400 mx-auto" />}
                    {value === false && <span className="text-white/20">—</span>}
                    {typeof value === 'string' && <span className="text-xs text-amber-400">{value}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ROI Calculator
const ROISection = () => {
  const tasks = [
    { name: "Authentication", weeks: 2 },
    { name: "Billing Integration", weeks: 2 },
    { name: "User Management", weeks: 3 },
    { name: "Admin Dashboard", weeks: 2 },
    { name: "Email System", weeks: 1 },
    { name: "Analytics", weeks: 2 },
    { name: "Permissions", weeks: 2 },
  ];

  const totalWeeks = tasks.reduce((sum, t) => sum + t.weeks, 0);

  return (
    <GlassCard className="p-6 border-emerald-500/20" gradient="from-emerald-500/10 to-cyan-500/10">
      <div className="flex flex-col lg:flex-row items-center gap-8">
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-white mb-4">What does this save you?</h3>
          <div className="space-y-3">
            {tasks.map((task, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-white/60">{task.name}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 rounded-full" style={{ width: `${(task.weeks / totalWeeks) * 100}%` }} />
                  </div>
                  <span className="text-xs text-white/40">{task.weeks} weeks</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-center lg:text-left">
          <div className="text-6xl font-bold text-emerald-400">{totalWeeks}+</div>
          <div className="text-sm text-white/40">weeks of development</div>
          <div className="mt-2 text-xs text-white/30">vs.</div>
          <div className="text-3xl font-bold text-purple-400">Deploy Today</div>
          <div className="mt-4 px-6 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-sm inline-block">
            Save 3+ months of engineering
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

// Email Capture Section
const EmailCapture = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 700));
      setSubmitted(true);
      setEmail("");
    } catch (err) {
      console.error("Email capture failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className="p-6 border-purple-500/20" gradient="from-purple-500/10 to-blue-500/10">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white">Get the Admin Platform Roadmap</h3>
        <p className="text-sm text-white/50 mt-2">Be the first to know about new features and updates.</p>
        {submitted ? (
          <div className="mt-4 flex items-center justify-center gap-2 text-emerald-400">
            <FaCheck /> You're on the list! 🎉
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition disabled:opacity-50"
            >
              {loading ? "Sending..." : "Notify Me"}
            </button>
          </form>
        )}
        <p className="text-xs text-white/30 mt-2">No spam. Unsubscribe anytime.</p>
      </div>
    </GlassCard>
  );
};

const AdminPlatformLanding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyCta(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    { icon: <FaUsers className="text-purple-400" />, title: "User Management", desc: "Complete user lifecycle management with roles, permissions, and organizations.", problem: "Stop building user management from scratch" },
    { icon: <FaBuilding className="text-blue-400" />, title: "Multi-Tenant Organizations", desc: "Full organization management with member roles, permissions, and billing.", problem: "Launch multi-tenant SaaS instantly" },
    { icon: <FaChartLine className="text-emerald-400" />, title: "Real-Time Analytics", desc: "Live dashboards, custom reports, and actionable data visualizations.", problem: "Get insights without building dashboards" },
    { icon: <FaCreditCard className="text-cyan-400" />, title: "Billing & Payments", desc: "Stripe integration with plans, invoices, and subscription management.", problem: "Stripe subscriptions already integrated" },
    { icon: <FaGift className="text-pink-400" />, title: "Promo Codes", desc: "Create and manage promotional codes, discounts, and special offers.", problem: "Drive growth with built-in promotions" },
    { icon: <FaUserPlus className="text-indigo-400" />, title: "Referral Program", desc: "Track referrals, reward users, and grow your platform organically.", problem: "Turn users into advocates automatically" },
    { icon: <FaEnvelope className="text-red-400" />, title: "Email Automation", desc: "Automated campaigns, templates, and subscriber management.", problem: "Email marketing without third-party tools" },
    { icon: <FaNewspaper className="text-amber-400" />, title: "Newsletter System", desc: "Build and send newsletters to your entire user base.", problem: "Engage users with built-in newsletters" },
    { icon: <FaShareAlt className="text-teal-400" />, title: "Social Media Manager", desc: "Connect and manage all social accounts from one dashboard.", problem: "Manage social media without extra tools" },
    { icon: <FaShieldAlt className="text-purple-400" />, title: "Security & Audit", desc: "Granular permissions, audit logs, and enterprise-grade security.", problem: "Enterprise security out of the box" },
    { icon: <FaServer className="text-orange-400" />, title: "System Health", desc: "Real-time uptime monitoring, performance metrics, and alerts.", problem: "Monitor your platform proactively" },
    { icon: <FaLock className="text-indigo-400" />, title: "Enterprise SSO", desc: "SAML, SSO, and enterprise-grade authentication built in.", problem: "Enterprise authentication without custom code" },
  ];

  const techStack = [
    { name: "React", icon: "⚛️" },
    { name: "Node.js", icon: "🟢" },
    { name: "PostgreSQL", icon: "🐘" },
    { name: "Stripe", icon: "💳" },
    { name: "JWT", icon: "🔐" },
    { name: "REST API", icon: "🔗" },
    { name: "Webhooks", icon: "📡" },
    { name: "Docker", icon: "🐳" },
  ];

  const plans = [
    {
      id: "professional",
      name: "Professional",
      price: "$49",
      period: "/month",
      description: "Perfect for small teams and startups",
      features: [
        "Up to 10 users",
        "5 organizations",
        "Basic analytics",
        "Email support",
        "REST API access",
        "User management"
      ],
      popular: false,
      delay: 0,
    },
    {
      id: "business",
      name: "Business",
      price: "$99",
      period: "/month",
      description: "For growing teams with advanced needs",
      features: [
        "Up to 50 users",
        "25 organizations",
        "Advanced analytics",
        "Priority support",
        "API + Webhooks",
        "Audit logs",
        "Marketing tools"
      ],
      popular: true,
      delay: 0.1,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large organizations with custom requirements",
      features: [
        "Unlimited users",
        "Unlimited organizations",
        "Custom analytics",
        "24/7 dedicated support",
        "SSO & SAML",
        "On-premise option",
        "White-label branding"
      ],
      popular: false,
      delay: 0.2,
    },
  ];

  const faqs = [
    { q: "What's included in the free trial?", a: "You get full access to the Professional plan for 14 days. No credit card required and no commitment." },
    { q: "Can I switch plans later?", a: "Yes, you can upgrade or downgrade at any time. Changes take effect immediately and are prorated." },
    { q: "Is there a setup fee?", a: "No setup fees. All plans include free onboarding, migration assistance, and dedicated support." },
    { q: "Do you offer a white-label option?", a: "Yes, Enterprise plans include full white-labeling, custom branding, and custom domain support." },
    { q: "What kind of support do you offer?", a: "Email support for Professional, priority support for Business, and 24/7 dedicated support for Enterprise." },
    { q: "Can I use this with my existing app?", a: "Yes! Our REST API, webhooks, and SDKs make it easy to integrate with any existing application." },
    { q: "Is my data secure?", a: "We use enterprise-grade encryption, SOC2 compliance, and regular security audits to keep your data safe." },
    { q: "Do you offer custom development?", a: "Yes, our Enterprise plan includes custom development services and dedicated engineering support." },
  ];

  const handleSignup = (planId) => {
    if (planId === "enterprise") {
      window.location.href = "mailto:imalidefi@gmail.com";
      return;
    }
    navigate(`/admin-platform/signup?plan=${planId}&product_type=admin`);
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white overflow-hidden">
      
      {/* Sticky CTA */}
      <AnimatePresence>
        {showStickyCta && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-16 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-white/5 px-6 py-3 flex items-center justify-between"
          >
            <div className="hidden md:block">
              <p className="text-sm font-semibold">Launch your SaaS in 10 minutes</p>
              <p className="text-xs text-white/40">14-day free trial • No credit card</p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <Link to="/admin-platform/signup" className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition flex items-center gap-2">
                <FaRocket className="text-xs" /> Start Free Trial
              </Link>
              <Link to="/admin-platform/demo" className="px-6 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition">
                View Demo
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient Glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-6 h-16 flex items-center justify-between">
        <Link to="/admin-platform" className="text-xl font-bold flex items-center gap-2 text-white">
          <FaCubes className="text-purple-500" />
          <span className="bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">Admin<span className="text-purple-500">Platform</span></span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <button onClick={() => scrollToSection('features')} className="text-sm text-white/60 hover:text-white transition">Features</button>
          <button onClick={() => scrollToSection('pricing')} className="text-sm text-white/60 hover:text-white transition">Pricing</button>
          <Link to="/admin-platform/demo" className="text-sm text-white/60 hover:text-white transition">Demo</Link>
          <Link to="/docs" className="text-sm text-white/60 hover:text-white transition">Docs</Link>
          <button onClick={() => scrollToSection('roi')} className="text-sm text-white/60 hover:text-white transition">Why Us</button>
          {user ? (
            <Link to="/admin/dashboard" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/admin-platform/login" className="text-sm text-white/60 hover:text-white transition">Log In</Link>
              <Link to="/admin-platform/signup" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition">
                Get Started <FaArrowRight className="inline ml-1 text-xs" />
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-6 text-center overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-block px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-6">
              <FaBolt className="inline mr-2" /> Launch your SaaS with months of backend work already finished
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold leading-tight"
          >
            Skip building your
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-blue-400 bg-clip-text text-transparent">admin panel.</span>
            <br />
            <span className="text-white">Start shipping your product today.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-white/60 mt-6 max-w-2xl mx-auto"
          >
            User management, billing, analytics, organizations, email, referrals, dashboards, 
            marketing, security, and APIs — already built and ready to use.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4 mt-8"
          >
            <Link to="/admin-platform/signup" className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 flex items-center gap-2 hover:scale-[1.02]">
              <FaArrowRight /> Start Free Trial
            </Link>
            <Link to="/admin-platform/demo" className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300 flex items-center gap-2 hover:scale-[1.02]">
              <FaPlay /> Watch Demo
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-white/40"
          >
            <span className="flex items-center gap-1.5"><FaCheck className="text-purple-400 text-xs" /> 14-day free trial</span>
            <span className="flex items-center gap-1.5"><FaCheck className="text-purple-400 text-xs" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><FaCheck className="text-purple-400 text-xs" /> Cancel anytime</span>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 px-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl mb-2">📦</div>
            <div className="text-2xl font-bold text-white">40+</div>
            <div className="text-sm text-white/50">Admin Pages</div>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🔌</div>
            <div className="text-2xl font-bold text-white">20+</div>
            <div className="text-sm text-white/50">Integrations</div>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">💳</div>
            <div className="text-2xl font-bold text-white">Stripe</div>
            <div className="text-sm text-white/50">Ready</div>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🔐</div>
            <div className="text-2xl font-bold text-white">Enterprise</div>
            <div className="text-sm text-white/50">Security</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 max-w-6xl mx-auto" id="features">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold">
            Everything you <span className="text-purple-400">need</span>
          </h2>
          <p className="text-white/60 mt-4 max-w-2xl mx-auto">
            A complete admin panel with all the tools to manage your business efficiently.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <FeatureCard key={idx} {...feature} delay={idx * 0.05} />
          ))}
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-16 px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-bold">Built for <span className="text-purple-400">developers</span></h2>
          <p className="text-white/60 mt-2">Modern tech stack you already know and love</p>
        </motion.div>
        <div className="flex flex-wrap justify-center gap-3">
          {techStack.map((tech) => (
            <TechBadge key={tech.name} {...tech} />
          ))}
        </div>
      </section>

      {/* ROI Section */}
      <section className="py-16 px-6 max-w-5xl mx-auto" id="roi">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-bold">What does this <span className="text-purple-400">save you</span>?</h2>
          <p className="text-white/60 mt-2">Stop rebuilding the same features over and over</p>
        </motion.div>
        <ROISection />
      </section>

      {/* Demo Preview */}
      <section className="py-16 px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-purple-600/5 to-blue-600/5 backdrop-blur-xl p-8 md:p-12 text-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5" />
          <div className="relative z-10">
            <div className="flex justify-center mb-4">
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-purple-500/20">
                <img src={nftAdminBot} alt="Admin Platform" className="h-16 w-16 rounded-xl object-cover" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-4">See the admin panel in action</h3>
            <p className="text-white/60 mb-6 max-w-xl mx-auto">
              Watch a quick demo of the admin platform in action — user management, billing, analytics, and more.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/admin-platform/demo" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-[1.02]">
                <FaPlay /> Launch Interactive Demo
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Pricing with Comparison Table */}
      <section className="py-16 px-6 max-w-6xl mx-auto" id="pricing">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold">
            Choose your <span className="text-purple-400">plan</span>
          </h2>
          <p className="text-white/60 mt-4">Start free, scale as you grow. No hidden fees.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} onSelect={handleSignup} />
          ))}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 text-center">Feature Comparison</h3>
          <PricingComparison plans={plans} />
        </div>
      </section>

      {/* Email Capture */}
      <section className="py-8 px-6 max-w-2xl mx-auto">
        <EmailCapture />
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold">
            Frequently Asked <span className="text-purple-400">Questions</span>
          </h2>
        </motion.div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          {faqs.map((item, idx) => (
            <FAQItem
              key={idx}
              question={item.q}
              answer={item.a}
              isOpen={openFaq === idx}
              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
            />
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-600/10 to-blue-600/10 backdrop-blur-xl p-8 md:p-12"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to launch your <span className="text-purple-400">admin platform</span>?
            </h2>
            <p className="text-white/60 mb-8 max-w-xl mx-auto">
              Get started today with a 14-day free trial. No credit card required.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/admin-platform/signup" className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 flex items-center gap-2 hover:scale-[1.02]">
                <FaArrowRight /> Start Free Trial
              </Link>
              <Link to="/admin-platform/demo" className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300 flex items-center gap-2 hover:scale-[1.02]">
                <FaPlay /> View Demo
              </Link>
            </div>
            <p className="mt-4 text-sm text-white/40">14-day free trial • No credit card • Cancel anytime</p>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 text-center text-sm text-white/40">
        <div className="flex flex-wrap justify-center gap-6 mb-4">
          <Link to="/admin-platform" className="hover:text-white transition">Home</Link>
          <button onClick={() => scrollToSection('features')} className="hover:text-white transition">Features</button>
          <button onClick={() => scrollToSection('pricing')} className="hover:text-white transition">Pricing</button>
          <Link to="/admin-platform/demo" className="hover:text-white transition">Demo</Link>
          <Link to="/docs" className="hover:text-white transition">Documentation</Link>
          <Link to="/admin-platform/login" className="hover:text-white transition">Log In</Link>
          <Link to="/contact" className="hover:text-white transition">Contact Sales</Link>
          <Link to="/privacy" className="hover:text-white transition">Privacy</Link>
          <Link to="/terms" className="hover:text-white transition">Terms</Link>
        </div>
        <div className="flex justify-center gap-4 mb-4">
          <a href="#" className="text-white/30 hover:text-white transition"><FaTwitter /></a>
          <a href="#" className="text-white/30 hover:text-white transition"><FaGithub /></a>
          <a href="#" className="text-white/30 hover:text-white transition"><FaLinkedin /></a>
        </div>
        <p>&copy; 2026 Admin Platform. Built for developers.</p>
      </footer>
    </div>
  );
};

export default AdminPlatformLanding;