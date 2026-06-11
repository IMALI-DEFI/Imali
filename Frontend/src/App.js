// App.js - COMPLETE REWRITE with connection pages added

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

// ==================== ENTERPRISE PAGES ====================
import Enterprise from "./pages/Enterprise";
import EnterpriseDemo from "./pages/EnterpriseDemo";
import EnterpriseOnboardingWizard from "./components/enterprise/EnterpriseOnboardingWizard";
import EnterpriseDashboard from "./pages/EnterpriseDashboard";

// ==================== MARKETING PAGES ====================
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

// ==================== LAZY AUTH / APP PAGES ====================
const Signup = lazy(() => import("./pages/SignupForm"));
const Login = lazy(() => import("./pages/Login"));
const Activation = lazy(() => import("./pages/Activation"));
const Billing = lazy(() => import("./pages/Billing"));
const BillingSuccess = lazy(() => import("./pages/BillingSuccess"));
const BillingDashboard = lazy(() => import("./pages/BillingDashboard"));
const Pricing = lazy(() => import("./pages/Pricing"));

// ==================== CONNECTION PAGES ====================
// NOTE: Your file is currently named ConnectAlpace.jsx, so this import matches it.
const ConnectOKX = lazy(() => import("./pages/ConnectOKX"));
const ConnectAlpaca = lazy(() => import("./pages/ConnectAlpace"));
const ConnectWallet = lazy(() => import("./pages/ConnectWallet"));

// ==================== ENTERPRISE DASHBOARD PAGES ====================
const TeamPage = lazy(() => import("./pages/TeamPage"));
const StrategiesPage = lazy(() => import("./pages/StrategiesPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const AuditPage = lazy(() => import("./pages/AuditPage"));
const BrandingPage = lazy(() => import("./pages/BrandingPage"));
const BotControlsPage = lazy(() => import("./pages/BotsControlsPage"));

// ==================== ADMIN ENTERPRISE PAGES ====================
const EnterpriseRequestsPage = lazy(() =>
  import("./pages/admin/EnterpriseRequestsPage")
);

// ==================== CONSTANTS ====================
const PAID_TIERS = [
  "pro",
  "common",
  "elite",
  "rare",
  "epic",
  "legendary",
  "enterprise",
  "bundle",
];

function isPaidTier(tier) {
  return PAID_TIERS.includes(String(tier || "").toLowerCase());
}

// ==================== ERROR BOUNDARY ====================
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
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

// ==================== LOADERS ====================
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

// ==================== ROUTE GUARDS ====================
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  return children;
}

function RequireAdmin({ children }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function RequireEnterprise({ children }) {
  const { user, loading, isEnterpriseUser } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  if (!isEnterpriseUser) {
    return <Navigate to="/pricing" replace />;
  }

  return children;
}

function RequireEnterpriseAdmin({ children }) {
  const { user, loading, isEnterpriseAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  if (!isEnterpriseAdmin) {
    return <Navigate to="/enterprise/dashboard" replace />;
  }

  return children;
}

function RequireActivation({ children }) {
  const { user, activation, activationComplete, loading, isAdmin } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  if (isAdmin) return children;

  const tier = user?.tier || "starter";
  const isPaid = isPaidTier(tier);

  if (!isPaid) return children;

  const hasCard =
    activation?.has_card_on_file ||
    activation?.billing_complete ||
    user?.has_card_on_file ||
    user?.billing_complete;

  if (!activationComplete) {
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

  const tier = user?.tier || "starter";
  const isPaid = isPaidTier(tier);

  if (!isPaid) return <Navigate to="/dashboard" replace />;
  if (activationComplete) return <Navigate to="/dashboard" replace />;

  return children;
}

// ==================== POST LOGIN REDIRECT ====================
function PostLoginRedirect() {
  const { user, loading, isAdmin, isEnterpriseUser } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login", {
        replace: true,
      });
      return;
    }

    if (isEnterpriseUser) {
      navigate("/enterprise/dashboard", {
        replace: true,
      });
      return;
    }

    if (isAdmin) {
      navigate("/admin", {
        replace: true,
      });
      return;
    }

    const tier = user?.tier || "starter";
    const isPaid = isPaidTier(tier);

    if (!isPaid) {
      navigate("/dashboard", {
        replace: true,
      });
      return;
    }

    const hasCard = user?.has_card_on_file || user?.billing_complete;

    if (!hasCard) {
      navigate("/billing", {
        replace: true,
        state: {
          tier,
        },
      });
      return;
    }

    navigate("/dashboard", {
      replace: true,
    });
  }, [user, loading, navigate, isAdmin, isEnterpriseUser]);

  return <LoadingSpinner />;
}

// ==================== 404 ====================
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

