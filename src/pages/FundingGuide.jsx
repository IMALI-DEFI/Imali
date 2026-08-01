/*
=============================================================
File: src/pages/FundingGuide.jsx
Purpose: Super simple funding guide for IMALI
=============================================================
*/

import React from "react";
import { Link } from "react-router-dom";

export default function FundingGuide() {
  const card =
    "rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-16">
        
        {/* Header */}
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-center">
          Add Money in{" "}
          <span className="text-emerald-300">5 Easy Minutes</span>
        </h1>
        <p className="mt-3 text-gray-300 text-center">
          Pick how you want to trade. You can use Crypto or Stocks.
          We’ll walk you through it step by step.
        </p>

        {/* Funding Options */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          
          {/* OKX */}
          <div className={card}>
            <h3 className="text-lg font-bold mb-2">
              🏦 Crypto with OKX (Easiest Way)
            </h3>
            <ol className="list-decimal ml-5 text-sm text-gray-200 space-y-1">
              <li>Log in to OKX</li>
              <li>Click <b>Assets → Deposit</b></li>
              <li>Pick <b>USDT</b> or <b>USDC</b></li>
              <li>Choose the <b>Ethereum (ERC20)</b> network</li>
              <li>Send a small test amount first</li>
              <li>Come back to IMALI — your balance updates</li>
            </ol>

            <div className="mt-3 text-sm">
              🔑 Need API keys?{" "}
              <a
                href="https://app.okx.com/en-us/account/my-api"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-emerald-300"
              >
                Click here
              </a>
            </div>

            <div className="text-xs text-amber-200/90 mt-2">
              ⚠️ Only allow trading. Never allow withdrawals.
            </div>
          </div>

          {/* Wallet */}
          <div className={card}>
            <h3 className="text-lg font-bold mb-2">
              🔁 Use Your Crypto Wallet (Advanced)
            </h3>
            <ol className="list-decimal ml-5 text-sm text-gray-200 space-y-1">
              <li>Install MetaMask</li>
              <li>Add some ETH or MATIC for gas</li>
              <li>Buy USDT or USDC</li>
              <li>Connect wallet in IMALI</li>
              <li>Start demo or live trading</li>
            </ol>

            <div className="text-xs text-amber-200/90 mt-2">
              Only use official links from{" "}
              <Link
                to="/supported-chains"
                className="underline text-indigo-300"
              >
                Supported Chains
              </Link>
              .
            </div>
          </div>

          {/* Stocks */}
          <div className={card}>
            <h3 className="text-lg font-bold mb-2">
              📈 Trade Stocks with Alpaca
            </h3>
            <ol className="list-decimal ml-5 text-sm text-gray-200 space-y-1">
              <li>
                Make a free account at{" "}
                <a
                  href="https://alpaca.markets"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-emerald-300"
                >
                  Alpaca
                </a>
              </li>
              <li>Verify your identity</li>
              <li>Add money from your bank</li>
              <li>Create API keys</li>
              <li>Paste them into IMALI</li>
            </ol>

            <div className="text-xs text-amber-200/90 mt-2">
              💡 Start in <b>Paper Mode</b> to practice first.
            </div>
          </div>
        </div>

        {/* Common Mistakes */}
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          <div className={card}>
            <h3 className="text-lg font-bold mb-2">⚠️ Watch Out For</h3>
            <ul className="list-disc ml-5 text-sm text-gray-200 space-y-1">
              <li>Picking the wrong network</li>
              <li>No gas token in wallet</li>
              <li>Using fake contract links</li>
              <li>API keys without trading permission</li>
            </ul>
          </div>

          <div className={card}>
            <h3 className="text-lg font-bold mb-2">💬 Need Help?</h3>
            <ul className="list-disc ml-5 text-sm text-gray-200 space-y-1">
              <li>
                <Link
                  to="/supported-chains"
                  className="underline text-indigo-300"
                >
                  Supported Chains
                </Link>
              </li>
              <li>
                <Link to="/support" className="underline text-indigo-300">
                  Contact IMALI Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-10 text-center flex flex-wrap gap-3 justify-center">
          <Link
            to="/signup"
            className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold"
          >
            Back to Signup
          </Link>
          <Link
            to="/supported-chains"
            className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 font-semibold"
          >
            Supported Chains
          </Link>
        </div>
      </div>
    </div>
  );
}
