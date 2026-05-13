// App.js (with Landing + Newsletter pages + Enterprise Support - BOTH VERSIONS)

import React, { lazy, Suspense } from "react";
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

// ---------------- SIMPLE DEMO COMPONENTS (NO AUTH) ----------------
// These are simplified versions for demo/testing purposes only

function SimpleDemoCard({ title, children }) {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
          <p className="text-gray-600 mb-6">This is a demo version for testing purposes.</p>
          <div className="space-y-4">
            {children}
          </div>
          <div className="mt-8 pt-4 border-t">
            <Link to="/test/enterprise-dashboard" className="text-indigo-600 hover:text-indigo-800 mr-4">← Back to Dashboard</Link>
            <Link to="/" className="text-gray-500 hover:text-gray-700">Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function SimpleDashboard() {
  return (
    <SimpleDemoCard title="Enterprise Dashboard (Demo Mode)">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-indigo-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-indigo-600">$12,450</div>
          <div className="text-gray-600">Total P&L</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">68%</div>
          <div className="text-gray-600">Win Rate</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">156</div>
          <div className="text-gray-600">Total Trades</div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/test/enterprise-team" className="bg-gray-100 p-3 rounded-lg text-center hover:bg-gray-200">👥 Team</Link>
        <Link to="/test/enterprise-strategies" className="bg-gray-100 p-3 rounded-lg text-center hover:bg-gray-200">📊 Strategies</Link>
        <Link to="/test/enterprise-analytics" className="bg-gray-100 p-3 rounded-lg text-center hover:bg-gray-200">📈 Analytics</Link>
        <Link to="/test/enterprise-audit" className="bg-gray-100 p-3 rounded-lg text-center hover:bg-gray-200">🔍 Audit</Link>
      </div>
    </SimpleDemoCard>
  );
}

function SimpleTeam() {
  return (
    <SimpleDemoCard title="Team Management (Demo Mode)">
      <div className="space-y-3">
        {[
          { name: "Admin User", email: "admin@example.com", role: "Admin" },
          { name: "Trader 1", email: "trader1@example.com", role: "Member" },
          { name: "Trader 2", email: "trader2@example.com", role: "Member" },
        ].map((member, i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-semibold">{member.name}</div>
              <div className="text-sm text-gray-500">{member.email}</div>
            </div>
            <span className="px-2 py-1 bg-gray-100 rounded text-sm">{member.role}</span>
          </div>
        ))}
      </div>
    </SimpleDemoCard>
  );
}

function SimpleStrategies() {
  return (
    <SimpleDemoCard title="Custom Strategies (Demo Mode)">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { name: "Conservative", risk: "Low", returns: "+8%", emoji: "🛡️" },
          { name: "Balanced", risk: "Medium", returns: "+15%", emoji: "⚖️" },
          { name: "Momentum", risk: "High", returns: "+22%", emoji: "🔥" },
          { name: "Arbitrage", risk: "Low", returns: "+12%", emoji: "🔄" },
        ].map((s, i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="text-2xl mb-2">{s.emoji}</div>
            <div className="font-bold">{s.name}</div>
            <div className="text-sm text-gray-500">Risk: {s.risk} • Returns: {s.returns}</div>
          </div>
        ))}
      </div>
    </SimpleDemoCard>
  );
}

function SimpleAnalytics() {
  return (
    <SimpleDemoCard title="Analytics (Demo Mode)">
      <div className="space-y-4">
        <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
          📊 Chart Placeholder - Performance Graph
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-3 rounded text-center">
            <div className="text-2xl font-bold text-green-600">+8.2%</div>
            <div className="text-sm text-gray-600">Best Trade</div>
          </div>
          <div className="bg-red-50 p-3 rounded text-center">
            <div className="text-2xl font-bold text-red-600">-3.1%</div>
            <div className="text-sm text-gray-600">Worst Trade</div>
          </div>
        </div>
      </div>
    </SimpleDemoCard>
  );
}

function SimpleAudit() {
  return (
    <SimpleDemoCard title="Audit Logs (Demo Mode)">
      <div className="space-y-2">
        {[
          { action: "User invited", user: "admin@example.com", time: "2 hours ago" },
          { action: "Strategy changed", user: "trader1@example.com", time: "1 day ago" },
          { action: "Paper trading started", user: "system", time: "3 days ago" },
        ].map((log, i) => (
          <div key={i} className="flex justify-between items-center p-2 border-b">
            <div>
              <div className="font-medium">{log.action}</div>
              <div className="text-sm text-gray-500">{log.user}</div>
            </div>
            <div className="text-sm text-gray-400">{log.time}</div>
          </div>
        ))}
      </div>
    </SimpleDemoCard>
  );
}

function SimpleBranding() {
  return (
    <SimpleDemoCard title="Branding (Demo Mode)">
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <label className="block text-sm font-medium mb-2">Organization Logo</label>
          <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">Logo</div>
        </div>
        <div className="border rounded-lg p-4">
          <label className="block text-sm font-medium mb-2">Primary Color</label>
          <div className="w-full h-10 bg-indigo-600 rounded"></div>
        </div>
      </div>
    </SimpleDemoCard>
  );
}

function SimpleBotControls() {
  return (
    <SimpleDemoCard title="Bot Controls (Demo Mode)">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <div className="font-semibold">Paper Trading</div>
            <div className="text-sm text-gray-500">Virtual funds - $10,000 balance</div>
          </div>
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">Active</span>
        </div>
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <div className="font-semibold">Live Trading</div>
            <div className="text-sm text-gray-500">Real funds - Disabled</div>
          </div>
          <button className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm">Enable</button>
        </div>
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <div className="font-semibold">Max Positions</div>
            <div className="text-sm text-gray-500">Current limit: 5</div>
          </div>
          <input type="range" min="1" max="20" defaultValue="5" className="w-32" />
        </div>
      </div>
    </SimpleDemoCard>
  );
}

// ---------------- TEST ROUTES COMPONENT (NO AUTH, SIMPLE DEMOS) ----------------
function TestRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Original working wizard */}
        <Route path="/test/wizard" element={<EnterpriseOnboardingWizard />} />
        
        {/* Simple demo versions (no auth required) */}
        <Route path="/test/enterprise-dashboard" element={<SimpleDashboard />} />
        <Route path="/test/enterprise-team" element={<SimpleTeam />} />
        <Route path="/test/enterprise-strategies" element={<SimpleStrategies />} />
        <Route path="/test/enterprise-analytics" element={<SimpleAnalytics />} />
        <Route path="/test/enterprise-audit" element={<SimpleAudit />} />
        <Route path="/test/enterprise-branding" element={<SimpleBranding />} />
        <Route path="/test/enterprise-bot-controls" element={<SimpleBotControls />} />
        
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
    // Render test routes WITHOUT Header/Footer - using simple demo components
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
