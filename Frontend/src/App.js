import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { WalletProvider } from "./context/WalletContext";
import ReactGA from "react-ga4"; // ✅ Add this
import Header from "./components/Header";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Features from "./components/Features";
import Lending from "./components/Lending";
import Staking from "./components/Staking";
import YieldFarming from "./components/YieldFarming";
import TokenPage from "./components/TokenPage";
import LPLottery from "./components/LPLottery";
import NFTMinting from "./components/NFTMinting";
import HowToUse from "./components/HowToUse";
import Admin from "./components/AdminPanel";

const App = () => {
  useEffect(() => {
    ReactGA.initialize("G-KDRSH4G2Y9"); // ✅ Initialize GA4 once
    ReactGA.send("pageview");           // ✅ Track initial pageview
  }, []);

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
            <Route path="/TokenPage" element={<TokenPage />} />
            <Route path="/lp-lottery" element={<LPLottery />} />
            <Route path="/nft" element={<NFTMinting />} />
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
