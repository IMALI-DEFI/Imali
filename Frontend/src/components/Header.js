import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Logo from "../assets/images/DefiFinanceLogo.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoSize, setLogoSize] = useState("h-8");

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setLogoSize("h-6");
      else if (window.innerWidth < 1024) setLogoSize("h-10");
      else setLogoSize("h-12");
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const links = [
  ["Home", "/"],
  ["Lending", "/lending"],
  ["Staking", "/staking"],
  ["Yield Farming", "/yield-farming"],
  ["LP Lottery", "/lp-lottery"],        // ✅ New
  ["Admin", "/admin"],
  ["How To", "/how-to-use"],
  ["Token Page", "/token-page"]
    // 🗑️ "Presale" removed
  ];

  return (
    <header className="bg-white shadow-md w-full z-50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 w-full">
          {/* Logo */}
          <Link to="/" className="flex items-center mr-auto">
            <img src={Logo} alt="IMALI DeFi Logo" className={`${logoSize} w-auto transition-all duration-300`} />
            <span className="ml-2 text-lg font-bold text-green-700 hidden sm:block">IMALI DeFi</span>
          </Link>

          {/* Mobile Toggle */}
          <div className="sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-green-700 focus:outline-none"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className={`
            ${isMenuOpen ? "block" : "hidden"} 
            sm:flex sm:items-center flex-col sm:flex-row absolute sm:static top-16 left-0 right-0 bg-white sm:bg-transparent 
            shadow-md sm:shadow-none p-4 sm:p-0 space-y-2 sm:space-y-0 sm:space-x-4
          `}>
            {links.map(([label, to]) => (
              <NavLink key={to} to={to}>{label}</NavLink>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

const NavLink = ({ to, children }) => (
  <Link
    to={to}
    className="block sm:inline-block px-3 py-2 rounded-md text-sm font-medium text-green-700 hover:bg-green-50 hover:text-green-800 transition-colors"
  >
    {children}
  </Link>
);

export default Header;
