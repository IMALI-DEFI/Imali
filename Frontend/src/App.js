import React, { lazy, Suspense } from "react";
import {
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

/* Layout */
import Header from "./components/Header";
import Footer from "./components/Footer";

/* Core */
import MemberDashboard from "./components/Dashboard/MemberDashboard";
import AdminPanel from "./components/AdminPanel";

/* Demo */
import TradeDemo from "./pages/TradeDemo";

/* Auth / Onboarding - Lazy load */
const Signup = lazy(() => import("./pages/SignupForm"));
const Login = lazy(() => import("./pages/Login"));
const Activation = lazy(() => import("./pages/Activation"));
const Billing = lazy(() => import("./pages/Billing"));
const BillingDashboard = lazy(() => import("./pages/BillingDashboard"));

/* Marketing */
import Home from "./pages/Home";
import AboutUs from "./pages/AboutUs";
import HowItWorks from "./pages/HowItWorks";
import Pricing from "./pages/Pricing";
import Support from "./pages/Support";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import FundingGuide from "./pages/FundingGuide";

/* Public Dashboard */
import PublicDashboard from "./pages/PublicDashboard";

/* Referral Page */
import ReferralSystem from "./components/ReferralSystem";

/* Context Providers */
import { AuthProvider, useAuth } from "./context/AuthContext";

/* =====================================================
   ERROR BOUNDARY
===================================================== */
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[AppErrorBoundary] App crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center px-6">
          <div className="max-w-xl w-full text-center">
            <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              The app hit a runtime error, but this screen confirms React is still loading.
            </p>
            <pre className="text-left text-xs bg-gray-100 border border-gray-200 rounded-lg p-4 overflow-auto whitespace-pre-wrap">
              {String(this.state.error)}
            </pre>
            <div className="mt-6">
              <a
                href="/"
                className="inline-block px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 transition text-white"
              >
                Reload Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/* =====================================================
   LOADING SPINNER
===================================================== */
function LoadingSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
    </div>
  );
}

/* =====================================================
   PAGE LOADING FALLBACK
===================================================== */
function PageLoadingFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );
}

/* =====================================================
   ROUTE GUARDS
===================================================== */
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
}

function RequireActivation({ children }) {
  const { user, activation, activationComplete, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  const isAdmin = user?.is_admin === true;
  if (isAdmin) return children;

  if (!activationComplete) {
    const hasCard = activation?.has_card_on_file || activation?.billing_complete;

    if (!hasCard) {
      return <Navigate to="/billing" replace />;
    }

    return <Navigate to="/activation" replace />;
  }

  return children;
}

function RedirectIfActivated({ children }) {
  const { user, activationComplete, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: "/activation" }} />;
  }

  if (activationComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/* =====================================================
   POST-LOGIN REDIRECT
===================================================== */
function PostLoginRedirect() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [redirecting, setRedirecting] = React.useState(true);

  React.useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    if (user?.is_admin === true) {
      navigate("/dashboard", { replace: true });
      setRedirecting(false);
      return;
    }

    const determineRedirect = async () => {
      try {
        const BotAPI = (await import("./utils/BotAPI")).default;
        const activationRes = await BotAPI.activationStatus();
        const status = activationRes?.status || activationRes;

        if (!status?.has_card_on_file) {
          navigate("/billing", { replace: true });
        } else if (!status?.trading_enabled) {
          navigate("/activation", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch (err) {
        console.error("Failed to get activation status:", err);
        navigate("/dashboard", { replace: true });
      } finally {
        setRedirecting(false);
      }
    };

    determineRedirect();
  }, [user, loading, navigate]);

  if (redirecting || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4" />
          <p className="text-gray-500">Setting up your account...</p>
        </div>
      </div>
    );
  }

  return null;
}

/* =====================================================
   404
===================================================== */
function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 text-center">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Page not found</h1>
        <p className="mb-4 text-gray-600">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link to="/" className="text-emerald-600 underline">
          Go home
        </Link>
      </div>
    </div>
  );
}

/* =====================================================
   APP CONTENT
===================================================== */
function AppContent() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 bg-white text-gray-900">
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/support" element={<Support />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/funding-guide" element={<FundingGuide />} />
            <Route path="/referrals" element={<ReferralSystem />} />
            <Route path="/demo" element={<Navigate to="/trade-demo" replace />} />
            <Route path="/trade-demo" element={<TradeDemo />} />
            <Route path="/live" element={<PublicDashboard />} />
            <Route path="/signup" element={<Signup />} />
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
            <Route
              path="/billing"
              element={
                <RequireAuth>
                  <Billing />
                </RequireAuth>
              }
            />
            <Route
              path="/activation"
              element={
                <RedirectIfActivated>
                  <Activation />
                </RedirectIfActivated>
              }
            />
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
            <Route
              path="/dashboard"
              element={
                <RequireActivation>
                  <MemberDashboard />
                </RequireActivation>
              }
            />
            <Route path="/members" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminPanel />
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

/* =====================================================
   APP ROOT
===================================================== */
export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AppErrorBoundary>
  );
}