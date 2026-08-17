import { FaBriefcase, FaFootballBall} from "react-icons/fa";
// src/pages/AdminDashboard.jsx - NEW (Admin Platform Customer Dashboard)
import React, { useState, useEffect } from 'react';
import { Link, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BotAPI from '../utils/BotAPI';

// Admin dashboard components
import AdminUsers from './admin/AdminUsers';
import AdminOrganizations from './admin/AdminOrganizations';
import AdminReports from './admin/AdminReports';
import AdminAnalytics from './admin/AdminAnalytics';
import AdminBilling from './admin/AdminBilling';
import AdminPermissions from './admin/AdminPermissions';
import AdminAudit from './admin/AdminAudit';
import AdminReferral from './admin/AdminReferral';
import AdminEmail from './admin/AdminEmail';
import AdminNewsletter from './admin/AdminNewsletter';
import AdminSocial from './admin/AdminSocial';
import AdminPromoCodes from './admin/AdminPromoCodes';
import AdminMarketing from './admin/AdminMarketing';
import AdminSystemHealth from './admin/AdminSystemHealth';
import AdminEnterpriseManagement from './admin/AdminEnterpriseManagement';
import AdminWorkAgent from "./admin/AdminWorkAgent";
import AdminSportsJedi from "./admin/AdminSportsJedi";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load organization data
        const orgData = await BotAPI.getOrganization();
        setOrganization(orgData);
      } catch (error) {
        console.error('Failed to load organization:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen bg-[#0a0a1a] border-r border-white/5 p-4">
          <div className="mb-8">
            <h2 className="text-lg font-bold text-purple-400">
              <i className="fas fa-cubes mr-2"></i>
              Admin Platform
            </h2>
            <p className="text-xs text-white/40 mt-1">{organization?.name || 'My Organization'}</p>
          </div>
          
          <nav className="space-y-1">
            {/* Dashboard */}
            <Link to="/admin/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition">
              <i className="fas fa-chart-pie w-5"></i>
              <span>Dashboard</span>
            </Link>

            <Link
              to="/admin/work-agent"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-purple-500/10 hover:text-purple-400 transition"
            >
              <FaBriefcase />
              <span>Work Agent</span>
            </Link>

            <Link
              to="/admin/sports-jedi"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-purple-500/10 hover:text-purple-400 transition"
            >
              <FaFootballBall />
              <span>Sports Jedi</span>
            </Link>

            
            {/* Users */}
            <Link to="/admin/users" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition">
              <i className="fas fa-users w-5"></i>
              <span>Users</span>
            </Link>
            
            {/* Organizations */}
            <Link to="/admin/organizations" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition">
              <i className="fas fa-building w-5"></i>
              <span>Organizations</span>
            </Link>
            
            {/* Permissions */}
            <Link to="/admin/permissions" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition">
              <i className="fas fa-shield-alt w-5"></i>
              <span>Permissions</span>
            </Link>
            
            {/* Reports */}
            <Link to="/admin/reports" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition">
              <i className="fas fa-chart-bar w-5"></i>
              <span>Reports</span>
            </Link>
            
            {/* Analytics */}
            <Link to="/admin/analytics" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition">
              <i className="fas fa-chart-line w-5"></i>
              <span>Analytics</span>
            </Link>
            
            {/* Billing */}
            <Link to="/admin/billing" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition">
              <i className="fas fa-credit-card w-5"></i>
              <span>Billing</span>
            </Link>
            
            {/* Audit */}
            <Link to="/admin/audit" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition">
              <i className="fas fa-history w-5"></i>
              <span>Audit Logs</span>
            </Link>
            
            {/* Marketing */}
            <Link to="/admin/marketing" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition">
              <i className="fas fa-bullhorn w-5"></i>
              <span>Marketing</span>
            </Link>
            
            {/* Referral */}
            <Link to="/admin/referral" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition">
              <i className="fas fa-user-plus w-5"></i>
              <span>Referral Program</span>
            </Link>
            
            {/* Email */}
            <Link to="/admin/email" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition">
              <i className="fas fa-envelope w-5"></i>
              <span>Email Automation</span>
            </Link>
            
            {/* Newsletter */}
            <Link to="/admin/newsletter" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition">
              <i className="fas fa-newspaper w-5"></i>
              <span>Newsletter</span>
            </Link>
            
            {/* Social */}
            <Link to="/admin/social" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition">
              <i className="fas fa-share-alt w-5"></i>
              <span>Social Manager</span>
            </Link>
            
            {/* Promo Codes */}
            <Link to="/admin/promo-codes" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition">
              <i className="fas fa-gift w-5"></i>
              <span>Promo Codes</span>
            </Link>
            
            {/* System Health */}
            <Link to="/admin/system-health" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition">
              <i className="fas fa-server w-5"></i>
              <span>System Health</span>
            </Link>
            
            {/* Enterprise Management */}
            <Link to="/admin/enterprise" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition">
              <i className="fas fa-building w-5"></i>
              <span>Enterprise Management</span>
            </Link>
          </nav>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<AdminDashboardHome organization={organization} />} />
            <Route path="/dashboard" element={<AdminDashboardHome organization={organization} />} />
            <Route path="/users" element={<AdminUsers />} />
            <Route path="/organizations" element={<AdminOrganizations />} />
            <Route path="/permissions" element={<AdminPermissions />} />
            <Route path="/reports" element={<AdminReports />} />
            <Route path="/analytics" element={<AdminAnalytics />} />
            <Route path="/billing" element={<AdminBilling />} />
            <Route path="/audit" element={<AdminAudit />} />
            <Route path="/marketing" element={<AdminMarketing />} />
            <Route path="/referral" element={<AdminReferral />} />
            <Route path="/email" element={<AdminEmail />} />
            <Route path="/newsletter" element={<AdminNewsletter />} />
            <Route path="/social" element={<AdminSocial />} />
            <Route path="/promo-codes" element={<AdminPromoCodes />} />
            <Route path="/system-health" element={<AdminSystemHealth />} />
            <Route path="/work-agent" element={<AdminWorkAgent />} />
            <Route path="/sports-jedi" element={<AdminSportsJedi />} />
            <Route path="/enterprise" element={<AdminEnterpriseManagement />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

// Admin Dashboard Home
const AdminDashboardHome = ({ organization }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    users: 0,
    organizations: 0,
    revenue: 0,
    activeSubscriptions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [users, orgs, billing] = await Promise.all([
          BotAPI.getOrganizationUsers(),
          BotAPI.getOrganizations(),
          BotAPI.getBillingSummary(),
        ]);
        setStats({
          users: users?.length || 0,
          organizations: orgs?.length || 0,
          revenue: billing?.revenue || 0,
          activeSubscriptions: billing?.activeSubscriptions || 0,
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-white/40">Welcome back, {user?.name || user?.email}</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/40">Total Users</p>
            <i className="fas fa-users text-purple-400"></i>
          </div>
          <p className="text-3xl font-bold mt-2">{stats.users}</p>
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/40">Organizations</p>
            <i className="fas fa-building text-blue-400"></i>
          </div>
          <p className="text-3xl font-bold mt-2">{stats.organizations}</p>
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/40">Revenue</p>
            <i className="fas fa-dollar-sign text-green-400"></i>
          </div>
          <p className="text-3xl font-bold mt-2">${stats.revenue.toLocaleString()}</p>
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/40">Active Subscriptions</p>
            <i className="fas fa-credit-card text-amber-400"></i>
          </div>
          <p className="text-3xl font-bold mt-2">{stats.activeSubscriptions}</p>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">New user registered</span>
            <span className="text-white/30">2 min ago</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Organization "Acme Corp" created</span>
            <span className="text-white/30">15 min ago</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Subscription upgraded to Business</span>
            <span className="text-white/30">1 hour ago</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">New promo code generated</span>
            <span className="text-white/30">3 hours ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
