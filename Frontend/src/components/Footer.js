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
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="hover:text-yellow-400 transition-colors duration-300"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/lending"
                  className="hover:text-yellow-400 transition-colors duration-300"
                >
                  Lending
                </Link>
              </li>
              <li>
                <Link
                  to="/staking"
                  className="hover:text-yellow-400 transition-colors duration-300"
                >
                  Staking
                </Link>
              </li>
              <li>
                <Link
                  to="/yield-farming"
                  className="hover:text-yellow-400 transition-colors duration-300"
                >
                  Yield Farming
                </Link>
              </li>
              <li>
                <Link
                  to="/presale"
                  className="hover:text-yellow-400 transition-colors duration-300"
                >
                  Presale
                </Link>
              </li>
              <li>
                <Link
                  to="/nft"
                  className="hover:text-yellow-400 transition-colors duration-300"
                >
                  NFT
                </Link>
              </li>
              <li>
                <Link
                  to="/dao"
                  className="hover:text-yellow-400 transition-colors duration-300"
                >
                  DAO
                </Link>
              </li>
              <li>
                <Link
                  to="/how-to"
                  className="hover:text-yellow-400 transition-colors duration-300"
                >
                  How To
                </Link>
              </li>
              <li>
                <Link
                  to="/admin"
                  className="hover:text-yellow-400 transition-colors duration-300"
                >
                  Admin
                </Link>
              </li>
            </ul>
          </nav>

          {/* Right Side - Social Links */}
          <div className="text-center md:text-right">
            <p className="text-sm mb-2">Follow us:</p>
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