// src/App.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layout
import Header from "./components/Header";
import Footer from "./components/Footer";

// Features
import StrategySelector from "./components/Dashboard/StrategySelector";
import MemberDashboard from "./components/Dashboard/MemberDashboard";
import AdminPanel from "./components/AdminPanel.jsx";
import ReferralSystem from "./components/ReferralSystem";

// Pages
import AboutUs from "./pages/AboutUs.jsx";
import Home from "./pages/Home.jsx";
import HowItWorks from "./pages/HowItWorks.jsx";
import Pricing from "./pages/Pricing.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";
import SignupForm from "./pages/SignupForm.jsx";
import Support from "./pages/Support.jsx";
import TermsOfService from "./pages/TermsOfService.jsx";
import TradeDemo from "./pages/TradeDemo.jsx";
import FundingGuide from "./pages/FundingGuide.jsx";
import SupportedChains from "./pages/SupportedChains.jsx";
import MetaMaskGuide from "./pages/MetaMaskGuide.jsx"; 
// Auth guard
import ProtectedRoute from "./components/routing/ProtectedRoute";

// Simple 404
function NotFound() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-center p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Page not found</h1>
        <p className="text-gray-500 mb-4">The page you’re looking for doesn’t exist.</p>
        <a href="/" className="text-indigo-600 underline">Go home</a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-16">
        <Routes>
          {/* Public marketing */}
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/support" element={<Support />} />
          <Route path="/signup" element={<SignupForm />} />

          {/* ✅ PUBLIC demo (not protected) */}
          <Route path="/trade-demo" element={<TradeDemo />} />

          {/* Other public features */}
          <Route path="/funding-guide" element={<FundingGuide />} />
          <Route path="/referral" element={<ReferralSystem />} />
          <Route path="/strategy-selector" element={<StrategySelector />} />
          <Route path="/supported-chains" element={<SupportedChains />} />
          <Route path="/wallet-metamask" element={<MetaMaskGuide />} /> 
          {/* ✅ PROTECTED: live dashboard + admin */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<MemberDashboard />} />
            <Route path="/admin" element={<AdminPanel forceOwner/>} />
          </Route>

          {/* ✅ UNPROTECTED TEST ROUTES
              These render the REAL components directly (no wrappers, no guards)
              so you can work on them without auth/wallet friction. */}
          <Route path="/test/dashboard" element={<MemberDashboard />} />
          <Route path="/test/admin" element={<AdminPanel />} />

          {/* Aliases → public demo (legacy “/demo”) */}
          <Route path="/demo" element={<Navigate to="/trade-demo" replace />} />
          <Route path="/demo/*" element={<Navigate to="/trade-demo" replace />} />

          {/* Aliases → protected dashboard (legacy “MemberDashboard”) */}
          <Route path="/MemberDashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="/memberdashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="/member" element={<Navigate to="/dashboard" replace />} />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
