import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import MemberDashboard from "./components/Dashboard/MemberDashboard";
import AdminPanel from "./components/AdminPanel";
import TradeDemo from "./pages/TradeDemo";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/routing/ProtectedRoute";

// Enterprise
import Enterprise from "./pages/Enterprise";
import EnterpriseDemo from "./pages/EnterpriseDemo";
import EnterpriseOnboardingWizard from "./components/enterprise/EnterpriseOnboardingWizard";
import EnterpriseDashboard from "./pages/EnterpriseDashboard";

// Marketing
import Home from "./pages/Home";
import AboutUs from "./pages/AboutUs";
import HowItWorks from "./pages/HowItWorks";
import Support from "./pages/Support";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import FundingGuide from "./pages/FundingGuide";
import PublicDashboard from "./pages/PublicDashboard";
import ReferralSystem from "./pages/ReferralPartner";
import LandingPages from "./pages/LandingPages";
import Newsletter from "./pages/Newsletter";
import NewsletterSuccess from "./pages/NewsletterSuccess";

// Lazy auth / app pages
const Signup = lazy(() => import("./pages/SignupForm"));
const Login = lazy(() => import("./pages/Login"));
const Activation = lazy(() => import("./pages/Activation"));
const Billing = lazy(() => import("./pages/Billing"));
const BillingSuccess = lazy(() => import("./pages/BillingSuccess"));
const BillingDashboard = lazy(() => import("./pages/BillingDashboard"));
const Pricing = lazy(() => import("./pages/Pricing"));

// Connection pages
const ConnectOKX = lazy(() => import("./pages/ConnectOKX"));
const ConnectAlpaca = lazy(() => import("./pages/ConnectAlpaca"));
const ConnectWallet = lazy(() => import("./pages/ConnectWallet"));

// Enterprise dashboard pages
const TeamPage = lazy(() => import("./pages/TeamPage"));
const StrategiesPage = lazy(() => import("./pages/StrategiesPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const AuditPage = lazy(() => import("./pages/AuditPage"));
const BrandingPage = lazy(() => import("./pages/BrandingPage"));
const BotControlsPage = lazy(() => import("./pages/BotsControlsPage"));
const EnterpriseRequestsPage = lazy(() => import("./pages/admin/EnterpriseRequestsPage"));

// ==================== ERROR BOUNDARY ====================
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
        <div className="min-h-screen flex items-center justify-center px-6 bg-[#050816] text-white">
          <div className="max-w-xl text-center">
            <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
            <p className="text-white/60 mb-6">Please refresh the page or try again later.</p>
            <Link to="/" className="inline-block px-5 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition">
              Go Home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==================== LOADERS ====================
function LoadingSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#050816] z-50">
      <div className="h-10 w-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
    </div>
  );
}

function PageFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-[#050816]">
      <div className="text-center">
        <div className="h-8 w-8 rounded-full border-b-2 border-emerald-500 animate-spin mx-auto mb-3" />
        <p className="text-white/50">Loading...</p>
      </div>
    </div>
  );
}

// ==================== ROUTE GUARDS ====================
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function RequireAdmin({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin && user?.email !== "wayne@imali-defi.com") return <Navigate to="/dashboard" replace />;
  return children;
}

function RequireEnterprise({ children }) {
  const { user, loading, isEnterpriseUser } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isEnterpriseUser) return <Navigate to="/pricing" replace />;
  return children;
}

function RequireEnterpriseAdmin({ children }) {
  const { user, loading, isEnterpriseAdmin } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isEnterpriseAdmin) return <Navigate to="/enterprise/dashboard" replace />;
  return children;
}

function RedirectIfActivated({ children }) {
  const { user, activationComplete, loading, isAdmin } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin || user?.is_admin || user?.email === "wayne@imali-defi.com") return children;
  if (user?.tier === "starter") return <Navigate to="/dashboard" replace />;
  if (activationComplete) return <Navigate to="/dashboard" replace />;
  return children;
}

// ==================== POST-LOGIN REDIRECT ====================
function PostLoginRedirect() {
  const { user, loading, isAdmin, isEnterpriseUser, activation } = useAuth();
  const navigate = useNavigate();
  React.useEffect(() => {
    if (loading) return;
    if (!user) { 
      navigate("/login", { replace: true }); 
      return; 
    }
    if (isEnterpriseUser) { 
      navigate("/enterprise/dashboard", { replace: true }); 
      return; 
    }
    if (isAdmin || user?.is_admin || user?.email === "wayne@imali-defi.com") { 
      navigate("/admin", { replace: true }); 
      return; 
    }
    const tier = (user?.tier || "starter").toLowerCase();
    if (tier === "starter") { 
      navigate("/dashboard", { replace: true }); 
      return; 
    }
    // ✅ ONLY check has_card_on_file - NOT billing_complete
    const hasPaid = user?.subscription_status === "active" || activation?.has_card_on_file === true;
    if (!hasPaid) { 
      navigate(`/billing?tier=${tier}`, { replace: true, state: { tier } }); 
      return; 
    }
    navigate("/dashboard", { replace: true });
  }, [user, loading, navigate, isAdmin, isEnterpriseUser, activation]);
  return <LoadingSpinner />;
}