// ==================== TEST ROUTES ====================
function TestRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/test/wizard" element={<EnterpriseOnboardingWizard />} />
        <Route
          path="/test/enterprise-dashboard"
          element={<EnterpriseDashboard demoMode={true} />}
        />
        <Route
          path="/test/enterprise-team"
          element={<EnterpriseDashboard demoMode={true} />}
        />
        <Route
          path="/test/enterprise-strategies"
          element={<EnterpriseDashboard demoMode={true} />}
        />
        <Route
          path="/test/enterprise-analytics"
          element={<EnterpriseDashboard demoMode={true} />}
        />
        <Route
          path="/test/enterprise-audit"
          element={<EnterpriseDashboard demoMode={true} />}
        />
        <Route
          path="/test/enterprise-branding"
          element={<EnterpriseDashboard demoMode={true} />}
        />
        <Route
          path="/test/enterprise-bot-controls"
          element={<EnterpriseDashboard demoMode={true} />}
        />
        <Route path="/test/*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

// ==================== MAIN APP ROUTES ====================
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

            {/* ENTERPRISE PUBLIC PAGES */}
            <Route path="/Enterprise" element={<Enterprise />} />
            <Route path="/EnterpriseDemo" element={<EnterpriseDemo />} />

            {/* DEMO ROUTES */}
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
            <Route path="/signup/:tier" element={<Signup />} />
            <Route
              path="/login"
              element={user ? <Navigate to="/after-login" replace /> : <Login />}
            />
            <Route
              path="/after-login"
              element={
                <RequireAuth>
                  <PostLoginRedirect />
                </RequireAuth>
              }
            />

            {/* BILLING ROUTES */}
            <Route
              path="/billing"
              element={
                <RequireAuth>
                  <Billing />
                </RequireAuth>
              }
            />
            <Route
              path="/billing/:tier"
              element={
                <RequireAuth>
                  <Billing />
                </RequireAuth>
              }
            />
            <Route path="/billing/success" element={<BillingSuccess />} />
            <Route
              path="/billing-dashboard"
              element={
                <RequireAuth>
                  <BillingDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/settings/billing"
              element={<Navigate to="/billing-dashboard" replace />}
            />

            {/* UPGRADE ROUTES */}
            <Route
              path="/upgrade"
              element={
                <RequireAuth>
                  <Billing />
                </RequireAuth>
              }
            />
            <Route
              path="/upgrade/:tier"
              element={
                <RequireAuth>
                  <Billing />
                </RequireAuth>
              }
            />

            {/* ACTIVATION */}
            <Route
              path="/activation"
              element={
                <RedirectIfActivated>
                  <Activation />
                </RedirectIfActivated>
              }
            />

            {/* REGULAR DASHBOARD */}
            <Route
              path="/dashboard"
              element={
                <RequireActivation>
                  <MemberDashboard />
                </RequireActivation>
              }
            />
            <Route path="/members" element={<Navigate to="/dashboard" replace />} />

            {/* CONNECTION MANAGEMENT ROUTES */}
            <Route
              path="/connect-okx"
              element={
                <RequireActivation>
                  <ConnectOKX />
                </RequireActivation>
              }
            />
            <Route
              path="/connect-alpaca"
              element={
                <RequireActivation>
                  <ConnectAlpaca />
                </RequireActivation>
              }
            />
            <Route
              path="/connect-wallet"
              element={
                <RequireActivation>
                  <ConnectWallet />
                </RequireActivation>
              }
            />

            {/* ENTERPRISE DASHBOARD ROUTES */}
            <Route
              path="/enterprise/dashboard"
              element={
                <RequireEnterprise>
                  <EnterpriseDashboard demoMode={false} />
                </RequireEnterprise>
              }
            />
            <Route
              path="/enterprise-dashboard"
              element={<Navigate to="/enterprise/dashboard" replace />}
            />

            <Route
              path="/enterprise/team"
              element={
                <RequireEnterpriseAdmin>
                  <TeamPage />
                </RequireEnterpriseAdmin>
              }
            />
            <Route
              path="/enterprise/strategies"
              element={
                <RequireEnterpriseAdmin>
                  <StrategiesPage />
                </RequireEnterpriseAdmin>
              }
            />
            <Route
              path="/enterprise/analytics"
              element={
                <RequireEnterprise>
                  <AnalyticsPage />
                </RequireEnterprise>
              }
            />
            <Route
              path="/enterprise/audit"
              element={
                <RequireEnterpriseAdmin>
                  <AuditPage />
                </RequireEnterpriseAdmin>
              }
            />
            <Route
              path="/enterprise/branding"
              element={
                <RequireEnterpriseAdmin>
                  <BrandingPage />
                </RequireEnterpriseAdmin>
              }
            />
            <Route
              path="/enterprise/bot-controls"
              element={
                <RequireEnterpriseAdmin>
                  <BotControlsPage />
                </RequireEnterpriseAdmin>
              }
            />

            {/* ADMIN ROUTES */}
            <Route
              path="/admin/*"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AdminPanel />
                  </RequireAdmin>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/enterprise-requests"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <EnterpriseRequestsPage />
                  </RequireAdmin>
                </RequireAuth>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
    </>
  );
}

// ==================== ROOT APP ====================
function AppContent() {
  const location = useLocation();
  const isTestRoute = location.pathname.startsWith("/test");

  if (isTestRoute) {
    return <TestRoutes />;
  }

  return <MainAppRoutes />;
}

// ==================== EXPORT ====================
export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AppErrorBoundary>
  );
}