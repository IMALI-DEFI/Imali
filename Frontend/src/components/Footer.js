import React from 'react';
import { Link } from 'react-router-dom'; // Import Link

const Footer = () => {
  return (
    <footer className="footer bg-green-700 text-white py-6 mt-10">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
        
        {/* Left Side - Branding */}
        <div className="mb-4 md:mb-0">
          <h2 className="text-2xl font-bold">IMALI DeFi</h2>
          <p className="text-sm mt-2">
            Empowering your financial independence through decentralized solutions.
          </p>
        </div>

        {/* Center - Navigation Links (Matching Header) */}
        <nav className="mb-4 md:mb-0">
          <ul className="flex flex-wrap justify-center gap-4">
            <li>
              <Link to="/" className="hover:text-yellow-400 transition-colors duration-300">
                Lending
              </Link>
            </li>
            <li>
              <Link to="/staking" className="hover:text-yellow-400 transition-colors duration-300">
                Staking
              </Link>
            </li>
            <li>
              <Link to="/yield-farming" className="hover:text-yellow-400 transition-colors duration-300">
                Yield Farming
              </Link>
            </li>
            <li>
              <Link to="/token" className="hover:text-yellow-400 transition-colors duration-300">
                Token
              </Link>
            </li>
            <li>
              <Link to="/how-to" className="hover:text-yellow-400 transition-colors duration-300">
                How To
              </Link>
            </li>
            <li>
              <Link to="/admin" className="hover:text-yellow-400 transition-colors duration-300">
                Admin
              </Link>
            </li>
          </ul>
        </nav>

        {/* Right Side - Social Links */}
        <div>
          <p className="text-sm mb-2">Follow us:</p>
          <div className="flex justify-center md:justify-start gap-4">
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
    </footer>
  );
};

export default Footer;
