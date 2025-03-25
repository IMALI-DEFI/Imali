import React from "react";
import { Link } from "react-router-dom";
import Logo from "../assets/images/DefiFinanceLogo.png"; // Your logo

const Footer = () => {
  return (
    <footer className="bg-green-700 text-white py-8 mt-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Side - Branding */}
          <div className="text-center md:text-left">
            <img
              src={Logo}
              alt="IMALI DeFi Logo"
              className="h-12 mb-4 mx-auto md:mx-0"
            />
            <p className="text-sm">
              Empowering your financial independence through decentralized
              solutions.
            </p>
          </div>

          {/* Center - Navigation Links */}
          <nav className="text-center">
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/"
                className="hover:text-yellow-400 transition-colors duration-300 whitespace-nowrap"
              >
                Home
              </Link>
              <Link
                to="/lending"
                className="hover:text-yellow-400 transition-colors duration-300 whitespace-nowrap"
              >
                Lending
              </Link>
              <Link
                to="/staking"
                className="hover:text-yellow-400 transition-colors duration-300 whitespace-nowrap"
              >
                Staking
              </Link>
              <Link
                to="/yield-farming"
                className="hover:text-yellow-400 transition-colors duration-300 whitespace-nowrap"
              >
                Yield Farming
              </Link>
              <Link
                to="/presale"
                className="hover:text-yellow-400 transition-colors duration-300 whitespace-nowrap"
              >
                Presale
              </Link>
              <Link
                to="/nft"
                className="hover:text-yellow-400 transition-colors duration-300 whitespace-nowrap"
              >
                NFT
              </Link>
              <Link
                to="/dao"
                className="hover:text-yellow-400 transition-colors duration-300 whitespace-nowrap"
              >
                DAO
              </Link>
              <Link
                to="/how-to"
                className="hover:text-yellow-400 transition-colors duration-300 whitespace-nowrap"
              >
                How To
              </Link>
              <Link
                to="/admin"
                className="hover:text-yellow-400 transition-colors duration-300 whitespace-nowrap"
              >
                Admin
              </Link>
            </div>
          </nav>

          {/* Right Side - Social Links */}
          <div className="text-center md:text-right">
            <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
            <div className="flex justify-center md:justify-end space-x-4">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-yellow-400 transition-colors duration-300"
              >
                <i className="fab fa-twitter text-xl"></i>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-yellow-400 transition-colors duration-300"
              >
                <i className="fab fa-linkedin text-xl"></i>
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-yellow-400 transition-colors duration-300"
              >
                <i className="fab fa-github text-xl"></i>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-green-600 mt-6 pt-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} IMALI DeFi. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
