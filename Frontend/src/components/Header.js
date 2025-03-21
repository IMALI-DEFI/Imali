import React, { useState } from "react";
import { Link } from "react-router-dom";
import Images from "../assets/images/DefiFinanceLogo.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-white relative flex items-center justify-between p-4 shadow-md">
      {/* Logo */}
      <div className="flex items-center space-x-4">
        <img
          src={Images}
          alt="Defi Finance Logo"
          className="h-20 sm:h-30"
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

      {/* Hamburger Menu for Mobile */}
      <div className="sm:hidden">
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

      {/* Navigation Links */}
      <nav
        className={`${
          isMenuOpen ? "block" : "hidden"
        } sm:flex sm:items-center sm:space-x-6 absolute sm:static top-16 right-0 bg-white w-full sm:w-auto shadow-md sm:shadow-none p-4 sm:p-0`}
      >
        <Link
          to="/"
          className="block text-[#036302] font-bold hover:text-[#036302] transition-colors py-2 sm:py-0"
          onClick={() => setIsMenuOpen(false)}
        >
          Lending
        </Link>
        <Link
          to="/staking"
          className="block text-[#036302] font-bold hover:text-[#036302] transition-colors py-2 sm:py-0"
          onClick={() => setIsMenuOpen(false)}
        >
          Staking
        </Link>
        <Link
          to="/yield-farming"
          className="block text-[#036302] font-bold hover:text-[#036302] transition-colors py-2 sm:py-0"
          onClick={() => setIsMenuOpen(false)}
        >
          Yield Farming
        </Link>
        <Link
          to="/token"
          className="block text-[#036302] font-bold hover:text-[#036302] transition-colors py-2 sm:py-0"
          onClick={() => setIsMenuOpen(false)}
        >
          Token
        </Link>
        <Link
          to="/how-to"
          className="block text-[#036302] font-bold hover:text-[#036302] transition-colors py-2 sm:py-0"
          onClick={() => setIsMenuOpen(false)}
        >
          How To Use
        </Link>
        <Link
          to="/admin"
          className="block text-[#036302] font-bold hover:text-[#036302] transition-colors py-2 sm:py-0"
          onClick={() => setIsMenuOpen(false)}
        >
          Admin
        </Link>
      </nav>
    </header>
  );
};

export default Header;
