import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import Logo from '../assets/images/logo.png';
import MobileMenuIcon from '../assets/icons/menu.svg';
import CloseIcon from '../assets/icons/close.svg';
import WalletIcon from '../assets/icons/wallet.svg';

const Header = () => {
  const { account, connectWallet, disconnectWallet, isConnecting } = useWallet();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Navigation links
  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/token', label: 'Buy IMALI' },
    { path: '/staking', label: 'Staking' },
    { path: '/farming', label: 'Yield Farming' },
    { path: '/presale', label: 'Presale' },
    { path: '/dashboard', label: 'Dashboard' },
  ];

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Format wallet address
  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-gray-900 shadow-lg' : 'bg-transparent'}`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src={Logo} 
              alt="IMALI DeFi" 
              className="h-10 w-auto mr-2"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              IMALI
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'text-green-400'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Wallet Connection - Desktop */}
          <div className="hidden md:block">
            {account ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center bg-gray-800 rounded-full px-4 py-2">
                  <img src={WalletIcon} alt="Wallet" className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium text-white">
                    {formatAddress(account)}
                  </span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-400 hover:text-white focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <img 
              src={isMobileMenuOpen ? CloseIcon : MobileMenuIcon} 
              alt="Menu" 
              className="h-6 w-6"
            />
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-gray-900 shadow-lg rounded-b-lg px-4 py-3">
            <nav className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 text-base font-medium ${
                    location.pathname === link.path
                      ? 'text-green-400'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              
              <div className="pt-4 border-t border-gray-800">
                {account ? (
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center bg-gray-800 rounded-lg px-4 py-3">
                      <img src={WalletIcon} alt="Wallet" className="h-5 w-5 mr-2" />
                      <span className="text-sm font-medium text-white">
                        {formatAddress(account)}
                      </span>
                    </div>
                    <button
                      onClick={disconnectWallet}
                      className="w-full text-center text-red-400 hover:text-red-300 py-2"
                    >
                      Disconnect Wallet
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={connectWallet}
                    disabled={isConnecting}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg text-base font-medium"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
