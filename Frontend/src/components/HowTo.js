import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Logo from "../assets/images/DefiFinanceLogo.png";
import ConnectWalletButton from "./ConnectWalletButton";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoSize, setLogoSize] = useState(30);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setLogoSize(23);
      } else if (window.innerWidth < 1024) {
        setLogoSize(23);
      } else {
        setLogoSize(20);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <header className="bg-white shadow-md w-full z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between h-auto sm:h-20 py-2 sm:py-0">
          {/* Logo */}
          <div className="flex items-center mb-2 sm:mb-0">
            <Link to="/">
              <img
                src={Logo}
                alt="IMALI DeFi Logo"
                className={`h-${logoSize} w-auto`}
              />
            </Link>
          </div>

          {/* Informational Wallet Banner */}
          <div className="text-xs text-gray-800 bg-yellow-100 border border-yellow-300 rounded p-2 mb-2 sm:mb-0 max-w-full sm:max-w-[600px] leading-snug">
            <strong>New to Web3?</strong> A <strong>digital wallet</strong> (like MetaMask or Trust Wallet) stores your crypto and lets you interact with DeFi apps like IMALI.
            <br />
            <strong>Mobile Users:</strong> To connect your wallet, open your wallet app and use its built-in browser.
            <br />
            <span className="underline">Steps:</span>
            <ol className="list-decimal ml-4">
              <li>Open your wallet app (e.g. MetaMask or Trust Wallet)</li>
              <li>Tap the "Browser" or "Discover" tab</li>
              <li>Type in: <strong>imali-defi.com</strong> and go</li>
              <li>Connect your wallet once the site loads</li>
            </ol>
            <br />
            <span className="block">
              <strong>Network Info:</strong> Lending is on <strong>Ethereum</strong>.  
              All other features use <strong>Polygon</strong>.  
              The <strong>IMALI Token</strong> runs on both <strong>Polygon</strong> and <strong>Base</strong>.
            </span>
          </div>

          {/* Desktop Connect Wallet Button */}
          <div className="hidden sm:block">
            <ConnectWalletButton />
          </div>

          {/* Mobile Wallet + Menu */}
          <div className="sm:hidden flex items-center gap-2">
            <ConnectWalletButton />
            <button
              onClick={toggleMenu}
              className="text-[#036302] focus:outline-none"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16m-7 6h7"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav
          className={`${
            isMenuOpen ? "block" : "hidden"
          } sm:flex sm:items-center sm:space-x-6 absolute sm:static top-16 right-0 bg-white w-full sm:w-auto shadow-md sm:shadow-none p-4 sm:p-0`}
        >
          {[
            { label: "Home", path: "/" },
            { label: "Lending", path: "/lending" },
            { label: "Staking", path: "/staking" },
            { label: "Yield Farming", path: "/yield-farming" },
            { label: "Presale", path: "/presale" },
            { label: "NFT", path: "/nft" },
            { label: "DAO", path: "/dao" },
            { label: "How To", path: "/how-to-use" },
            { label: "Admin", path: "/admin" },
          ].map(({ label, path }) => (
            <Link
              key={path}
              to={path}
              className="block text-[#036302] font-bold hover:text-[#036302]/80 transition-colors py-2 sm:py-0"
              onClick={() => setIsMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;