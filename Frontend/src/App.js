// App.js (with Landing + Newsletter pages + Fixed Admin Protection)

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

// Lazy Loaded Auth / App Pages
const Signup = lazy(() => import("./pages/SignupForm"));
const Login = lazy(() => import("./pages/Login"));
const Activation = lazy(() => import("./pages/Activation"));
const Billing = lazy(() => import("./pages/Billing"));
const BillingSuccess = lazy(() => import("./pages/BillingSuccess"));
const BillingDashboard = lazy(() => import("./pages/BillingDashboard"));

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

// NEW LANDING PAGES
import LandingPages from "./pages/LandingPages";

// NEW NEWSLETTER PAGES
import Newsletter from "./pages/Newsletter";
import NewsletterSuccess from "./pages/NewsletterSuccess";

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

// NEW: RequireAdmin guard - prevents admin components from loading for non-admins
function RequireAdmin({ children }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  
  // Check if user is admin
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
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
    const hasCard =
      activation?.has_card_on_file || activation?.billing_complete;

    if (!hasCard) return <Navigate to="/billing" replace />;
    return <Navigate to="/activation" replace />;
  }

  return children;
}

function RedirectIfActivated({ children }) {
  const { user, activationComplete, loading, isAdmin } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  
  // Admins can always access activation page if needed
  if (isAdmin) return children;
  
  if (activationComplete) return <Navigate to="/dashboard" replace />;

  return children;
}

// ---------------- POST LOGIN ----------------
function PostLoginRedirect() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    // Redirect admins to admin panel, regular users to dashboard
    if (isAdmin) {
      navigate("/admin", { replace: true });
      return;
    }

    navigate("/dashboard", { replace: true });
  }, [user, loading, navigate, isAdmin]);

  return <LoadingSpinner />;
}

// ---------------- 404 ----------------
function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center px-6">
      <div>
        <h1 className="text-3xl font-bold mb-3">Page not found</h1>
        <p className="text-gray-600 mb-4">
          The page you’re looking for doesn’t exist.
        </p>

        <Link to="/" className="text-emerald-600 underline">
          Go Home
        </Link>
      </div>
    </div>
  );
}

// ---------------- MAIN APP ----------------
function AppContent() {
  const { loading, user } = useAuth();

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <Header />

      <main className="min-h-screen pt-16 bg-white text-gray-900">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Main Marketing - No auth required */}
            <Route path="/" element={<Home />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/support" element={<Support />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/funding-guide" element={<FundingGuide />} />
            <Route path="/referrals" element={<ReferralSystem />} />

            {/* Demo - No auth required */}
            <Route path="/demo" element={<Navigate to="/trade-demo" replace />} />
            <Route path="/trade-demo" element={<TradeDemo />} />
            <Route path="/live" element={<PublicDashboard />} />

            {/* NEW LANDING PAGE ROUTES - No auth required */}
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

            {/* Newsletter - No auth required */}
            <Route path="/newsletter" element={<Newsletter />} />
            <Route
              path="/newsletter/success"
              element={<NewsletterSuccess />}
            />

            {/* Auth Routes - No auth required for login/signup */}
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/login"
              element={
                user ? <Navigate to="/after-login" replace /> : <Login />
              }
            />
            <Route
              path="/after-login"
              element={
                <RequireAuth>
                  <PostLoginRedirect />
                </RequireAuth>
              }
            />

            {/* Billing - Requires auth */}
            <Route path="/billing/success" element={<BillingSuccess />} />
            <Route
              path="/billing"
              element={
                <RequireAuth>
                  <Billing />
                </RequireAuth>
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

            {/* Activation - Requires auth */}
            <Route
              path="/activation"
              element={
                <RedirectIfActivated>
                  <Activation />
                </RedirectIfActivated>
              }
            />

            {/* Dashboard - Requires activation */}
            <Route
              path="/dashboard"
              element={
                <RequireActivation>
                  <MemberDashboard />
                </RequireActivation>
              }
            />

            <Route
              path="/members"
              element={<Navigate to="/dashboard" replace />}
            />

            {/* Admin - Requires BOTH auth AND admin privileges */}
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

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
    </>
  );
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
