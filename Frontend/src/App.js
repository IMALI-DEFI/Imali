// src/App.js
import React from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";

/* ================= LAYOUT ================= */
import Header from "./components/Header";
import Footer from "./components/Footer";

/* ================= ROUTE GUARDS ================= */
import ProtectedRoute from "./components/routing/ProtectedRoute";

/* ================= CORE FEATURES ================= */
import StrategySelector from "./components/StrategySelector";
import MemberDashboard from "./components/Dashboard/MemberDashboard";
import AdminPanel from "./components/AdminPanel.jsx";
import ReferralSystem from "./components/ReferralSystem";

/* ================= MARKETING ================= */
import Home from "./pages/Home.jsx";
import AboutUs from "./pages/AboutUs.jsx";
import HowItWorks from "./pages/HowItWorks.jsx";
import Pricing from "./pages/Pricing.jsx";
import Support from "./pages/Support.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";
import TermsOfService from "./pages/TermsOfService.jsx";

/* ================= ONBOARDING / AUTH ================= */
import SignupForm from "./pages/SignupForm.jsx";
import SignupActivation from "./pages/SignupActivation.jsx";
import Activation from "./pages/Activation.jsx";

/* ================= BILLING ================= */
import Billing from "./pages/Billing.jsx";
import BillingSuccess from "./pages/BillingSuccess.jsx";
import BillingCancel from "./pages/BillingCancel.jsx";
import Upgrade from "./pages/Upgrade.jsx";

/* ================= TRADING / DEMO ================= */
import TradeDemo from "./pages/TradeDemo.jsx";

/* ================= GUIDES ================= */
import FundingGuide from "./pages/FundingGuide.jsx";
import SupportedChains from "./pages/SupportedChains.jsx";
import MetaMaskGuide from "./pages/MetaMaskGuide.jsx";

/* ====================================================
   ROUTE PATHS — SINGLE SOURCE OF TRUTH
==================================================== */
export const PATHS = {
  /* Public */
  home: "/",
  about: "/about-us",
  how: "/how-it-works",
  pricing: "/pricing",
  support: "/support",
  privacy: "/privacy-policy",
  terms: "/terms-of-service",

  /* Demo */
  demo: "/trade-demo",

  /* Onboarding */
  signup: "/signup",
  signupActivation: "/signup-activation",
  activation: "/activation",

  /* Billing */
  billing: "/billing",
  billingSuccess: "/billing/success",
  billingCancel: "/billing/cancel",
  upgrade: "/upgrade",

  /* Guides */
  fundingGuide: "/funding-guide",
  supportedChains: "/supported-chains",
  metamaskGuide: "/wallet-metamask",
  metamaskGuideAlias: "/metamask-guide",

  /* Utilities */
  referral: "/referral",
  strategySelector: "/strategy-selector",

  /* Protected */
  dashboard: "/dashboard",
  admin: "/admin",

  /* Aliases */
  memberDashboardAlias: "/member-dashboard",
};

/* ================= SIMPLE 404 ================= */
function NotFound() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center text-center p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-imali-green">
          Page not found
        </h1>
        <p className="text-gray-500 mb-4">
          The page you’re looking for doesn’t exist.
        </p>
        <Link
          to={PATHS.home}
          className="text-imali-green underline hover:text-imali-dark"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

/* ====================================================
   APP ROOT
==================================================== */
export default function App() {
  return (
    <>
      <Header />

      <main className="min-h-screen pt-16 bg-gradient-to-b from-gray-50 to-imali-light">
        <Routes>
          {/* ================= PUBLIC MARKETING ================= */}
          <Route path={PATHS.home} element={<Home />} />
          <Route path="/home" element={<Navigate to={PATHS.home} replace />} />
          <Route path={PATHS.about} element={<AboutUs />} />
          <Route path={PATHS.how} element={<HowItWorks />} />
          <Route path={PATHS.pricing} element={<Pricing />} />
          <Route path={PATHS.support} element={<Support />} />
          <Route path={PATHS.privacy} element={<PrivacyPolicy />} />
          <Route path={PATHS.terms} element={<TermsOfService />} />

          {/* ================= DEMO (NO LOGIN) ================= */}
          <Route path={PATHS.demo} element={<TradeDemo />} />
          <Route path="/demo" element={<Navigate to={PATHS.demo} replace />} />
          <Route path="/demo/*" element={<Navigate to={PATHS.demo} replace />} />

          {/* ================= SIGNUP / ONBOARDING ================= */}
          <Route path={PATHS.signup} element={<SignupForm />} />
          <Route path={PATHS.signupActivation} element={<SignupActivation />} />
          <Route
            path="/onboarding"
            element={<Navigate to={PATHS.signupActivation} replace />}
          />

          {/* ================= BILLING ================= */}
          <Route path={PATHS.billing} element={<Billing />} />
          <Route path={PATHS.billingSuccess} element={<BillingSuccess />} />
          <Route path={PATHS.billingCancel} element={<BillingCancel />} />
          <Route path={PATHS.upgrade} element={<Upgrade />} />

          {/* Stripe success always lands here */}
          <Route path={PATHS.activation} element={<Activation />} />

          {/* ================= GUIDES ================= */}
          <Route path={PATHS.fundingGuide} element={<FundingGuide />} />
          <Route path={PATHS.supportedChains} element={<SupportedChains />} />

          <Route path={PATHS.metamaskGuide} element={<MetaMaskGuide />} />
          <Route
            path={PATHS.metamaskGuideAlias}
            element={<Navigate to={PATHS.metamaskGuide} replace />}
          />

          {/* Legacy MetaMask URLs */}
          <Route
            path="/how-to/wallet-metamask"
            element={<Navigate to={PATHS.metamaskGuide} replace />}
          />

          {/* Legacy funding URLs */}
          <Route
            path="/how-to/fund-okx"
            element={<Navigate to={PATHS.fundingGuide} replace />}
          />
          <Route
            path="/FundingGuide"
            element={<Navigate to={PATHS.fundingGuide} replace />}
          />

          {/* ================= UTILITIES ================= */}
          <Route path={PATHS.referral} element={<ReferralSystem />} />
          <Route path={PATHS.strategySelector} element={<StrategySelector />} />

          {/* ================= PROTECTED (MEMBER) ================= */}
          <Route element={<ProtectedRoute />}>
            <Route path={PATHS.dashboard} element={<MemberDashboard />} />

            {/* Alias support */}
            <Route
              path={PATHS.memberDashboardAlias}
              element={<Navigate to={PATHS.dashboard} replace />}
            />

            <Route
              path={PATHS.admin}
              element={<AdminPanel forceOwner />}
            />
          </Route>

          {/* ================= TEST ROUTES (SAFE) ================= */}
          <Route path="/test/dashboard" element={<MemberDashboard />} />
          <Route path="/test/admin" element={<AdminPanel />} />

          {/* ================= LEGACY DASHBOARD ALIASES ================= */}
          <Route
            path="/MemberDashboard"
            element={<Navigate to={PATHS.dashboard} replace />}
          />
          <Route
            path="/memberdashboard"
            element={<Navigate to={PATHS.dashboard} replace />}
          />
          <Route
            path="/member"
            element={<Navigate to={PATHS.dashboard} replace />}
          />

          {/* ================= 404 ================= */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
    </>
  );
}
