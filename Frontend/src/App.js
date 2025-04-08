import React from "react";
import { Routes, Route } from "react-router-dom";
import { WalletProvider } from "./context/WalletContext";

// Global layout components
import Header from "./components/Header";
import Footer from "./components/Footer";

// Landing & sections
import Hero from "./components/Hero";
import Features from "./components/Features";

// Core dApp features
import Lending from "./components/Lending";
import Staking from "./components/Staking";
import YieldFarming from "./components/YieldFarming";
import PresaleSection from "./components/PresaleSection";
import NFTMinting from "./components/NFTMinting";
import DAODashboard from "./components/DAODashboard";
import Admin from "./components/AdminPanel";
import HowToUse from "./components/HowToUse";
import IMALIToken from "./components/Token";
import FeeDistributor from "./components/FeeDistributor"; // NEW
import LPLottery from "./components/LPLottery"; // NEW

const App = () => {
  return (
    <WalletProvider>
      <div className="App">
        <Header />

        <main>
          <Routes>
            {/* Landing */}
            <Route path="/" element={<><Hero /><Features /></>} />

            {/* Functional Pages */}
            <Route path="/lending" element={<Lending />} />
            <Route path="/staking" element={<Staking />} />
            <Route path="/yield-farming" element={<YieldFarming />} />
            <Route path="/presale" element={<PresaleSection />} />
            <Route path="/token" element={<IMALIToken />} />
            <Route path="/nft" element={<NFTMinting />} />
            <Route path="/dao" element={<DAODashboard />} />
            <Route path="/how-to-use" element={<HowToUse />} />
            <Route path="/admin" element={<Admin />} />
            
            {/* NEW ROUTES */}
            <Route path="/fee-distributor" element={<FeeDistributor />} />
            <Route path="/lottery" element={<LPLottery />} />

            {/* Fallback */}
            <Route path="*" element={<div className="text-center p-8 text-xl">🚫 404 - Page Not Found</div>} />
          </Routes>
        </main>

        <Footer />
      </div>
    </WalletProvider>
  );
};

export default App;
