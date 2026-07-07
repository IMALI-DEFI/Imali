// src/pages/AdminPlatformDemo.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  FaUsers, FaChartLine, FaCubes, FaBuilding, FaCreditCard, 
  FaGift, FaEnvelope, FaNewspaper, FaShareAlt, FaShieldAlt, 
  FaServer, FaRobot, FaArrowRight, FaCheck, FaStar,
  FaBell, FaUserCircle, FaSearch, FaTh, FaList, FaCog,
  FaWallet, FaTrophy, FaClock, FaCalendarAlt, FaDownload,
  FaEye, FaEdit, FaTrash, FaPlus, FaFilter, FaSort,
  FaDollarSign, FaChartPie, FaDatabase, FaTerminal
} from "react-icons/fa";

const AdminPlatformDemo = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isHovering, setIsHovering] = useState(false);

  const stats = [
    { label: "Total Users", value: "51", change: "+0 today", icon: <FaUsers className="text-purple-400" />, color: "purple" },
    { label: "Total Trades", value: "82,588", change: "$0 24h volume", icon: <FaChartLine className="text-blue-400" />, color: "blue" },
    { label: "Total Revenue (30d)", value: "$1,130.53", change: "$0 today", icon: <FaDollarSign className="text-emerald-400" />, color: "emerald" },
    { label: "Organizations", value: "0", change: "0 total members", icon: <FaBuilding className="text-amber-400" />, color: "amber" },
  ];

  const recentActivity = [
    { action: "ADMIN_UPDATE_USER", user: "enterprise@imali.com", time: "7/5/2026, 11:35:09 PM", type: "admin" },
    { action: "SIGNUP", user: "hassankiosman@gmail.com", time: "7/5/2026, 11:24:53 AM", type: "signup" },
    { action: "SIGNUP", user: "perfectkuriso@gmail.com", time: "7/3/2026, 4:08:32 AM", type: "signup" },
    { action: "SIGNUP", user: "garethadams@hotmail.com", time: "7/3/2026, 3:58:09 AM", type: "signup" },
    { action: "SIGNUP", user: "welts-litchi.3@icloud.com", time: "7/3/2026, 2:10:06 AM", type: "signup" },
    { action: "PAPER_TRADE_EXECUTED", user: "enterprise@imali.com", time: "7/2/2026, 11:06:50 PM", type: "trade" },
    { action: "PAPER_TRADE_EXECUTED", user: "enterprise@imali.com", time: "7/2/2026, 11:06:20 PM", type: "trade" },
    { action: "SIGNUP", user: "jamesonggg101@gmail.com", time: "7/2/2026, 10:26:36 PM", type: "signup" },
    { action: "SIGNUP", user: "monzonjoan@gmail.com", time: "7/2/2026, 8:40:53 PM", type: "signup" },
    { action: "LOGIN", user: "wayne@imali-defi.com", time: "7/1/2026, 8:31:04 PM", type: "login" },
  ];

  const menuItems = [
    { icon: <FaChartLine />, label: "Dashboard", section: "overview" },
    { icon: <FaBuilding />, label: "Enterprise", section: "enterprise" },
    { icon: <FaUsers />, label: "Users", section: "users" },
    { icon: <FaChartLine />, label: "Trading", section: "trading" },
    { icon: <FaWallet />, label: "Money", section: "money" },
    { icon: <FaShareAlt />, label: "Marketing", section: "marketing" },
    { icon: <FaCog />, label: "Advanced", section: "advanced" },
  ];

  const getActionColor = (type) => {
    const colors = {
      admin: "text-purple-400 bg-purple-500/10",
      signup: "text-emerald-400 bg-emerald-500/10",
      trade: "text-blue-400 bg-blue-500/10",
      login: "text-amber-400 bg-amber-500/10",
    };
    return colors[type] || "text-gray-400 bg-gray-500/10";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-white/5 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin-platform" className="text-xl font-bold flex items-center gap-2">
            <FaCubes className="text-purple-500" />
            IMALI
          </Link>
          <span className="text-xs text-white/40 border border-white/10 px-2 py-0.5 rounded">DEMO</span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm text-white/60 hover:text-white transition">Home</Link>
          <Link to="/how-it-works" className="text-sm text-white/60 hover:text-white transition">How It Works</Link>
          <Link to="/pricing" className="text-sm text-white/60 hover:text-white transition">Pricing</Link>
          <Link to="/enterprise" className="text-sm text-white/60 hover:text-white transition">For Organizations</Link>
          <Link to="/referrals" className="text-sm text-white/60 hover:text-white transition">Referral Partner</Link>
          <Link to="/live" className="text-sm text-white/60 hover:text-white transition">Live Dashboard</Link>
          <Link to="/admin-platform/login" className="text-sm text-white/60 hover:text-white transition">Member Login</Link>
        </div>
        <div className="flex items-center gap-3">
          <FaBell className="text-white/40 hover:text-white cursor-pointer transition" />
          <FaUserCircle className="text-2xl text-purple-400 cursor-pointer" />
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-16 flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen bg-slate-900/50 border-r border-white/5 p-4 fixed left-0 top-16 overflow-y-auto">
          <div className="mb-6">
            <div className="flex items-center gap-3 px-3 py-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <FaUserCircle className="text-2xl text-purple-400" />
              <div>
                <p className="text-sm font-semibold">Admin User</p>
                <p className="text-xs text-white/40">admin@imali.com</p>
              </div>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <FaUsers className="text-purple-400 mx-auto text-lg" />
              <p className="text-sm font-bold mt-1">51</p>
              <p className="text-[10px] text-white/40">users</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <FaDollarSign className="text-emerald-400 mx-auto text-lg" />
              <p className="text-sm font-bold mt-1">$2.77M</p>
              <p className="text-[10px] text-white/40">volume</p>
            </div>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => setActiveTab(item.section)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  activeTab === item.section
                    ? "bg-purple-500/20 text-purple-400"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-6 border-t border-white/5 pt-4">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/40 hover:bg-white/5 hover:text-white transition">
              <FaRobot className="text-lg" />
              AI Assistant
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="ml-64 flex-1 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">IMALI Owner Dashboard</h1>
              <p className="text-sm text-white/40">Complete platform oversight and enterprise management</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition">
                <FaDownload className="inline mr-2" /> Export
              </button>
              <button className="px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition">
                <FaPlus className="inline mr-2" /> New
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/40">{stat.label}</span>
                  <span className="text-xl">{stat.icon}</span>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-white/40 mt-1">{stat.change}</p>
              </div>
            ))}
          </div>

          {/* PNL Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Platform PNL Performance</h3>
                <div className="flex gap-2">
                  {["Today", "7 Days", "30 Days", "90 Days"].map((period) => (
                    <button key={period} className={`px-3 py-1 rounded-lg text-xs transition ${
                      period === "30 Days" 
                        ? "bg-purple-500/20 text-purple-400" 
                        : "text-white/40 hover:bg-white/10"
                    }`}>
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-48 flex items-center justify-center bg-white/5 rounded-xl">
                <div className="text-center text-white/40">
                  <FaChartLine className="text-4xl mx-auto mb-2 text-purple-400" />
                  <p className="text-sm">Chart preview - Interactive dashboard coming soon</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <p className="text-xs text-white/40">Total PNL</p>
                  <p className="text-lg font-bold text-emerald-400">$1,130.53</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/40">Today</p>
                  <p className="text-lg font-bold text-red-400">-$10.60</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/40">This Month</p>
                  <p className="text-lg font-bold text-emerald-400">$1,130.53</p>
                </div>
              </div>
            </div>

            {/* Enterprise Overview */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center justify-between">
                <span>Enterprise Overview</span>
                <Link to="#" className="text-xs text-purple-400 hover:text-purple-300">Manage Requests →</Link>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/40">Organizations</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/40">Team Members</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/40">Custom Strategies</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/40">Active Orgs</span>
                  <span className="font-semibold text-emerald-400">0</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-4 gap-2">
                {["Users", "Enterprise", "Withdrawals", "Automation", "Requests"].map((item) => (
                  <button key={item} className="text-xs text-white/60 hover:text-white transition py-1 px-2 bg-white/5 rounded-lg">
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FaClock className="text-purple-400" />
                Recent Activity
              </h3>
              <div className="flex gap-2">
                <span className="text-xs text-white/40">Last 10</span>
                <Link to="#" className="text-xs text-purple-400 hover:text-purple-300">Show All →</Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-white/40 border-b border-white/5">
                    <th className="pb-2 font-medium">Action</th>
                    <th className="pb-2 font-medium">User</th>
                    <th className="pb-2 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((activity, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getActionColor(activity.type)}`}>
                          {activity.action}
                        </span>
                      </td>
                      <td className="py-2 text-white/60">{activity.user}</td>
                      <td className="py-2 text-white/40 text-xs">{activity.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">⚡ Quick Actions</p>
                <p className="text-xs text-white/40">Common admin tasks</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-purple-600 rounded-lg text-xs hover:bg-purple-500 transition">
                  Refresh Metrics
                </button>
                <button className="px-3 py-1.5 bg-white/10 rounded-lg text-xs hover:bg-white/20 transition">
                  PNL Details
                </button>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">⚙️ System Status</p>
                <p className="text-xs text-white/40">All systems operational</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Healthy
                </span>
                <span className="text-xs text-white/40">Uptime: 99.9%</span>
              </div>
            </div>
          </div>

          {/* Demo Footer */}
          <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaRobot className="text-purple-400 text-xl" />
              <div>
                <p className="text-sm font-semibold">This is a demo preview</p>
                <p className="text-xs text-white/40">Explore the full Admin Platform features</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to="/admin-platform/signup" className="px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition flex items-center gap-2">
                Get Started <FaArrowRight />
              </Link>
              <Link to="/admin-platform" className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition">
                Back to Landing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPlatformDemo;
