// App.js (with BillingSuccess route added)
import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import MemberDashboard from "./components/Dashboard/MemberDashboard";
import AdminPanel from "./components/AdminPanel";
import TradeDemo from "./pages/TradeDemo";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Lazy load auth pages
const Signup = lazy(() => import("./pages/SignupForm"));
const Login = lazy(() => import("./pages/Login"));
const Activation = lazy(() => import("./pages/Activation"));
const Billing = lazy(() => import("./pages/Billing"));
const BillingSuccess = lazy(() => import("./pages/BillingSuccess")); // ✅ ADD THIS LINE
const BillingDashboard = lazy(() => import("./pages/BillingDashboard"));

// Marketing pages
import Home from "./pages/Home";
import AboutUs from "./pages/AboutUs";
import HowItWorks from "./pages/HowItWorks";
import Pricing from "./pages/Pricing";
import Support from "./pages/Support";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import FundingGuide from "./pages/FundingGuide";
import PublicDashboard from "./pages/PublicDashboard";
import ReferralSystem from "./components/ReferralSystem";

// Error Boundary
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
            <p className="text-gray-600 mb-6">Please refresh the page or contact support.</p>
            <pre className="text-left text-xs bg-gray-100 border border-gray-200 rounded-lg p-4 overflow-auto">
              {String(this.state.error)}
            </pre>
            <a href="/" className="inline-block mt-6 px-4 py-2 rounded bg-emerald-600 text-white">Reload Home</a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
    </div>
  );
}

function PageLoadingFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4" />
      <p className="text-gray-500">Loading...</p>
    </div>
  );
}

// Route Guards
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function RequireActivation({ children }) {
  const { user, activation, activationComplete, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  
  const isAdmin = user?.is_admin === true;
  if (isAdmin) return children;
  
  if (!activationComplete) {
    const hasCard = activation?.has_card_on_file || activation?.billing_complete;
    if (!hasCard) return <Navigate to="/billing" replace />;
    return <Navigate to="/activation" replace />;
  }
  return children;
}

function RedirectIfActivated({ children }) {
  const { user, activationComplete, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (activationComplete) return <Navigate to="/dashboard" replace />;
  return children;
}

// Post-Login Redirect
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
        const status = await BotAPI.activationStatus();
        if (!status?.has_card_on_file) navigate("/billing", { replace: true });
        else if (!status?.trading_enabled) navigate("/activation", { replace: true });
        else navigate("/dashboard", { replace: true });
      } catch {
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4" />
          <p className="text-gray-500">Setting up...</p>
        </div>
      </div>
    );
  }
  return null;
}

function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 text-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
        <Link to="/" className="text-emerald-600 underline">Go home</Link>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  
  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 bg-white text-gray-900">
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            {/* Marketing Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/support" element={<Support />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/funding-guide" element={<FundingGuide />} />
            <Route path="/referrals" element={<ReferralSystem />} />
            
            {/* Demo Routes */}
            <Route path="/demo" element={<Navigate to="/trade-demo" replace />} />
            <Route path="/trade-demo" element={<TradeDemo />} />
            <Route path="/live" element={<PublicDashboard />} />
            
            {/* Auth Routes */}
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={user ? <Navigate to="/after-login" replace /> : <Login />} />
            <Route path="/after-login" element={<RequireAuth><PostLoginRedirect /></RequireAuth>} />
            
            {/* Billing Flow Routes - ORDER MATTERS! */}
            <Route path="/billing/success" element={<BillingSuccess />} />  {/* ✅ ADD THIS ROUTE - More specific first */}
            <Route path="/billing" element={<RequireAuth><Billing /></RequireAuth>} />
            <Route path="/billing-dashboard" element={<RequireAuth><BillingDashboard /></RequireAuth>} />
            <Route path="/settings/billing" element={<Navigate to="/billing-dashboard" replace />} />
            
            {/* Activation & Dashboard */}
            <Route path="/activation" element={<RedirectIfActivated><Activation /></RedirectIfActivated>} />
            <Route path="/dashboard" element={<RequireActivation><MemberDashboard /></RequireActivation>} />
            <Route path="/members" element={<Navigate to="/dashboard" replace />} />
            
            {/* Admin */}
            <Route path="/admin" element={<RequireAuth><AdminPanel /></RequireAuth>} />
            
            {/* 404 - Must be last */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
