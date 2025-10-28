// src/App.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layout
import Header from "./components/Header";
import Footer from "./components/Footer";

// Features
import StrategySelector from "./components/Dashboard/StrategySelector";
import MemberDashboard from "./components/Dashboard/MemberDashboard";
import AdminPanel from "./components/AdminPanel.jsx"; // <-- keep this consistent with the actual filename

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
import ReferralPartner from "./pages/ReferralPartner.jsx"; // <-- correct location & name

// Auth guard
import ProtectedRoute from "./components/routing/ProtectedRoute";

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

          {/* Public demo */}
          <Route path="/trade-demo" element={<TradeDemo />} />

          {/* Other public pages */}
          <Route path="/funding-guide" element={<FundingGuide />} />
          <Route path="/referral" element={<ReferralPartner />} /> {/* <-- fixed */}
          <Route path="/strategy-selector" element={<StrategySelector />} />
          <Route path="/supported-chains" element={<SupportedChains />} />
          <Route path="/wallet-metamask" element={<MetaMaskGuide />} />

          {/* Protected: live dashboard + admin */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<MemberDashboard />} />
            <Route path="/admin" element={<AdminPanel forceOwner />} />
          </Route>

          {/* Unprotected test routes */}
          <Route path="/test/dashboard" element={<MemberDashboard />} />
          <Route path="/test/admin" element={<AdminPanel />} />

          {/* Legacy aliases */}
          <Route path="/demo" element={<Navigate to="/trade-demo" replace />} />
          <Route path="/demo/*" element={<Navigate to="/trade-demo" replace />} />
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
