// src/pages/Documentation.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaSearch, FaBook, FaCode, FaLock, FaBuilding, FaCreditCard, 
  FaShieldAlt, FaRocket, FaArrowRight, FaCubes, FaUsers,
  FaChartLine, FaEnvelope, FaServer, FaRobot, FaChevronRight,
  FaChevronDown, FaCopy, FaCheck, FaBolt, FaPlug, FaDatabase
} from 'react-icons/fa';

const Documentation = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = [
    { id: 'getting-started', icon: <FaRocket className="text-purple-400" />, title: 'Getting Started', desc: 'Setup and installation in minutes' },
    { id: 'authentication', icon: <FaLock className="text-emerald-400" />, title: 'Authentication', desc: 'Login, JWT, API keys, SSO' },
    { id: 'api', icon: <FaCode className="text-blue-400" />, title: 'API Reference', desc: 'REST API, endpoints, webhooks' },
    { id: 'organizations', icon: <FaBuilding className="text-amber-400" />, title: 'Organizations', desc: 'Teams, roles, permissions' },
    { id: 'billing', icon: <FaCreditCard className="text-cyan-400" />, title: 'Billing', desc: 'Subscriptions, payments, invoices' },
    { id: 'permissions', icon: <FaShieldAlt className="text-red-400" />, title: 'Permissions', desc: 'Access control, audit logs' },
  ];

  const content = {
    'getting-started': {
      title: 'Getting Started',
      description: 'Get up and running with Admin Platform in minutes.',
      items: [
        { name: 'Introduction', desc: 'Overview of Admin Platform features and architecture' },
        { name: 'Quick Start Guide', desc: 'Set up your first admin panel in 10 minutes' },
        { name: 'Installation', desc: 'Install and configure the platform' },
        { name: 'Architecture', desc: 'Understand the technology stack and design' },
      ]
    },
    'authentication': {
      title: 'Authentication',
      description: 'Secure authentication and identity management.',
      items: [
        { name: 'Login Flow', desc: 'How authentication works' },
        { name: 'API Keys', desc: 'Generate and manage API keys' },
        { name: 'JWT Tokens', desc: 'JSON Web Token authentication' },
        { name: 'SSO / SAML', desc: 'Enterprise Single Sign-On' },
      ]
    },
    'api': {
      title: 'API Reference',
      description: 'Complete API documentation for developers.',
      items: [
        { name: 'REST API Overview', desc: 'Complete API reference' },
        { name: 'Endpoints', desc: 'All available endpoints' },
        { name: 'Webhooks', desc: 'Real-time event notifications' },
        { name: 'Rate Limiting', desc: 'API rate limits and best practices' },
        { name: 'Error Handling', desc: 'Common error codes and handling' },
      ]
    },
    'organizations': {
      title: 'Organizations',
      description: 'Multi-tenant organization management.',
      items: [
        { name: 'Creating Organizations', desc: 'Create and configure organizations' },
        { name: 'Managing Teams', desc: 'Team management and roles' },
        { name: 'Inviting Users', desc: 'Invite users to your organization' },
        { name: 'Organization Settings', desc: 'Configure organization preferences' },
      ]
    },
    'billing': {
      title: 'Billing & Subscriptions',
      description: 'Payment processing and subscription management.',
      items: [
        { name: 'Subscription Plans', desc: 'Available plans and pricing' },
        { name: 'Payment Methods', desc: 'Add and manage payment methods' },
        { name: 'Invoices', desc: 'View and download invoices' },
        { name: 'Upgrade/Downgrade', desc: 'Change your subscription plan' },
      ]
    },
    'permissions': {
      title: 'Permissions & Roles',
      description: 'Fine-grained access control and audit logs.',
      items: [
        { name: 'Roles Overview', desc: 'Understanding user roles' },
        { name: 'Permissions Matrix', desc: 'Complete permissions reference' },
        { name: 'Access Control', desc: 'Fine-grained access control' },
        { name: 'Audit Logs', desc: 'Track user actions and changes' },
      ]
    }
  };

  const filteredSections = searchQuery 
    ? sections.filter(section => 
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        content[section.id].items.some(item => 
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.desc.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : sections;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeContent = content[activeSection] || content['getting-started'];

  const codeExample = `curl -X POST https://api.imali-defi.com/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@example.com", "password": "your-password"}'`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/admin-platform" className="text-lg font-bold flex items-center gap-2">
                <FaCubes className="text-purple-500" />
                <span className="hidden sm:inline">Admin<span className="text-purple-500">Platform</span></span>
              </Link>
              <span className="text-xs text-white/40 border border-white/10 px-2 py-0.5 rounded">Docs</span>
            </div>
            <div className="flex items-center gap-3 flex-1 max-w-md mx-4">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                />
              </div>
            </div>
            <Link to="/admin-platform" className="text-sm text-white/40 hover:text-white transition whitespace-nowrap">
              ← Back
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white via-purple-300 to-purple-600 bg-clip-text text-transparent">
            Documentation
          </h1>
          <p className="text-white/50 text-sm mt-1">Everything you need to build with Admin Platform</p>
        </div>

        {/* Quick Nav */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
                activeSection === section.id
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/5'
              }`}
            >
              <span className="text-sm">{section.icon}</span>
              {section.title}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/30 mb-3">Sections</h4>
              {filteredSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                    activeSection === section.id
                      ? 'bg-purple-500/10 text-white border border-purple-500/20'
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-lg">{section.icon}</span>
                  <span className="flex-1 text-left truncate">{section.title}</span>
                  {activeSection === section.id && <FaChevronRight className="text-purple-400 text-xs" />}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{sections.find(s => s.id === activeSection)?.icon}</span>
                <div>
                  <h2 className="text-xl font-bold">{activeContent.title}</h2>
                  <p className="text-sm text-white/40">{activeContent.description}</p>
                </div>
              </div>

              <div className="divide-y divide-white/5">
                {activeContent.items.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between group">
                    <div>
                      <h4 className="font-medium text-sm group-hover:text-purple-400 transition">{item.name}</h4>
                      <p className="text-xs text-white/40">{item.desc}</p>
                    </div>
                    <Link 
                      to={`/docs/${activeSection}/${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                      className="text-white/20 hover:text-purple-400 transition text-sm"
                    >
                      <FaArrowRight />
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Code Example - Fixed */}
            <div className="mt-4 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                  </div>
                  <span className="text-[10px] text-white/30 ml-2">Quick Example</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(codeExample)}
                  className="text-white/30 hover:text-white transition text-xs flex items-center gap-1"
                >
                  {copied ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="p-3 bg-slate-950/50 overflow-x-auto">
                <code className="text-xs text-emerald-300 font-mono whitespace-pre-wrap break-all">
                  {codeExample}
                </code>
              </div>
            </div>

            {/* Help */}
            <div className="mt-4 bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-xl p-4 text-center">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <FaRobot className="text-2xl text-purple-400" />
                <span className="text-sm text-white/60">Need help? Our team is here.</span>
                <div className="flex gap-2">
                  <a href="mailto:imalidefi@gmail.com" className="px-4 py-1.5 bg-purple-600 rounded-lg text-xs font-semibold hover:bg-purple-500 transition">
                    Support
                  </a>
                  <Link to="/admin-platform/demo" className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-semibold hover:bg-white/10 transition">
                    Demo
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-8 py-4 px-6 text-center text-xs text-white/30">
        <div className="flex flex-wrap justify-center gap-4 mb-2">
          <Link to="/admin-platform" className="hover:text-white transition">Platform</Link>
          <Link to="/admin-platform/demo" className="hover:text-white transition">Demo</Link>
          <Link to="/admin-platform/pricing" className="hover:text-white transition">Pricing</Link>
          <a href="mailto:imalidefi@gmail.com" className="hover:text-white transition">Contact</a>
        </div>
        <p>&copy; 2026 Admin Platform</p>
      </footer>
    </div>
  );
};

export default Documentation;