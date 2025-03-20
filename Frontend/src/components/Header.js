import React from "react";
import { Link } from "react-router-dom";
import Images from "../assets/images/DefiFinanceLogo.png";

const Header = () => {
  return (
    <header className="bg-white relative flex items-center justify-between p-4 shadow-md">
      {/* Logo */}
      <div className="flex items-center space-x-4">
        <img
          src={Images}
          alt="Defi Finance Logo"
          className="h-12 sm:h-16"
        />
      </div>

      {/* Animated Tagline */}
      <div className="flex items-center">
        <svg
          className="w-48 h-12 sm:w-64 sm:h-16"
          viewBox="0 0 300 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <text x="10" y="30" className="text-lg sm:text-xl font-bold fill-[#036302]">
            <tspan x="10" y="30" className="animate-fadeIn">
              AI-Secured
            </tspan>
            <tspan x="10" y="60" className="animate-fadeIn delay-1000">
              Decentralized Finance
            </tspan>
          </text>
        </svg>
      </div>

      {/* Navigation Links */}
      <nav className="hidden sm:flex space-x-6">
        <Link to="/" className="text-[#036302] font-bold hover:text-[#036302] transition-colors">
          Lending
        </Link>
        <Link to="/staking" className="text-[#036302] font-bold hover:text-[#036302] transition-colors">
          Staking
        </Link>
        <Link to="/yield-farming" className="text-[#036302] font-bold hover:text-[#036302] transition-colors">
          Yield Farming
        </Link>
        <Link to="/token" className="text-[#036302] font-bold hover:text-[#036302] transition-colors">
          Token
        </Link>
        <Link to="/how-to" className="text-[#036302] font-bold hover:text-[#036302] transition-colors">
          How To Use
        </Link>
        <Link to="/admin" className="text-[#036302] font-bold hover:text-[#036302] transition-colors">
          Admin
        </Link>
      </nav>
    </header>
  );
};

export default Header;