import React from 'react';

const Hero = () => {
  return (
    <section className="hero bg-gradient-to-r from-green-600 to-green-800 text-white p-10 md:p-20 text-center animate-fadeIn">
      {/* Hero Title */}
      <h1 className="hero-title text-4xl md:text-5xl font-extrabold mb-4 drop-shadow-md">
        Welcome to IMANI DeFi
      </h1>
      
      {/* Hero Subtitle */}
      <p className="hero-subtitle text-lg md:text-xl mb-6 max-w-2xl mx-auto">
        A modern decentralized finance platform to lend, borrow, and stake crypto assets securely.
      </p>
      
      {/* Call-to-Action Buttons */}
      <div className="hero-buttons flex justify-center gap-4">
        <button className="btn bg-yellow-400 text-green-900 font-bold py-2 px-6 rounded shadow-md transition-transform duration-300 transform hover:scale-105 hover:shadow-lg">
          Start Lending
        </button>
        <button className="btn bg-white text-green-600 font-bold py-2 px-6 rounded shadow-md transition-transform duration-300 transform hover:scale-105 hover:shadow-lg">
          Start Borrowing
        </button>
      </div>
    </section>
  );
};

export default Hero;
