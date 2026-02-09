// src/App.js
import React from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";

/* ===== Layout ===== */
import Header from "./components/Header";
import Footer from "./components/Footer";

/* ===== Guards ===== */
import ProtectedRoute from "./components/routing/ProtectedRoute";

/* ===== Core ===== */
import MemberDashboard from "./pages/dashboard/MemberDashboard";
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

/* ===== Simple 404 ===== */
function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center px-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Page not found</h1>
        <p className="text-gray-500 mb-4">
          The page you’re looking for doesn’t exist.
        </p>
        <Link to="/" className="underline text-blue-500">
          Go home
        </Link>
      </div>
    </div>
  );
}

/* ========================================================= */

export default function App() {
  return (
    <>
      <Header />

      <main className="min-h-screen pt-16 bg-black text-white">
        <Routes>
          {/* ===== Public ===== */}
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Navigate to="/" replace />} />

          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/support" element={<Support />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />

          {/* ===== Auth ===== */}
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />

          {/* ===== Billing / Activation ===== */}
          <Route path="/billing" element={<Billing />} />
          <Route path="/activation" element={<Activation />} />

          {/* ===== Protected ===== */}
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
