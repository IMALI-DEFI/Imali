// App.js (with Landing + Newsletter pages + Enterprise Support - BOTH VERSIONS)

import React, { lazy, Suspense, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";
import MemberDashboard from "./components/Dashboard/MemberDashboard";
import AdminPanel from "./components/AdminPanel";
import TradeDemo from "./pages/TradeDemo";
import { AuthProvider, useAuth } from "./context/AuthContext";

// ==================== ENTERPRISE PAGES - BOTH VERSIONS ====================
// Government / Educational Version (for counties, schools, workforce programs)
import Enterprise from "./pages/Enterprise";

// Aldo / Trading Infrastructure Version (for brokers, trading firms, fintech operators)
import EnterpriseDemo from "./pages/EnterpriseDemo";

// Onboarding Wizard Component
import EnterpriseOnboardingWizard from './components/enterprise/EnterpriseOnboardingWizard';

// Lazy Loaded Auth / App Pages
const Signup = lazy(() => import("./pages/SignupForm"));
const Login = lazy(() => import("./pages/Login"));
const Activation = lazy(() => import("./pages/Activation"));
const Billing = lazy(() => import("./pages/Billing"));
const BillingSuccess = lazy(() => import("./pages/BillingSuccess"));
const BillingDashboard = lazy(() => import("./pages/BillingDashboard"));

// Enterprise Dashboard Pages (authenticated)
const EnterpriseDashboard = lazy(() => import("./pages/EnterpriseDashboard"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const StrategiesPage = lazy(() => import("./pages/StrategiesPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const AuditPage = lazy(() => import("./pages/AuditPage"));
const BrandingPage = lazy(() => import("./pages/BrandingPage"));
const BotControlsPage = lazy(() => import("./pages/BotsControlsPage"));

// Marketing Pages
import Home from "./pages/Home";
import AboutUs from "./pages/AboutUs";
import HowItWorks from "./pages/HowItWorks";
import Pricing from "./pages/Pricing";
import Support from "./pages/Support";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import FundingGuide from "./pages/FundingGuide";
import PublicDashboard from "./pages/PublicDashboard";
import ReferralSystem from "./pages/ReferralPartner";

// Landing Pages
import LandingPages from "./pages/LandingPages";

// Newsletter Pages
import Newsletter from "./pages/Newsletter";
import NewsletterSuccess from "./pages/NewsletterSuccess";

// Admin Enterprise Pages
const EnterpriseRequestsPage = lazy(() => import("./pages/admin/EnterpriseRequestsPage"));

// ---------------- ERROR BOUNDARY ----------------
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[AppErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6 bg-white">
          <div className="max-w-xl text-center">
            <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              Please refresh the page or try again later.
            </p>
            <Link
              to="/"
              className="inline-block px-5 py-3 bg-emerald-600 text-white rounded-xl"
            >
              Go Home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------- LOADERS ----------------
function LoadingSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="h-10 w-10 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
    </div>
  );
}

function PageFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 rounded-full border-b-2 border-emerald-600 animate-spin mx-auto mb-3" />
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

// ---------------- ROUTE GUARDS ----------------
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;
  if (!user)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return children;
}

function RequireAdmin({ children }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Enterprise route guard - requires enterprise tier
function RequireEnterprise({ children }) {
  const { user, loading, isEnterpriseUser } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  
  if (!isEnterpriseUser) {
    return <Navigate to="/pricing" replace />;
  }

  return children;
}

// Enterprise admin route guard
function RequireEnterpriseAdmin({ children }) {
  const { user, loading, isEnterpriseAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  
  if (!isEnterpriseAdmin) {
    return <Navigate to="/enterprise/dashboard" replace />;
  }

  return children;
}

function RequireActivation({ children }) {
  const { user, activation, activationComplete, loading, isAdmin } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  // Admins bypass activation
  if (isAdmin) return children;

  if (!activationComplete) {
    const hasCard = activation?.has_card_on_file || activation?.billing_complete;
    if (!hasCard) return <Navigate to="/billing" replace />;
    return <Navigate to="/activation" replace />;
  }

  return children;
}

function RedirectIfActivated({ children }) {
  const { user, activationComplete, loading, isAdmin } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  
  if (isAdmin) return children;
  
  if (activationComplete) return <Navigate to="/dashboard" replace />;

  return children;
}

// ---------------- POST LOGIN ----------------
function PostLoginRedirect() {
  const { user, loading, isAdmin, isEnterpriseUser } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    // Enterprise users go to enterprise dashboard
    if (isEnterpriseUser) {
      navigate("/enterprise/dashboard", { replace: true });
      return;
    }

    // Admins go to admin panel
    if (isAdmin) {
      navigate("/admin", { replace: true });
      return;
    }

    // Regular users go to dashboard
    navigate("/dashboard", { replace: true });
  }, [user, loading, navigate, isAdmin, isEnterpriseUser]);

  return <LoadingSpinner />;
}

// ---------------- 404 ----------------
function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center px-6">
      <div>
        <h1 className="text-3xl font-bold mb-3">Page not found</h1>
        <p className="text-gray-600 mb-4">
          The page you're looking for doesn't exist.
        </p>
        <Link to="/" className="text-emerald-600 underline">
          Go Home
        </Link>
      </div>
    </div>
  );
}

// ============================================
// FUNCTIONAL DEMO COMPONENTS (NO AUTH REQUIRED)
// ============================================

// Functional Demo Dashboard
function DemoDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [paperTrading, setPaperTrading] = useState(true);
  const [tradeResult, setTradeResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState("balanced");
  const [teamMembers] = useState([
    { id: 1, name: "Alex Chen", email: "alex@example.com", role: "Admin", status: "active" },
    { id: 2, name: "Sarah Johnson", email: "sarah@example.com", role: "Trader", status: "active" },
    { id: 3, name: "Mike Williams", email: "mike@example.com", role: "Viewer", status: "invited" },
  ]);

  const [strategies] = useState([
    { id: "conservative", name: "Conservative", emoji: "🛡️", risk: "Low", returns: "+8%", active: false },
    { id: "balanced", name: "Balanced", emoji: "⚖️", risk: "Medium", returns: "+15%", active: true },
    { id: "momentum", name: "Momentum", emoji: "🔥", risk: "High", returns: "+22%", active: false },
    { id: "arbitrage", name: "Arbitrage", emoji: "🔄", risk: "Low", returns: "+12%", active: false },
  ]);

  const [recentTrades] = useState([
    { id: 1, asset: "BTC", side: "BUY", price: 71234, pnl: "+8.2%", time: "2 hours ago" },
    { id: 2, asset: "ETH", side: "BUY", price: 3821, pnl: "+6.4%", time: "5 hours ago" },
    { id: 3, asset: "SOL", side: "SELL", price: 168, pnl: "+3.8%", time: "1 day ago" },
  ]);

  const executeTrade = () => {
    setLoading(true);
    setTimeout(() => {
      const randomReturn = (Math.random() * 12 - 3).toFixed(1);
      const isWin = parseFloat(randomReturn) > 0;
      setTradeResult({
        message: `Trade executed with ${isWin ? 'gain' : 'loss'} of ${Math.abs(randomReturn)}%`,
        isWin: isWin,
      });
      setLoading(false);
      setTimeout(() => setTradeResult(null), 3000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white mb-8">
          <h1 className="text-3xl font-bold">Enterprise Dashboard</h1>
          <p className="text-indigo-100 mt-2">Demo Mode • No login required</p>
          <div className="mt-4 flex gap-2">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">Paper Trading: {paperTrading ? "Active" : "Off"}</span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">Strategy: Balanced</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="text-gray-500 text-sm">Total P&L</div>
            <div className="text-2xl font-bold text-green-600">+$12,450</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="text-gray-500 text-sm">Win Rate</div>
            <div className="text-2xl font-bold text-indigo-600">68%</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="text-gray-500 text-sm">Total Trades</div>
            <div className="text-2xl font-bold text-gray-900">156</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="text-gray-500 text-sm">Team Members</div>
            <div className="text-2xl font-bold text-gray-900">{teamMembers.length}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b mb-6">
          {["overview", "trading", "team", "strategies"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium capitalize ${
                activeTab === tab ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-bold mb-4">Recent Trades</h3>
              <div className="space-y-3">
                {recentTrades.map((trade) => (
                  <div key={trade.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-bold">{trade.asset}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded ${trade.side === "BUY" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {trade.side}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">${trade.price.toLocaleString()}</div>
                      <div className="text-sm text-green-600">{trade.pnl}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-bold mb-4">Performance Chart</h3>
              <div className="h-48 bg-gradient-to-b from-indigo-50 to-white rounded-lg flex items-center justify-center text-gray-400">
                📈 P&L Chart (Last 30 days)
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                <div>Week 1: +2.3%</div>
                <div>Week 2: +5.1%</div>
                <div>Week 3: +3.8%</div>
              </div>
            </div>
          </div>
        )}

        {/* Trading Tab */}
        {activeTab === "trading" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-bold mb-4">Paper Trading</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>Virtual Balance</span>
                  <span className="font-bold text-green-600">$10,000</span>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Strategy</label>
                  <select 
                    className="w-full border rounded-lg p-2"
                    value={selectedStrategy}
                    onChange={(e) => setSelectedStrategy(e.target.value)}
                  >
                    <option value="conservative">Conservative</option>
                    <option value="balanced">Balanced</option>
                    <option value="momentum">Momentum</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Asset</label>
                  <select className="w-full border rounded-lg p-2">
                    <option>BTC/USD</option>
                    <option>ETH/USD</option>
                    <option>SOL/USD</option>
                  </select>
                </div>
                <button 
                  onClick={executeTrade}
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "Executing..." : "Execute Paper Trade"}
                </button>
                {tradeResult && (
                  <div className={`p-3 rounded-lg text-center ${tradeResult.isWin ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {tradeResult.message}
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-bold mb-4">Market Data</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-bold">BTC/USD</span>
                  <span className="text-green-600">+2.4%</span>
                  <span className="font-mono">$71,234</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-bold">ETH/USD</span>
                  <span className="text-green-600">+1.8%</span>
                  <span className="font-mono">$3,821</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-bold">SOL/USD</span>
                  <span className="text-green-600">+5.2%</span>
                  <span className="font-mono">$168</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === "team" && (
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Team Members</h3>
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">Invite Member</button>
            </div>
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-semibold">{member.name}</div>
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      member.role === "Admin" ? "bg-purple-100 text-purple-700" : 
                      member.role === "Trader" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                    }`}>
                      {member.role}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      member.status === "active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {member.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strategies Tab */}
        {activeTab === "strategies" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {strategies.map((strategy) => (
              <div key={strategy.id} className={`bg-white rounded-xl p-6 shadow-sm border ${strategy.active ? "border-indigo-300 bg-indigo-50" : ""}`}>
                <div className="text-3xl mb-3">{strategy.emoji}</div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{strategy.name}</h3>
                    <p className="text-sm text-gray-500">Risk: {strategy.risk}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-green-600 font-bold">{strategy.returns}</div>
                    {strategy.active && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Active</span>}
                  </div>
                </div>
                {!strategy.active && (
                  <button className="mt-4 w-full border border-indigo-600 text-indigo-600 py-2 rounded-lg hover:bg-indigo-50">
                    Activate
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Navigation Links */}
        <div className="mt-8 flex gap-4 justify-center pt-6 border-t">
          <Link to="/test/enterprise-audit" className="text-indigo-600 hover:text-indigo-800">View Audit Logs →</Link>
          <Link to="/test/enterprise-branding" className="text-indigo-600 hover:text-indigo-800">Branding Settings →</Link>
          <Link to="/test/enterprise-bot-controls" className="text-indigo-600 hover:text-indigo-800">Bot Controls →</Link>
        </div>
      </div>
    </div>
  );
}

// Functional Demo Audit
function DemoAudit() {
  const [logs] = useState([
    { id: 1, user: "alex@example.com", action: "Invited new team member", time: "2024-05-13 10:30 AM", ip: "192.168.1.1" },
    { id: 2, user: "sarah@example.com", action: "Changed trading strategy", time: "2024-05-13 09:15 AM", ip: "192.168.1.2" },
    { id: 3, user: "admin@example.com", action: "Enabled paper trading", time: "2024-05-12 02:00 PM", ip: "192.168.1.3" },
    { id: 4, user: "alex@example.com", action: "Updated risk limits", time: "2024-05-12 11:00 AM", ip: "192.168.1.1" },
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold">Audit Logs</h1>
            <p className="text-gray-500 text-sm mt-1">Demo Mode • View organization activity</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">User</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Action</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Time</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{log.user}</td>
                    <td className="px-6 py-4 text-sm">{log.action}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{log.time}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t text-center">
            <Link to="/test/enterprise-dashboard" className="text-indigo-600 hover:text-indigo-800">← Back to Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Functional Demo Branding
function DemoBranding() {
  const [branding, setBranding] = useState({
    logo: null,
    primaryColor: "#4f46e5",
    companyName: "My Enterprise",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold">Branding Settings</h1>
            <p className="text-gray-500 text-sm mt-1">Demo Mode • Customize your organization's appearance</p>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Company Name</label>
              <input 
                type="text" 
                value={branding.companyName}
                onChange={(e) => setBranding({...branding, companyName: e.target.value})}
                className="w-full border rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Primary Color</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({...branding, primaryColor: e.target.value})}
                  className="h-10 w-20 border rounded"
                />
                <input 
                  type="text" 
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({...branding, primaryColor: e.target.value})}
                  className="flex-1 border rounded-lg p-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Logo Preview</label>
              <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border">
                {branding.logo ? "Logo" : "No Logo"}
              </div>
            </div>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
              Save Changes (Demo)
            </button>
          </div>
          <div className="p-4 border-t text-center">
            <Link to="/test/enterprise-dashboard" className="text-indigo-600 hover:text-indigo-800">← Back to Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Functional Demo Bot Controls
function DemoBotControls() {
  const [paperEnabled, setPaperEnabled] = useState(true);
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [maxPositions, setMaxPositions] = useState(5);
  const [riskPerTrade, setRiskPerTrade] = useState(2);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold">Bot Controls</h1>
            <p className="text-gray-500 text-sm mt-1">Demo Mode • Configure your trading bot settings</p>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-semibold">Paper Trading</div>
                <div className="text-sm text-gray-500">Virtual funds - No real money</div>
              </div>
              <button 
                onClick={() => setPaperEnabled(!paperEnabled)}
                className={`px-4 py-2 rounded-lg ${paperEnabled ? "bg-green-600 text-white" : "bg-gray-300 text-gray-700"}`}
              >
                {paperEnabled ? "Active" : "Disabled"}
              </button>
            </div>

            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-semibold">Live Trading</div>
                <div className="text-sm text-gray-500">Real funds - Requires API keys</div>
              </div>
              <button 
                onClick={() => setLiveEnabled(!liveEnabled)}
                className={`px-4 py-2 rounded-lg ${liveEnabled ? "bg-red-600 text-white" : "bg-indigo-600 text-white"}`}
              >
                {liveEnabled ? "Stop Live" : "Enable Live"}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Max Positions: {maxPositions}</label>
              <input 
                type="range" 
                min="1" 
                max="20" 
                value={maxPositions}
                onChange={(e) => setMaxPositions(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Risk Per Trade: {riskPerTrade}%</label>
              <input 
                type="range" 
                min="1" 
                max="5" 
                step="0.5"
                value={riskPerTrade}
                onChange={(e) => setRiskPerTrade(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <button className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700">
              Save Settings (Demo)
            </button>
          </div>
          <div className="p-4 border-t text-center">
            <Link to="/test/enterprise-dashboard" className="text-indigo-600 hover:text-indigo-800">← Back to Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- TEST ROUTES COMPONENT (NO AUTH, FUNCTIONAL DEMOS) ----------------
function TestRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Original working wizard */}
        <Route path="/test/wizard" element={<EnterpriseOnboardingWizard />} />
        
        {/* Functional demo versions (no auth required) */}
        <Route path="/test/enterprise-dashboard" element={<DemoDashboard />} />
        <Route path="/test/enterprise-audit" element={<DemoAudit />} />
        <Route path="/test/enterprise-branding" element={<DemoBranding />} />
        <Route path="/test/enterprise-bot-controls" element={<DemoBotControls />} />
        
        {/* These use the same dashboard as they're linked from there */}
        <Route path="/test/enterprise-team" element={<DemoDashboard />} />
        <Route path="/test/enterprise-strategies" element={<DemoDashboard />} />
        <Route path="/test/enterprise-analytics" element={<DemoDashboard />} />
        
        <Route path="/test/*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

// ---------------- MAIN APP ROUTES (WITH HEADER/FOOTER) ----------------
function MainAppRoutes() {
  const { loading, user } = useAuth();
  if (loading) return <LoadingSpinner />;

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 bg-white text-gray-900">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* MAIN MARKETING PAGES */}
            <Route path="/" element={<Home />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/support" element={<Support />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/funding-guide" element={<FundingGuide />} />
            <Route path="/referrals" element={<ReferralSystem />} />
            
            {/* ENTERPRISE PAGES - BOTH VERSIONS */}
            <Route path="/Enterprise" element={<Enterprise />} />
            <Route path="/EnterpriseDemo" element={<EnterpriseDemo />} />
            
            {/* Demo redirect */}
            <Route path="/demo" element={<Navigate to="/trade-demo" replace />} />
            <Route path="/trade-demo" element={<TradeDemo />} />
            <Route path="/live" element={<PublicDashboard />} />

            {/* LANDING PAGE ROUTES */}
            <Route path="/redditA" element={<LandingPages />} />
            <Route path="/redditB" element={<LandingPages />} />
            <Route path="/xA" element={<LandingPages />} />
            <Route path="/xB" element={<LandingPages />} />
            <Route path="/liA" element={<LandingPages />} />
            <Route path="/liB" element={<LandingPages />} />
            <Route path="/tgA" element={<LandingPages />} />
            <Route path="/tgB" element={<LandingPages />} />
            <Route path="/socialA" element={<LandingPages />} />
            <Route path="/socialB" element={<LandingPages />} />

            {/* NEWSLETTER */}
            <Route path="/newsletter" element={<Newsletter />} />
            <Route path="/newsletter/success" element={<NewsletterSuccess />} />

            {/* AUTH ROUTES */}
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={user ? <Navigate to="/after-login" replace /> : <Login />} />
            <Route path="/after-login" element={<RequireAuth><PostLoginRedirect /></RequireAuth>} />

            {/* BILLING */}
            <Route path="/billing/success" element={<BillingSuccess />} />
            <Route path="/billing" element={<RequireAuth><Billing /></RequireAuth>} />
            <Route path="/billing-dashboard" element={<RequireAuth><BillingDashboard /></RequireAuth>} />
            <Route path="/settings/billing" element={<Navigate to="/billing-dashboard" replace />} />

            {/* ACTIVATION */}
            <Route path="/activation" element={<RedirectIfActivated><Activation /></RedirectIfActivated>} />

            {/* REGULAR DASHBOARD */}
            <Route path="/dashboard" element={<RequireActivation><MemberDashboard /></RequireActivation>} />
            <Route path="/members" element={<Navigate to="/dashboard" replace />} />

            {/* AUTHENTICATED ENTERPRISE DASHBOARD ROUTES */}
            <Route path="/enterprise/dashboard" element={<RequireEnterprise><EnterpriseDashboard /></RequireEnterprise>} />
            <Route path="/enterprise/team" element={<RequireEnterpriseAdmin><TeamPage /></RequireEnterpriseAdmin>} />
            <Route path="/enterprise/strategies" element={<RequireEnterpriseAdmin><StrategiesPage /></RequireEnterpriseAdmin>} />
            <Route path="/enterprise/analytics" element={<RequireEnterprise><AnalyticsPage /></RequireEnterprise>} />
            <Route path="/enterprise/audit" element={<RequireEnterpriseAdmin><AuditPage /></RequireEnterpriseAdmin>} />
            <Route path="/enterprise/branding" element={<RequireEnterpriseAdmin><BrandingPage /></RequireEnterpriseAdmin>} />
            <Route path="/enterprise/bot-controls" element={<RequireEnterpriseAdmin><BotControlsPage /></RequireEnterpriseAdmin>} />

            {/* ADMIN ROUTES */}
            <Route path="/admin/*" element={<RequireAuth><RequireAdmin><AdminPanel /></RequireAdmin></RequireAuth>} />
            <Route path="/admin/enterprise-requests" element={<RequireAuth><RequireAdmin><Suspense fallback={<PageFallback />}><EnterpriseRequestsPage /></Suspense></RequireAdmin></RequireAuth>} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

// ---------------- ROOT APP ----------------
function AppContent() {
  const location = useLocation();
  
  // Check if we're on a test route
  const isTestRoute = location.pathname.startsWith('/test');
  
  if (isTestRoute) {
    // Render test routes WITHOUT Header/Footer - using functional demo components
    return <TestRoutes />;
  }
  
  // Render main app WITH Header/Footer
  return <MainAppRoutes />;
}

// ---------------- ROOT ----------------
export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
