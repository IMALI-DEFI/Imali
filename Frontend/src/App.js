// src/App.js
import React from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";

/* Layout */
import Header from "./components/Header";
import Footer from "./components/Footer";

/* Guards */
import ProtectedRoute from "./components/routing/ProtectedRoute";

/* Core */
import MemberDashboard from "./components/Dashboard/MemberDashboard";
import AdminPanel from "./components/AdminPanel";

/* Auth / Onboarding */
import Signup from "./pages/SignupForm";
import Login from "./pages/Login";
import Activation from "./pages/Activation";
import Billing from "./pages/Billing";

/* Marketing */
import Home from "./pages/Home";
import AboutUs from "./pages/AboutUs";
import HowItWorks from "./pages/HowItWorks";
import Pricing from "./pages/Pricing";
import Support from "./pages/Support";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

/* Auth */
import { AuthProvider, useAuth } from "./context/AuthContext";

/* ============================================= */
/* Loading Spinner                               */
/* ============================================= */

function LoadingSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );
}

/* ============================================= */
/* Onboarding Gate                               */
/* ============================================= */

function OnboardingRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

/* ============================================= */
/* Activation Gate                               */
/* ============================================= */

function ActivatedRoute({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.activation_complete) {
    return <Navigate to="/activation" replace />;
  }

  return children;
}

/* ============================================= */
/* App Content                                   */
/* ============================================= */

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Header />

      <main className="min-h-screen pt-16 bg-black text-white">
        <Routes>
          {/* ===== Public ===== */}
          <Route path="/" element={<Home />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/support" element={<Support />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />

          {/* ===== Signup ===== */}
          <Route path="/signup" element={<Signup />} />

          {/* ===== Login (only if not logged in) ===== */}
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" replace /> : <Login />}
          />

          {/* ===== Billing ===== */}
          <Route
            path="/billing"
            element={
              <OnboardingRoute>
                <Billing />
              </OnboardingRoute>
            }
          />

          {/* ===== Activation ===== */}
          <Route
            path="/activation"
            element={
              <OnboardingRoute>
                <Activation />
              </OnboardingRoute>
            }
          />

          {/* ===== Dashboard ===== */}
          <Route
            path="/dashboard"
            element={
              <ActivatedRoute>
                <MemberDashboard />
              </ActivatedRoute>
            }
          />

          {/* ===== Admin ===== */}
          <Route
            path="/admin"
            element={
              <ActivatedRoute>
                <AdminPanel forceOwner />
              </ActivatedRoute>
            }
          />

          {/* ===== Aliases ===== */}
          <Route path="/members" element={<Navigate to="/dashboard" replace />} />

          {/* ===== 404 ===== */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
    </>
  );
}

/* ============================================= */
/* 404                                           */
/* ============================================= */

function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center px-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Page not found</h1>
        <p className="text-gray-500 mb-4">
          The page you're looking for doesn’t exist.
        </p>
        <Link to="/" className="underline text-blue-500">
          Go home
        </Link>
      </div>
    </div>
  );
}

/* ============================================= */
/* App Wrapper                                   */
/* ============================================= */

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
