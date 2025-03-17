import React from 'react';

const Footer = () => {
  return (
    <footer className="footer bg-green-700 text-white py-6 mt-10">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
        
        {/* Left Side - Branding */}
        <div className="mb-4 md:mb-0">
          <h2 className="text-2xl font-bold">IMANI DeFi</h2>
          <p className="text-sm mt-2">
            Empowering your financial independence through decentralized solutions.
          </p>
        </div>

        {/* Center - Links */}
        <nav className="mb-4 md:mb-0">
          <ul className="flex flex-wrap justify-center gap-4">
            <li>
              <a
                href="#hero"
                className="hover:text-yellow-400 transition-colors duration-300"
              >
                Home
              </a>
            </li>
            <li>
              <a
                href="#features"
                className="hover:text-yellow-400 transition-colors duration-300"
              >
                Features
              </a>
            </li>
            <li>
              <a
                href="#dashboard"
                className="hover:text-yellow-400 transition-colors duration-300"
              >
                Dashboard
              </a>
            </li>
            <li>
              <a
                href="#contact"
                className="hover:text-yellow-400 transition-colors duration-300"
              >
                Contact
              </a>
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
        <p>&copy; {new Date().getFullYear()} IMANI DeFi. All Rights Reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
