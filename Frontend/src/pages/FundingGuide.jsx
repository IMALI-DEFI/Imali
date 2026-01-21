/*
=============================================================
File: src/pages/FundingGuide.jsx
Purpose: Simple funding guide for IMALI — Crypto & Stocks
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
          Fund Your Account in{" "}
          <span className="text-emerald-300">5 Minutes</span>
        </h1>
        <p className="mt-3 text-gray-300 text-center">
          Choose how you want to trade. Crypto (OKX or Wallet) or Stocks
          (Alpaca). All options are secure and beginner-friendly.
        </p>

        {/* ─────────────── Funding Options ─────────────── */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          {/* OKX */}
          <div className={card}>
            <h3 className="text-lg font-bold mb-2">
              🏦 Crypto via OKX (Easiest)
            </h3>
            <ol className="list-decimal ml-5 text-sm text-gray-200 space-y-1">
              <li>Log in to OKX</li>
              <li>
                Go to{" "}
                <b>Assets → Deposit</b>
              </li>
              <li>Select <b>USDT</b> or <b>USDC</b></li>
              <li>Choose <b>Ethereum (ERC20)</b></li>
              <li>Send a small test first, then your full amount</li>
              <li>Return to IMALI — balance updates automatically</li>
            </ol>

            <div className="mt-3 text-sm">
              🔑 <b>Create API Key:</b>{" "}
              <a
                href="https://app.okx.com/en-us/account/my-api"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-emerald-300"
              >
                OKX API Management
              </a>
            </div>

            <div className="text-xs text-amber-200/90 mt-2">
              Use <b>Read-Only</b> or <b>Trade</b> permissions only.
              Never enable withdrawals.
            </div>
          </div>

          {/* Wallet / DEX */}
          <div className={card}>
            <h3 className="text-lg font-bold mb-2">
              🔁 Crypto via Wallet (Advanced)
            </h3>
            <ol className="list-decimal ml-5 text-sm text-gray-200 space-y-1">
              <li>Install MetaMask or connect with WalletConnect</li>
              <li>Add gas token (ETH or MATIC)</li>
              <li>Buy USDT or USDC into your wallet</li>
              <li>Connect wallet inside IMALI</li>
              <li>Run Demo or Live trades</li>
            </ol>

            <div className="text-xs text-amber-200/90 mt-2">
              Only use official contract links listed under{" "}
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
              📈 Stocks via Alpaca
            </h3>
            <ol className="list-decimal ml-5 text-sm text-gray-200 space-y-1">
              <li>
                Create a free account at{" "}
                <a
                  href="https://alpaca.markets"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-emerald-300"
                >
                  Alpaca Markets
                </a>
              </li>
              <li>Complete identity check (KYC)</li>
              <li>Fund with bank transfer or debit card</li>
              <li>Generate API Key & Secret</li>
              <li>Paste keys into IMALI Dashboard</li>
            </ol>

            <div className="mt-3 text-sm">
              🔑 <b>API Keys Location:</b>{" "}
              <a
                href="https://app.alpaca.markets/dashboard/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-emerald-300"
              >
                Alpaca Dashboard (bottom-left → API Keys)
              </a>
            </div>

            <div className="text-xs text-amber-200/90 mt-2">
              Tip: Start with <b>Paper Mode</b> before Live trading.
            </div>
          </div>
        </div>

        {/* ─────────────── Warnings & Help ─────────────── */}
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          <div className={card}>
            <h3 className="text-lg font-bold mb-2">⚠️ Common Mistakes</h3>
            <ul className="list-disc ml-5 text-sm text-gray-200 space-y-1">
              <li>Wrong network selected</li>
              <li>No gas token in wallet</li>
              <li>Using fake contract links</li>
              <li>API keys without trading permissions</li>
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
              <li>
                <a
                  href="https://alpaca.markets/support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-indigo-300"
                >
                  Alpaca Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* ─────────────── Buttons ─────────────── */}
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
          <a
            href="https://app.okx.com/en-us/account/my-api"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 font-semibold"
          >
            OKX API Keys
          </a>
          <a
            href="https://app.alpaca.markets/dashboard/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold"
          >
            Alpaca API Keys
          </a>
        </div>
      </div>
    </div>
  );
}
