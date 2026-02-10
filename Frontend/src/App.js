// src/App.js
import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";

/* ===== Layout ===== */
import Header from "./components/Header";
import Footer from "./components/Footer";

/* ===== Guards ===== */
import ProtectedRoute from "./components/routing/ProtectedRoute";

/* ===== Core ===== */
import MemberDashboard from "./components/Dashboard/MemberDashboard";
import AdminPanel from "./components/AdminPanel";

/* ===== Auth / Onboarding ===== */
import Signup from "./pages/SignupForm";
import Login from "./pages/Login";
import Activation from "./pages/Activation";
import Billing from "./pages/Billing";

/* ===== Marketing ===== */
import Home from "./pages/Home";
import AboutUs from "./pages/AboutUs";
import HowItWorks from "./pages/HowItWorks";
import Pricing from "./pages/Pricing";
import Support from "./pages/Support";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

/* ===== Auth Context & Utilities ===== */
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { getToken, clearToken } from "./utils/authUtils";

/* ===== Loading Component ===== */
function LoadingSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black z-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

/* ===== Main App with Auth ===== */
function AppContent() {
  const location = useLocation();
  const { user, loading, checkAuth } = useAuth();
  
  // Check auth status on route change
  useEffect(() => {
    const token = getToken();
    if (token && !user && !loading) {
      checkAuth();
    }
  }, [location.pathname, user, loading, checkAuth]);

  // Show loading spinner while checking auth
  if (loading && location.pathname !== "/" && location.pathname !== "/login" && location.pathname !== "/signup") {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Header />
      
      <main className="min-h-screen pt-16 bg-black text-white">
        <Routes>
          {/* ===== Public Routes ===== */}
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/support" element={<Support />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          
          {/* ===== Auth Routes (redirect if already logged in) ===== */}
          <Route 
            path="/signup" 
            element={
              user ? <Navigate to="/dashboard" replace state={{ from: location }} /> : <Signup />
            } 
          />
          <Route 
            path="/login" 
            element={
              user ? <Navigate to="/dashboard" replace state={{ from: location }} /> : <Login />
            } 
          />
          
          {/* ===== Protected Billing/Activation ===== */}
          <Route 
            path="/billing" 
            element={
              user ? <Billing /> : <Navigate to="/login" replace state={{ from: location }} />
            } 
          />
          <Route 
            path="/activation" 
            element={
              user ? <Activation /> : <Navigate to="/login" replace state={{ from: location }} />
            } 
          />
          
          {/* ===== Protected Routes with Auth Guard ===== */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<MemberDashboard />} />
            <Route path="/admin" element={<AdminPanel forceOwner />} />
          </Route>
          
          {/* ===== Aliases (legacy-safe) ===== */}
          <Route path="/member" element={<Navigate to="/dashboard" replace />} />
          <Route path="/members" element={<Navigate to="/dashboard" replace />} />
          <Route path="/MemberDashboard" element={<Navigate to="/dashboard" replace />} />
          
          {/* ===== 404 ===== */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      
      <Footer />
    </>
  );
}

/* ===== Simple 404 ===== */
function NotFound() {
  const location = useLocation();
  
  // Clear invalid token if we hit 404 on auth-protected route
  useEffect(() => {
    const protectedPaths = ['/dashboard', '/admin', '/billing', '/activation'];
    if (protectedPaths.some(path => location.pathname.startsWith(path))) {
      clearToken();
    }
  }, [location.pathname]);
  
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center px-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Page not found</h1>
        <p className="text-gray-500 mb-4">
          The page you're looking for doesn't exist.
        </p>
        <Link to="/" className="underline text-blue-500">
          Go home
        </Link>
      </div>
    </div>
  );
}

/* ===== Main App Export ===== */
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}