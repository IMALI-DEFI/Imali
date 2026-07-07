// src/pages/Documentation.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaSearch, FaBook, FaCode, FaLock, FaBuilding, FaCreditCard, 
  FaShieldAlt, FaRocket, FaArrowRight, FaCubes, FaUsers,
  FaChartLine, FaEnvelope, FaServer, FaRobot, FaChevronRight,
  FaChevronDown, FaExternalLinkAlt, FaCopy, FaCheck
} from 'react-icons/fa';

const Documentation = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    'getting-started': true,
    'api': true,
    'organizations': false,
    'billing': false,
    'permissions': false,
    'authentication': false,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <FaRocket className="text-purple-400" />,
      items: [
        { 
          name: 'Introduction', 
          path: '/docs/introduction',
          description: 'Overview of the Admin Platform and its features'
        },
        { 
          name: 'Quick Start Guide', 
          path: '/docs/quick-start',
          description: 'Get up and running in 10 minutes'
        },
        { 
          name: 'Installation', 
          path: '/docs/installation',
          description: 'Install and configure the Admin Platform'
        },
        { 
          name: 'Architecture Overview', 
          path: '/docs/architecture',
          description: 'Understand the platform architecture'
        },
      ]
    },
    {
      id: 'authentication',
      title: 'Authentication',
      icon: <FaLock className="text-emerald-400" />,
      items: [
        { 
          name: 'Login Flow', 
          path: '/docs/auth/login',
          description: 'How authentication works'
        },
        { 
          name: 'API Keys', 
          path: '/docs/auth/api-keys',
          description: 'Generate and manage API keys'
        },
        { 
          name: 'JWT Tokens', 
          path: '/docs/auth/jwt',
          description: 'JSON Web Token authentication'
        },
        { 
          name: 'SSO / SAML', 
          path: '/docs/auth/sso',
          description: 'Single Sign-On configuration'
        },
      ]
    },
    {
      id: 'api',
      title: 'API Reference',
      icon: <FaCode className="text-blue-400" />,
      items: [
        { 
          name: 'REST API Overview', 
          path: '/docs/api/overview',
          description: 'Complete API reference'
        },
        { 
          name: 'Endpoints', 
          path: '/docs/api/endpoints',
          description: 'All available endpoints'
        },
        { 
          name: 'Webhooks', 
          path: '/docs/api/webhooks',
          description: 'Real-time event notifications'
        },
        { 
          name: 'Rate Limiting', 
          path: '/docs/api/rate-limiting',
          description: 'API rate limits and best practices'
        },
        { 
          name: 'Error Handling', 
          path: '/docs/api/errors',
          description: 'Common error codes and handling'
        },
      ]
    },
    {
      id: 'organizations',
      title: 'Organizations',
      icon: <FaBuilding className="text-amber-400" />,
      items: [
        { 
          name: 'Creating Organizations', 
          path: '/docs/organizations/create',
          description: 'Create and configure organizations'
        },
        { 
          name: 'Managing Teams', 
          path: '/docs/organizations/teams',
          description: 'Team management and roles'
        },
        { 
          name: 'Inviting Users', 
          path: '/docs/organizations/invites',
          description: 'Invite users to your organization'
        },
        { 
          name: 'Organization Settings', 
          path: '/docs/organizations/settings',
          description: 'Configure organization preferences'
        },
      ]
    },
    {
      id: 'billing',
      title: 'Billing & Subscriptions',
      icon: <FaCreditCard className="text-cyan-400" />,
      items: [
        { 
          name: 'Subscription Plans', 
          path: '/docs/billing/plans',
          description: 'Available plans and pricing'
        },
        { 
          name: 'Payment Methods', 
          path: '/docs/billing/payment',
          description: 'Add and manage payment methods'
        },
        { 
          name: 'Invoices', 
          path: '/docs/billing/invoices',
          description: 'View and download invoices'
        },
        { 
          name: 'Upgrade/Downgrade', 
          path: '/docs/billing/upgrade',
          description: 'Change your subscription plan'
        },
      ]
    },
    {
      id: 'permissions',
      title: 'Permissions & Roles',
      icon: <FaShieldAlt className="text-red-400" />,
      items: [
        { 
          name: 'Roles Overview', 
          path: '/docs/permissions/roles',
          description: 'Understanding user roles'
        },
        { 
          name: 'Permissions Matrix', 
          path: '/docs/permissions/matrix',
          description: 'Complete permissions reference'
        },
        { 
          name: 'Access Control', 
          path: '/docs/permissions/access-control',
          description: 'Fine-grained access control'
        },
        { 
          name: 'Audit Logs', 
          path: '/docs/permissions/audit',
          description: 'Track user actions and changes'
        },
      ]
    },
  ];

  const quickLinks = [
    { label: 'API Reference', icon: <FaCode />, path: '/docs/api/overview' },
    { label: 'Authentication', icon: <FaLock />, path: '/docs/auth/login' },
    { label: 'Webhooks', icon: <FaServer />, path: '/docs/api/webhooks' },
    { label: 'Billing', icon: <FaCreditCard />, path: '/docs/billing/plans' },
  ];

  const filteredSections = searchQuery 
    ? sections.map(section => ({
        ...section,
        items: section.items.filter(item => 
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          section.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(section => section.items.length > 0)
    : sections;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/admin-platform" className="text-xl font-bold flex items-center gap-2">
                <FaCubes className="text-purple-500" />
                Admin<span className="text-purple-500">Platform</span>
              </Link>
              <span className="text-xs text-white/40 border border-white/10 px-2 py-0.5 rounded">Docs</span>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <Link to="/admin-platform" className="text-sm text-white/60 hover:text-white transition whitespace-nowrap">
                ← Back
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-purple-300 to-purple-600 bg-clip-text text-transparent">
            Documentation
          </h1>
          <p className="text-white/60 mt-4 text-lg max-w-2xl mx-auto">
            Everything you need to build with Admin Platform. Complete guides, API references, and best practices.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {quickLinks.map((link, i) => (
            <Link
              key={i}
              to={link.path}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:border-purple-500/30 hover:bg-white/10 transition group"
            >
              <div className="text-2xl text-purple-400 mb-2">{link.icon}</div>
              <p className="text-sm font-semibold group-hover:text-purple-400 transition">{link.label}</p>
              <FaArrowRight className="inline text-xs text-white/30 group-hover:text-purple-400 transition mt-1" />
            </Link>
          ))}
        </div>

        {/* Documentation Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">Sections</h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition text-white/60 hover:text-white"
                  >
                    <span className="text-lg">{section.icon}</span>
                    <span className="flex-1 text-left">{section.title}</span>
                    {expandedSections[section.id] ? <FaChevronDown className="text-xs" /> : <FaChevronRight className="text-xs" />}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-8">
            {filteredSections.map((section) => (
              <div key={section.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div 
                  className="flex items-center gap-3 px-6 py-4 cursor-pointer hover:bg-white/5 transition"
                  onClick={() => toggleSection(section.id)}
                >
                  <span className="text-2xl">{section.icon}</span>
                  <h2 className="text-xl font-bold flex-1">{section.title}</h2>
                  {expandedSections[section.id] ? <FaChevronDown className="text-white/40" /> : <FaChevronRight className="text-white/40" />}
                </div>
                
                {expandedSections[section.id] && (
                  <div className="border-t border-white/5 divide-y divide-white/5">
                    {section.items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className="block px-6 py-4 hover:bg-white/5 transition group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold group-hover:text-purple-400 transition">
                              {item.name}
                            </h4>
                            <p className="text-sm text-white/40 mt-1">{item.description}</p>
                          </div>
                          <FaChevronRight className="text-white/20 group-hover:text-purple-400 transition" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {filteredSections.length === 0 && (
              <div className="text-center py-12">
                <FaSearch className="text-4xl text-white/20 mx-auto mb-4" />
                <p className="text-white/40">No results found for "{searchQuery}"</p>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="mt-4 text-purple-400 hover:text-purple-300 transition"
                >
                  Clear search
                </button>
              </div>
            )}

            {/* Code Example */}
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                  </div>
                  <span className="text-xs text-white/40 ml-2">Example: API Authentication</span>
                </div>
                <button 
                  onClick={() => copyToClipboard('curl -X POST https://api.imali-defi.com/api/auth/login \\\n  -H "Content-Type: application/json" \\\n  -d \'{"email": "user@example.com", "password": "your-password"}\'')}
                  className="text-white/40 hover:text-white transition text-sm flex items-center gap-1"
                >
                  {copied ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="p-6 bg-slate-950/50">
                <pre className="text-sm text-emerald-300 font-mono overflow-x-auto">
                  <code>{`curl -X POST https://api.imali-defi.com/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@example.com", "password": "your-password"}'`}</code>
                </pre>
                <div className="mt-4 text-xs text-white/40">
                  <span className="text-emerald-400">✓</span> Returns JWT token for authentication
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-xl p-8 text-center">
              <FaRobot className="text-4xl text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Need more help?</h3>
              <p className="text-white/60 max-w-lg mx-auto">
                Our team is here to help you get the most out of Admin Platform.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mt-6">
                <a href="mailto:imalidefi@gmail.com" className="px-6 py-2.5 bg-purple-600 rounded-lg text-sm font-semibold hover:bg-purple-500 transition">
                  Contact Support
                </a>
                <Link to="/admin-platform/demo" className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm font-semibold hover:bg-white/10 transition">
                  View Demo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-12 py-8 px-6 text-center text-sm text-white/40">
        <div className="flex flex-wrap justify-center gap-6 mb-4">
          <Link to="/admin-platform" className="hover:text-white transition">Admin Platform</Link>
          <Link to="/docs" className="hover:text-white transition">Documentation</Link>
          <Link to="/admin-platform/pricing" className="hover:text-white transition">Pricing</Link>
          <Link to="/admin-platform/demo" className="hover:text-white transition">Demo</Link>
          <a href="mailto:imalidefi@gmail.com" className="hover:text-white transition">Contact</a>
        </div>
        <p>&copy; 2026 Admin Platform. Built for developers.</p>
      </footer>
    </div>
  );
};

export default Documentation;
