import React from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Lending from "./components/Lending";
import Staking from "./components/Staking";
import YieldFarming from "./components/YieldFarming";
import HowTo from "./components/HowTo";
import Token from "./components/Token";
import AdminPanel from "./components/AdminPanel";
import { WalletProvider } from "./context/WalletContext";

const App = () => {
  return (
    <WalletProvider>
      <Header />
      <div className="container mx-auto py-8 px-6">
        <Routes>
          <Route path="/" element={<Lending />} />
          <Route path="/staking" element={<Staking />} />
          <Route path="/yield-farming" element={<YieldFarming />} />
          <Route path="/token" element={<Token />} />
          <Route path="/how-to" element={<HowTo />} />
          <Route path="/admin" element={<AdminPanel />} />
          {/* Fallback route */}
          <Route path="*" element={<Lending />} />
        </Routes>
      </div>
      <Footer />
    </WalletProvider>
  );
};

export default App;