// ==================== 404 ====================
function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center px-6 bg-[#050816] text-white">
      <div>
        <h1 className="text-3xl font-bold mb-3">Page not found</h1>
        <p className="text-white/60 mb-4">The page you're looking for doesn't exist.</p>
        <Link to="/" className="text-emerald-400 underline hover:text-emerald-300 transition">
          Go Home
        </Link>
      </div>
    </div>
  );
}

// ==================== MAIN APP ROUTES ====================
function MainAppRoutes() {
  const { loading, user } = useAuth();
  if (loading) return <LoadingSpinner />;

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 bg-[#050816] text-white">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* PUBLIC */}
            <Route path="/" element={<Home />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/support" element={<Support />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/funding-guide" element={<FundingGuide />} />
            <Route path="/referrals" element={<ReferralSystem />} />
            <Route path="/enterprise" element={<Enterprise />} />
            <Route path="/enterprise-demo" element={<EnterpriseDemo />} />
            <Route path="/demo" element={<Navigate to="/trade-demo" replace />} />
            <Route path="/trade-demo" element={<TradeDemo />} />
            <Route path="/live" element={<PublicDashboard />} />
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
            <Route path="/newsletter" element={<Newsletter />} />
            <Route path="/newsletter/success" element={<NewsletterSuccess />} />

            {/* AUTH */}
            <Route path="/signup" element={<Signup />} />
            <Route path="/signup/:tier" element={<Signup />} />
            <Route path="/login" element={user ? <Navigate to="/after-login" replace /> : <Login />} />
            <Route path="/after-login" element={<RequireAuth><PostLoginRedirect /></RequireAuth>} />

            {/* BILLING */}
            <Route path="/billing" element={<RequireAuth><Billing /></RequireAuth>} />
            <Route path="/billing/:tier" element={<RequireAuth><Billing /></RequireAuth>} />
            <Route path="/billing/success" element={<BillingSuccess />} />
            <Route path="/billing-dashboard" element={<RequireAuth><BillingDashboard /></RequireAuth>} />
            <Route path="/settings/billing" element={<Navigate to="/billing-dashboard" replace />} />
            <Route path="/upgrade" element={<RequireAuth><Billing /></RequireAuth>} />
            <Route path="/upgrade/:tier" element={<RequireAuth><Billing /></RequireAuth>} />

            {/* ACTIVATION */}
            <Route path="/activation" element={
              <ProtectedRoute requirePaid={true}>
                <RedirectIfActivated><Activation /></RedirectIfActivated>
              </ProtectedRoute>
            } />

            {/* DASHBOARD */}
            <Route path="/dashboard" element={
              <ProtectedRoute requirePaid={false} requireActivation={false}>
                <MemberDashboard />
              </ProtectedRoute>
            } />
            <Route path="/members" element={<Navigate to="/dashboard" replace />} />

            {/* CONNECTION PAGES */}
            <Route path="/connect-okx" element={
              <ProtectedRoute requirePaid={true} requireActivation={true}>
                <ConnectOKX />
              </ProtectedRoute>
            } />
            <Route path="/connect-alpaca" element={
              <ProtectedRoute requirePaid={true} requireActivation={true}>
                <ConnectAlpaca />
              </ProtectedRoute>
            } />
            <Route path="/connect-wallet" element={
              <ProtectedRoute requirePaid={true} requireActivation={true}>
                <ConnectWallet />
              </ProtectedRoute>
            } />

            {/* ENTERPRISE ONBOARDING */}
            <Route path="/enterprise/onboarding" element={
              <RequireEnterprise><EnterpriseOnboardingWizard /></RequireEnterprise>
            } />

            {/* ENTERPRISE DASHBOARD */}
            <Route path="/enterprise/dashboard" element={<RequireEnterprise><EnterpriseDashboard demoMode={false} /></RequireEnterprise>} />
            <Route path="/enterprise-dashboard" element={<Navigate to="/enterprise/dashboard" replace />} />
            <Route path="/enterprise/team" element={<RequireEnterpriseAdmin><TeamPage /></RequireEnterpriseAdmin>} />
            <Route path="/enterprise/strategies" element={<RequireEnterpriseAdmin><StrategiesPage /></RequireEnterpriseAdmin>} />
            <Route path="/enterprise/analytics" element={<RequireEnterprise><AnalyticsPage /></RequireEnterprise>} />
            <Route path="/enterprise/audit" element={<RequireEnterpriseAdmin><AuditPage /></RequireEnterpriseAdmin>} />
            <Route path="/enterprise/branding" element={<RequireEnterpriseAdmin><BrandingPage /></RequireEnterpriseAdmin>} />
            <Route path="/enterprise/bot-controls" element={<RequireEnterpriseAdmin><BotControlsPage /></RequireEnterpriseAdmin>} />

            {/* ADMIN */}
            <Route path="/admin/enterprise-requests" element={<RequireAuth><RequireAdmin><EnterpriseRequestsPage /></RequireAdmin></RequireAuth>} />
            <Route path="/admin/*" element={<RequireAuth><RequireAdmin><AdminPanel /></RequireAdmin></RequireAuth>} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

// ==================== ROOT ====================
export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <MainAppRoutes />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
