import React from 'react';
import { Link } from 'react-router-dom';
import Images from '../assets/images/DefiFinanceLogo.png'className="w-36 h-36 md:w-40 md:h-40 lg:w-44 lg:h-44";

const Header = () => {
  return (
    <header className="bg-white relative flex items-center p-4 shadow-md">
      <div className="flex items-center space-x-4">
        <img
          src={Images}
          alt="Defi Finance Logo"
          className="h-20"
        />
      </div>
      <nav className="flex space-x-6">
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
