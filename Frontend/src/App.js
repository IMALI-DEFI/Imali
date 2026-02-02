// src/App.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layout
import Header from "./components/Header";
import Footer from "./components/Footer";
import ThemeDebug from "./components/ThemeDebug";

// Guards
import ProtectedRoute from "./components/routing/ProtectedRoute";

// Core Features
import StrategySelector from "./components/StrategySelector";
import MemberDashboard from "./components/Dashboard/MemberDashboard";
import AdminPanel from "./components/AdminPanel.jsx";
import ReferralSystem from "./components/ReferralSystem";

// Marketing Pages
import Home from "./pages/Home.jsx";
import AboutUs from "./pages/AboutUs.jsx";
import HowItWorks from "./pages/HowItWorks.jsx";
import Pricing from "./pages/Pricing.jsx";
import Support from "./pages/Support.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";
import TermsOfService from "./pages/TermsOfService.jsx";

// Onboarding / Auth
import SignupForm from "./pages/SignupForm.jsx";
import SignupActivation from "./pages/SignupActivation.jsx";
import Activation from "./pages/Activation.jsx";

// Billing
import Billing from "./pages/Billing.jsx";
import BillingSuccess from "./pages/BillingSuccess.jsx";
import BillingCancel from "./pages/BillingCancel.jsx";
import Upgrade from "./pages/Upgrade.jsx";

// Trading / Demo
import TradeDemo from "./pages/TradeDemo.jsx";

// Guides
import FundingGuide from "./pages/FundingGuide.jsx";
import SupportedChains from "./pages/SupportedChains.jsx";
import MetaMaskGuide from "./pages/MetaMaskGuide.jsx";

/* ---------------- Simple 404 ---------------- */
function NotFound() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-center p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-imali-green">
          Page not found
        </h1>
        <p className="text-gray-500 mb-4">
          The page you’re looking for doesn’t exist.
        </p>
        <a
          href="/"
          className="text-imali-green underline hover:text-imali-dark"
        >
          Go home
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Header />

      <main className="min-h-screen pt-16 bg-gradient-to-b from-gray-50 to-imali-light">
        <Routes>

          {/* ================= PUBLIC MARKETING ================= */}
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/support" element={<Support />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/theme-test" element={<ThemeDebug />} />

          {/* ================= DEMO (NO LOGIN) ================= */}
          <Route path="/trade-demo" element={<TradeDemo />} />
          <Route path="/demo" element={<Navigate to="/trade-demo" replace />} />
          <Route path="/demo/*" element={<Navigate to="/trade-demo" replace />} />

          {/* ================= SIGNUP / ONBOARDING ================= */}
          <Route path="/signup" element={<SignupForm />} />

          {/* Free tier + post-signup */}
          <Route path="/signup-activation" element={<SignupActivation />} />
          <Route
            path="/onboarding"
            element={<Navigate to="/signup-activation" replace />}
          />

          {/* ================= BILLING ================= */}
          <Route path="/billing" element={<Billing />} />
          <Route path="/billing/success" element={<BillingSuccess />} />
          <Route path="/billing/cancel" element={<BillingCancel />} />
          <Route path="/upgrade" element={<Upgrade />} />

          {/* Stripe success → activation */}
          <Route path="/activation" element={<Activation />} />

          {/* ================= GUIDES ================= */}
          <Route path="/funding-guide" element={<FundingGuide />} />
          <Route path="/supported-chains" element={<SupportedChains />} />
          <Route path="/wallet-metamask" element={<MetaMaskGuide />} />

          {/* Aliases (do not break existing links) */}
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

          {/* ================= UTILITIES ================= */}
          <Route path="/referral" element={<ReferralSystem />} />
          <Route path="/strategy-selector" element={<StrategySelector />} />

          {/* ================= PROTECTED (MEMBER) ================= */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<MemberDashboard />} />
            <Route path="/admin" element={<AdminPanel forceOwner />} />
          </Route>

          {/* ================= TEST ROUTES ================= */}
          <Route path="/test/dashboard" element={<MemberDashboard />} />
          <Route path="/test/admin" element={<AdminPanel />} />

          {/* ================= LEGACY ALIASES ================= */}
          <Route
            path="/MemberDashboard"
            element={<Navigate to="/dashboard" replace />}
          />
          <Route
            path="/memberdashboard"
            element={<Navigate to="/dashboard" replace />}
          />
          <Route
            path="/member"
            element={<Navigate to="/dashboard" replace />}
          />

          {/* ================= 404 ================= */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </main>

      <Footer />
    </>
  );
}
