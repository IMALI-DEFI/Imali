import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";

/* Layout */
import Header from "./components/Header";
import Footer from "./components/Footer";

/* Core */
import MemberDashboard from "./components/Dashboard/MemberDashboard";
import AdminPanel from "./components/AdminPanel";

/* Demo */
import TradeDemo from "./pages/TradeDemo";

/* Auth / Onboarding - Lazy load Stripe-dependent components */
const Signup = lazy(() => import("./pages/SignupForm"));
const Login = lazy(() => import("./pages/Login"));
const Activation = lazy(() => import("./pages/Activation"));
const Billing = lazy(() => import("./pages/Billing"));
const BillingDashboard = lazy(() => import("./pages/BillingDashboard"));

/* Marketing - Regular imports (no Stripe) */
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

/* Auth */
import { AuthProvider, useAuth } from "./context/AuthContext";

/* =====================================================
   LOADING SPINNER
===================================================== */
function LoadingSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
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
        <p className="text-gray-400 text-sm">Loading...</p>
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

  if (!activationComplete) {
    console.log("[RequireActivation] Not complete, redirecting:", {
      path: location.pathname,
      hasCard: !!activation?.has_card_on_file,
      okx: !!activation?.okx_connected,
      alpaca: !!activation?.alpaca_connected,
      wallet: !!activation?.wallet_connected,
      trading: !!activation?.trading_enabled,
    });

    // Check if user has a card on file
    const hasCard = activation?.has_card_on_file || activation?.billing_complete;
    
    // If no card, go to billing
    if (!hasCard) {
      return <Navigate to="/billing" replace />;
    }
    
    // If has card but not fully activated, go to activation
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
    console.log("[RedirectIfActivated] Already activated, redirecting to /dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/* =====================================================
   POST-LOGIN REDIRECT COMPONENT
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

    const determineRedirect = async () => {
      try {
        // Import BotAPI dynamically to avoid circular dependencies
        const BotAPI = (await import("./utils/BotAPI")).default;
        
        // Get fresh activation status
        const activationRes = await BotAPI.activationStatus();
        const status = activationRes?.status || activationRes;
        
        // Determine where to go
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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4" />
          <p className="text-gray-400">Setting up your account...</p>
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
        <h1 className="mb-2 text-3xl font-bold text-white">Page not found</h1>
        <p className="mb-4 text-gray-400">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link to="/" className="text-emerald-400 underline">
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

      <main className="min-h-screen pt-16 bg-black text-white">
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            {/* ===== Public Marketing Pages ===== */}
            <Route path="/" element={<Home />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/support" element={<Support />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/funding-guide" element={<FundingGuide />} />
            <Route path="/referrals" element={<ReferralSystem />} />

            {/* ===== Public Demo & Live Dashboard ===== */}
            <Route path="/demo" element={<TradeDemo />} />
            <Route path="/live" element={<PublicDashboard />} />

            {/* ===== Auth ===== */}
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/login"
              element={user ? <Navigate to="/after-login" replace /> : <Login />}
            />

            {/* ===== Post-Login Redirect ===== */}
            <Route
              path="/after-login"
              element={
                <RequireAuth>
                  <PostLoginRedirect />
                </RequireAuth>
              }
            />

            {/* ===== Onboarding ===== */}
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

            {/* ===== Billing Management ===== */}
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

            {/* ===== Protected Member Dashboard ===== */}
            <Route
              path="/dashboard"
              element={
                <RequireActivation>
                  <MemberDashboard />
                </RequireActivation>
              }
            />
            <Route path="/members" element={<Navigate to="/dashboard" replace />} />

            {/* ===== Admin ===== */}
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminPanel />
                </RequireAuth>
              }
            />

            {/* ===== 404 ===== */}
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
