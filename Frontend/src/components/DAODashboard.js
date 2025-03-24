import React from "react";
import VoteAnimation from "../assets/animations/vote-animation.svg"; // Updated SVG

const DAO = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-center mb-10">IMALI DAO</h1>

      <div className="flex flex-col md:flex-row items-center">
        {/* Voting Animation */}
        <div className="md:w-1/2 mb-8 md:mb-0">
          <img src={VoteAnimation} alt="DAO Voting Animation" className="w-full h-auto max-w-sm mx-auto" />
        </div>

        {/* Content Side */}
        <div className="md:w-1/2">
          <h2 className="text-2xl font-bold mb-4">Your Voice, Your Vote</h2>
          <p className="mb-4">
            The IMALI DAO empowers token holders to directly influence the direction of the ecosystem.
            By holding IMALI tokens on the Polygon network, you can submit proposals, vote on key decisions,
            and help shape the future of decentralized finance.
          </p>

          <h2 className="text-xl font-semibold mb-2">Benefits of Participation</h2>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Earn rewards for voting and submitting proposals</li>
            <li>Gain early access to platform features and pools</li>
            <li>Help direct treasury investments (e.g., real estate, liquidity)</li>
            <li>Be part of shaping IMALI’s evolution</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4">How It Works</h2>
          <ol className="list-decimal list-inside space-y-2 mb-4">
            <li>Hold IMALI tokens in your wallet</li>
            <li>Access the DAO dashboard</li>
            <li>Submit proposals using <code>propose(description)</code></li>
            <li>Vote using <code>vote(proposalId, support)</code></li>
            <li>Winning proposals are executed via <code>execute(proposalId)</code></li>
          </ol>

          <p className="text-sm text-gray-300 italic">
            Smart contract-based governance ensures every decision is transparent, verifiable, and community-driven.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DAO;

