import React from "react";
import { Link } from "react-router-dom";
import Logo from "../assets/images/DefiFinanceLogo.png";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-8">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        {/* Brand */}
        <div>
          <img src={Logo} alt="IMALI Logo" className="h-10 mb-3" />
          <p className="text-sm text-gray-400">
            IMALI DeFi — Unlocking financial freedom for everyone.
          </p>
        </div>

        {/* Links */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Quick Links</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="hover:text-indigo-400">Home</Link></li>
            <li><Link to="/dashboard" className="hover:text-indigo-400">Dashboard</Link></li>
            <li><Link to="/how-it-works" className="hover:text-indigo-400">How It Works</Link></li>
            <li><Link to="/support" className="hover:text-indigo-400">Support</Link></li>
          </ul>
        </div>

        {/* Social */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Connect</h3>
          <div className="flex flex-wrap gap-3 text-gray-400">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-white">Facebook</a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-white">Instagram</a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-white">Twitter</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-white">LinkedIn</a>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-gray-700 pt-4 text-center text-xs text-gray-500">
        &copy; {new Date().getFullYear()} IMALI DeFi. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
