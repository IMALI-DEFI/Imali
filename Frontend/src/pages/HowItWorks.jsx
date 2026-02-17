// src/pages/HowItWorks.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function HowItWorks() {
  const card =
    "rounded-xl bg-gray-800/70 border border-white/10 p-6 shadow-lg";

  return (
    <div className="bg-gradient-to-b from-gray-900 to-black text-white min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-20">

        <h1 className="text-4xl font-extrabold text-center">
          How IMALI Works
        </h1>

        <p className="text-center text-gray-300 mt-4">
          We make trading simple. Just follow these 4 easy steps.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mt-12">

          <div className={card}>
            <h3 className="text-xl font-bold mb-2">1. Sign Up</h3>
            <p className="text-gray-300">
              Create your account and choose your plan.
            </p>
          </div>

          <div className={card}>
            <h3 className="text-xl font-bold mb-2">2. Fund Your Account</h3>
            <p className="text-gray-300 mb-4">
              Add money using OKX, Alpaca, or your crypto wallet.
            </p>
            <Link
              to="/funding-guide"
              className="text-emerald-400 underline"
            >
              View Funding Guide
            </Link>
          </div>

          <div className={card}>
            <h3 className="text-xl font-bold mb-2">3. Turn On Trading</h3>
            <p className="text-gray-300">
              Choose a strategy and enable trading.
            </p>
          </div>

          <div className={card}>
            <h3 className="text-xl font-bold mb-2">4. Watch It Work</h3>
            <p className="text-gray-300">
              The bot looks for opportunities and trades for you.
            </p>
          </div>
        </div>

        <div className="text-center mt-12">
          <Link
            to="/signup"
            className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold"
          >
            Get Started
          </Link>
        </div>

      </div>
    </div>
  );
}
