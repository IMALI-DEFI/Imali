import React from "react";
import { Routes, Route } from "react-router-dom";
import { WalletProvider } from "./context/WalletContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Features from "./components/Features";
import Lending from "./components/Lending";
import Staking from "./components/Staking";
import YieldFarming from "./components/YieldFarming";
import PresaleSection from "./components/PresaleSection";
import NFTMinting from "./components/NFTMinting";
import DAODashboard from "./components/DAODashboard";
import HowToUse from "./components/HowToUse";
import Admin from "./components/AdminPanel.js";

const App = () => {
  return (
    <WalletProvider>
      <div className="App">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<><Hero /><Features /></>} />
            <Route path="/lending" element={<Lending />} />
            <Route path="/staking" element={<Staking />} />
            <Route path="/yield-farming" element={<YieldFarming />} />
            <Route path="/presale" element={<PresaleSection />} />
            <Route path="/nft" element={<NFTMinting />} />
            <Route path="/dao" element={<DAODashboard />} />
            <Route path="/how-to-use" element={<HowToUse />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<>404 Not Found</>} />
          </Routes>
        </main>
        <Footer />
      </div>
    </WalletProvider>
  );
};

export default App;
