import React, { useEffect, useState } from "react";
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
import MetaMaskMobilePrompt from "./components/MetaMaskMobilePrompt"; // Import the prompt component

const App = () => {
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    // Check if MetaMask is installed
    setIsMetaMaskInstalled(!!window.ethereum);

    // Check if the user is on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    setIsMobileDevice(isMobile);
  }, []);

  // Show the prompt if on mobile and MetaMask is not installed
  if (isMobileDevice && !isMetaMaskInstalled) {
    return <MetaMaskMobilePrompt />;
  }

  // Render the app as usual
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