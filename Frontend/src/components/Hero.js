import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Logo from "../assets/images/DefiFinanceLogo.png";
import Fireworks from "../assets/animations/fireworks.svg";

const Hero = () => {
  const [logoSize, setLogoSize] = useState(80);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setLogoSize(60);
      } else if (window.innerWidth < 1024) {
        setLogoSize(80);
      } else {
        setLogoSize(350);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const heroTitle = "Welcome to IMALI DeFi";
  const heroDescription =
    "Your gateway to decentralized finance, designed for beginners. Start your journey with easy-to-use tools and step-by-step guidance.";

  return (
    <section className="bg-gradient-to-r from-green-600 to-green-800 text-white py-20">
      <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center justify-between">
        <div className="text-center lg:text-left lg:w-1/2">
          <img
            src={Logo}
            alt="IMALI DeFi Logo - Gateway to Decentralized Finance"
            style={{ height: `${logoSize}px` }}
            className="mb-6 mx-auto lg:mx-0"
          />
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            {heroTitle}
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl mb-8">{heroDescription}</p>
          <div className="flex justify-center lg:justify-start space-x-4">
            <Link
              to="/presale"  {/* Updated to point to presale */}
              className="bg-white text-green-700 font-semibold py-3 px-6 rounded-lg hover:bg-green-100 transition-colors duration-300"
              aria-label="Get Started with IMALI DeFi"
            >
              Get Started
            </Link>
            <Link
              to="/how-to-use"  {/* Updated to point to how-to-use */}
              className="bg-transparent border-2 border-white text-white font-semibold py-3 px-6 rounded-lg hover:bg-white hover:text-green-700 transition-colors duration-300"
              aria-label="Learn More about IMALI DeFi"
            >
              Learn More
            </Link>
          </div>
        </div>

        <div className="lg:w-1/2 mt-10 lg:mt-0 text-center">
          <img
            src={Fireworks}
            alt="Celebratory Fireworks - IMALI DeFi Celebration"
            className="w-full max-w-xs mx-auto"
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;