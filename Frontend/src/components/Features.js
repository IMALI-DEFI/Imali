import React from "react";
import { Link } from "react-router-dom";

const Features = () => {
  const features = [
    {
      icon: "🔒",
      title: "AI-Secured Transactions",
      description: "Our platform uses advanced AI to ensure the highest level of security for your transactions.",
    },
    {
      icon: "🌾",
      title: "Yield Farming",
      description: "Earn rewards by providing liquidity to our decentralized finance ecosystem.",
    },
    {
      icon: "💰",
      title: "Staking",
      description: "Stake your tokens and earn passive income with competitive APY rates.",
    },
    {
      icon: "📜",
      title: "Decentralized Governance",
      description: "Participate in platform decisions through our decentralized governance model.",
    },
  ];

  return (
    <section className="bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-12">
          Why Choose IMALI DeFi?
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-lg shadow-md text-center hover:shadow-lg transition-shadow duration-300"
            >
              <span role="img" aria-label={feature.title} className="text-4xl">
                {feature.icon}
              </span>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          {/* Changed from "/features" to "/how-to-use" */}
          <Link
            to="/how-to-use"
            className="bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-300"
            aria-label="Learn how to use all IMALI DeFi features"
          >
            Explore All Features
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Features;
