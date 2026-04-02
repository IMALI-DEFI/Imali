import React, { lazy, Suspense, useContext } from "react";
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
import { SocketProvider, SocketContext } from "./context/SocketContext";

/* =====================================================
   SAFE SOCKET FALLBACK
===================================================== */
const SAFE_SOCKET_FALLBACK = {
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  reconnect: () => {},
  socket: null,
  lastTrade: null,
  lastPnlUpdate: null,
  trades: [],
  announcements: [],
  liveStats: {
    totalTrades: 0,
    totalPnl: 0,
    activeBots: 0,
    winRate: 0,
    wins: 0,
    losses: 0,
    totalReferrals: 0,
    totalRewardsPaid: 0,
    activeUsers: 0,
  },
  botStatuses: [],
  leaderboard: [],
  referralEvents: [],
  systemMetrics: { cpu: 0, memory: 0, active_users: 0, tps: 0 },
  subscribeToTrades: () => {},
  subscribeToPnl: () => {},
  subscribeToAnnouncements: () => {},
  subscribeToReferrals: () => {},
  subscribeToLeaderboard: () => {},
  subscribeToSystemMetrics: () => {},
  clearAnnouncements: () => {},
  clearTrades: () => {},
  clearReferralEvents: () => {},
};

function useSafeSocket() {
  const context = useContext(SocketContext);
  return context || SAFE_SOCKET_FALLBACK;
}

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
        <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
          <div className="max-w-xl w-full text-center">
            <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
            <p className="text-gray-400 mb-6">
              The app hit a runtime error, but this screen confirms React is still loading.
            </p>
            <pre className="text-left text-xs bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-auto whitespace-pre-wrap">
              {String(this.state.error)}
            </pre>
            <div className="mt-6">
              <a
                href="/"
                className="inline-block px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 transition"
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
   LIVE STATUS
===================================================== */
function WebSocketStatus() {
  const { isConnected, connectionError, isConnecting } = useSafeSocket();
  const location = useLocation();

  const publicPaths = [
    "/",
    "/pricing",
    "/signup",
    "/login",
    "/live",
    "/demo",
    "/trade-demo",
  ];
  if (publicPaths.includes(location.pathname)) return null;

  if (isConnecting) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-yellow-500/90 text-black px-3 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm">
        <span className="inline-block w-2 h-2 rounded-full bg-yellow-700 animate-pulse mr-2" />
        Connecting to live feed...
      </div>
    );
  }

  if (!isConnected && connectionError) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-red-500/90 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm">
        <span className="inline-block w-2 h-2 rounded-full bg-red-300 mr-2" />
        Using fallback mode
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-green-500/90 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm animate-pulse">
        <span className="inline-block w-2 h-2 rounded-full bg-green-200 mr-2" />
        Live
      </div>
    );
  }

  return null;
}

/* =====================================================
   CONNECTION ERROR BANNER
===================================================== */
function ConnectionErrorBanner() {
  const { connectionError, reconnect, isConnected, isConnecting } = useSafeSocket();
  const location = useLocation();

  const publicPaths = [
    "/",
    "/pricing",
    "/signup",
    "/login",
    "/live",
    "/demo",
    "/trade-demo",
  ];
  if (publicPaths.includes(location.pathname) || isConnected || isConnecting) return null;

  if (connectionError) {
    return (
      <div className="fixed top-16 left-0 right-0 z-50 bg-red-600 text-white px-4 py-2 text-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          <span>Connection issue: {connectionError}</span>
        </div>
        <button
          onClick={reconnect}
          className="bg-white text-red-600 px-3 py-1 rounded-md text-xs font-semibold hover:bg-gray-100 transition"
        >
          Reconnect
        </button>
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
      <ConnectionErrorBanner />
      <WebSocketStatus />

      <main className="min-h-screen pt-16 bg-black text-white">
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
        <SocketProvider>
          <AppContent />
        </SocketProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}