import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Images from '../assets/images/DefiFinanceLogo.png';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white relative flex items-center justify-between p-4 shadow-md">
      {/* Logo */}
      <div className="flex items-center space-x-4">
        <img
          src={Images}
          alt="Defi Finance Logo"
          className="h-25 sm:h-16" // Adjust logo size for different screens
        />
      </div>

      {/* Hamburger Menu Button (Mobile Only) */}
      <button
        className="sm:hidden p-2 focus:outline-none"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <svg
          className="w-6 h-6 text-[#036302]"
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

      {/* Overlay and Navigation Links (Mobile Only) */}
      <div className="sm:hidden">
        {/* Overlay */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-10"
            onClick={() => setIsMenuOpen(false)}
          />
        )}

        {/* Navigation Links with Animation */}
        <nav
          className={`${
            isMenuOpen ? 'translate-x-0' : 'translate-x-full'
          } sm:translate-x-0 sm:flex sm:space-x-6 fixed sm:static top-16 left-0 right-0 bg-white shadow-md sm:shadow-none p-4 sm:p-0 transition-transform duration-300 ease-in-out transform z-20`}
        >
          <Link
            to="/"
            className="block sm:inline-block text-[#036302] font-bold hover:text-[#036302] transition-colors py-2 sm:py-0"
            onClick={() => setIsMenuOpen(false)}
          >
            Lending
          </Link>
          <Link
            to="/staking"
            className="block sm:inline-block text-[#036302] font-bold hover:text-[#036302] transition-colors py-2 sm:py-0"
            onClick={() => setIsMenuOpen(false)}
          >
            Staking
          </Link>
          <Link
            to="/yield-farming"
            className="block sm:inline-block text-[#036302] font-bold hover:text-[#036302] transition-colors py-2 sm:py-0"
            onClick={() => setIsMenuOpen(false)}
          >
            Yield Farming
          </Link>
          <Link
            to="/token"
            className="block sm:inline-block text-[#036302] font-bold hover:text-[#036302] transition-colors py-2 sm:py-0"
            onClick={() => setIsMenuOpen(false)}
          >
            Token
          </Link>
          <Link
            to="/how-to"
            className="block sm:inline-block text-[#036302] font-bold hover:text-[#036302] transition-colors py-2 sm:py-0"
            onClick={() => setIsMenuOpen(false)}
          >
            How To Use
          </Link>
          <Link
            to="/admin"
            className="block sm:inline-block text-[#036302] font-bold hover:text-[#036302] transition-colors py-2 sm:py-0"
            onClick={() => setIsMenuOpen(false)}
          >
            Admin
          </Link>
        </nav>
      </div>

      {/* Navigation Links (Desktop Only) */}
      <nav className="hidden sm:flex sm:space-x-6">
        <Link
          to="/"
          className="text-[#036302] font-bold hover:text-[#036302] transition-colors"
        >
          Lending
        </Link>
        <Link
          to="/staking"
          className="text-[#036302] font-bold hover:text-[#036302] transition-colors"
        >
          Staking
        </Link>
        <Link
          to="/yield-farming"
          className="text-[#036302] font-bold hover:text-[#036302] transition-colors"
        >
          Yield Farming
        </Link>
        <Link
          to="/token"
          className="text-[#036302] font-bold hover:text-[#036302] transition-colors"
        >
          Token
        </Link>
        <Link
          to="/how-to"
          className="text-[#036302] font-bold hover:text-[#036302] transition-colors"
        >
          How To Use
        </Link>
        <Link
          to="/admin"
          className="text-[#036302] font-bold hover:text-[#036302] transition-colors"
        >
          Admin
        </Link>
      </nav>
    </header>
  );
};

export default Header;
