// src/App.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layout
import Header from "./components/Header";
import Footer from "./components/Footer";

// Features
import StrategySelector from "./components/StrategySelector";
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
import SignupActivation from "./pages/SignupActivation.jsx";
import Activation from "./pages/Activation.jsx";
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
    <div className="min-h-[40svh] flex items-center justify-center text-center p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Page not found</h1>
        <p className="text-slate-400 mb-4">
          The page you’re looking for doesn’t exist.
        </p>
        <a href="/" className="text-sky-400 underline">
          Go home
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    // App shell: forces dark background + prevents sideways "grab" globally
    <div className="min-h-[100svh] w-full overflow-x-hidden bg-gray-950 text-slate-100">
      <Header />

      {/* Use 100svh-safe height and avoid min-h-screen (100vh) on iOS */}
      <main className="w-full overflow-x-hidden pt-16">
        <Routes>
          {/* ---------------- Public marketing ---------------- */}
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/support" element={<Support />} />

          {/* ---------------- Signup / Activation ---------------- */}
          <Route path="/signup" element={<SignupForm />} />
          <Route path="/signup-activation" element={<SignupActivation />} />
          <Route
            path="/onboarding"
            element={<Navigate to="/signup-activation" replace />}
          />
          <Route path="/activation" element={<Activation />} />

          {/* ---------------- Public demo (unprotected) ---------------- */}
          <Route path="/trade-demo" element={<TradeDemo />} />

          {/* ---------------- Public guides / utilities ---------------- */}
          <Route path="/funding-guide" element={<FundingGuide />} />
          <Route path="/supported-chains" element={<SupportedChains />} />
          <Route path="/wallet-metamask" element={<MetaMaskGuide />} />
          <Route path="/referral" element={<ReferralSystem />} />
          <Route path="/strategy-selector" element={<StrategySelector />} />

          {/* Aliases for links you already used in SignupForm.jsx */}
          <Route
            path="/how-to/fund-okx"
            element={<Navigate to="/funding-guide" replace />}
          />
          <Route
            path="/how-to/wallet-metamask"
            element={<Navigate to="/wallet-metamask" replace />}
          />
          <Route
            path="/FundingGuide"
            element={<Navigate to="/funding-guide" replace />}
          />

          {/* ---------------- Protected: member + admin ---------------- */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<MemberDashboard />} />
            <Route path="/admin" element={<AdminPanel forceOwner />} />
          </Route>

          {/* ---------------- Unprotected test routes ---------------- */}
          <Route path="/test/dashboard" element={<MemberDashboard />} />
          <Route path="/test/admin" element={<AdminPanel />} />

          {/* ---------------- Legacy aliases ---------------- */}
          <Route path="/demo" element={<Navigate to="/trade-demo" replace />} />
          <Route path="/demo/*" element={<Navigate to="/trade-demo" replace />} />
          <Route
            path="/MemberDashboard"
            element={<Navigate to="/dashboard" replace />}
          />
          <Route
            path="/memberdashboard"
            element={<Navigate to="/dashboard" replace />}
          />
          <Route path="/member" element={<Navigate to="/dashboard" replace />} />

          {/* ---------------- Catch-all ---------------- */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}