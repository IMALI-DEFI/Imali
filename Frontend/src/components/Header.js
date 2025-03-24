import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Logo from "../assets/images/DefiFinanceLogo.png"; // Adjust the path to your logo

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoSize, setLogoSize] = useState (30); // Initial logo size

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    const handleResize = () => {
      // Adjust logo size based on screen width
      if (window.innerWidth < 640) {
        setLogoSize(23); // Smaller logo on mobile
      } else if (window.innerWidth < 1024) {
        setLogoSize(23); // Medium logo on tablets
      } else {
        setLogoSize(20); // Larger logo on desktops
      }
    };

    // Initial size and event listener for resize
    handleResize();
    window.addEventListener("resize", handleResize);

    // Cleanup the event listener on component unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <header className="bg-white shadow-md w-full z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/">
              <img
                src={Logo}
                alt="IMALI DeFi Logo"
                className={`h-${logoSize} w-auto`} // Dynamically set logo size
              />
            </Link>
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
              className="block text-[#036302] font-bold hover:text-[#036302]/80 transition-colors py-2 sm:py-0"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/lending"
              className="block text-[#036302] font-bold hover:text-[#036302]/80 transition-colors py-2 sm:py-0"
              onClick={() => setIsMenuOpen(false)}
            >
              Lending
            </Link>
            <Link
              to="/staking"
              className="block text-[#036302] font-bold hover:text-[#036302]/80 transition-colors py-2 sm:py-0"
              onClick={() => setIsMenuOpen(false)}
            >
              Staking
            </Link>
            <Link
              to="/yield-farming"
              className="block text-[#036302] font-bold hover:text-[#036302]/80 transition-colors py-2 sm:py-0"
              onClick={() => setIsMenuOpen(false)}
            >
              Yield Farming
            </Link>
            <Link
              to="/presale"
              className="block text-[#036302] font-bold hover:text-[#036302]/80 transition-colors py-2 sm:py-0"
              onClick={() => setIsMenuOpen(false)}
            >
              Presale
            </Link>
            <Link
              to="/nft"
              className="block text-[#036302] font-bold hover:text-[#036302]/80 transition-colors py-2 sm:py-0"
              onClick={() => setIsMenuOpen(false)}
            >
              NFT
            </Link>
            <Link
              to="/dao"
              className="block text-[#036302] font-bold hover:text-[#036302]/80 transition-colors py-2 sm:py-0"
              onClick={() => setIsMenuOpen(false)}
            >
              DAO
            </Link>
            <Link
              to="/how-to-use"
              className="block text-[#036302] font-bold hover:text-[#036302]/80 transition-colors py-2 sm:py-0"
              onClick={() => setIsMenuOpen(false)}
            >
              How To
            </Link>
            <Link
              to="/admin"
              className="block text-[#036302] font-bold hover:text-[#036302]/80 transition-colors py-2 sm:py-0"
              onClick={() => setIsMenuOpen(false)}
            >
              Admin
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
