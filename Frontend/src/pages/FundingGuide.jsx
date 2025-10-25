/*
=============================================================
File: src/pages/FundingGuide.jsx
Purpose: Unified funding guide for IMALI — CEX, DEX & Stocks
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
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-center">
          Fund Your Account in{" "}
          <span className="text-emerald-300">5 Minutes</span>
        </h1>
        <p className="mt-3 text-gray-300 text-center">
          Choose your route — Crypto (CEX or DEX) or Stocks (Alpaca API). All
          secure, beginner-friendly options.
        </p>

        {/* ─────────────── Funding Routes ─────────────── */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          {/* CEX ROUTE */}
          <div className={card}>
            <h3 className="text-lg font-bold mb-2">
              🏦 CEX Route (OKX) – Fastest
            </h3>
            <ol className="list-decimal ml-5 text-sm text-gray-200 space-y-1">
              <li>Open OKX → <b>Assets → Deposit</b></li>
              <li>Select <b>USDT</b> or <b>USDC</b></li>
              <li>Choose <b>ERC20 (Ethereum)</b> network</li>
              <li>Send <b>$5 test</b>, then full amount</li>
              <li>Return to app → Dashboard updates balance</li>
            </ol>
            <div className="text-xs text-amber-200/90 mt-2">
              Avoid TRC20/BEP20 unless you fully understand the risks.
            </div>
          </div>

          {/* DEX ROUTE */}
          <div className={card}>
            <h3 className="text-lg font-bold mb-2">
              🔁 DEX Route (Advanced Users)
            </h3>
            <ol className="list-decimal ml-5 text-sm text-gray-200 space-y-1">
              <li>Install MetaMask or use WalletConnect</li>
              <li>Add gas: <b>ETH</b> (Ethereum) or <b>MATIC</b> (Polygon)</li>
              <li>On-ramp to wallet (USDT/USDC)</li>
              <li>Swap via official DEX link (IMALI contract)</li>
              <li>Connect wallet → Start trading</li>
            </ol>
            <div className="text-xs text-amber-200/90 mt-2">
              Only use verified contracts listed under{" "}
              <Link
                to="/supported-chains"
                className="underline text-indigo-300"
              >
                Supported Chains
              </Link>
              .
            </div>
          </div>

          {/* STOCKS ROUTE (ALPACA) */}
          <div className={card}>
            <h3 className="text-lg font-bold mb-2">
              📈 Stocks Route (Alpaca API)
            </h3>
            <ol className="list-decimal ml-5 text-sm text-gray-200 space-y-1">
              <li>
                Go to{" "}
                <a
                  href="https://alpaca.markets"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-emerald-300"
                >
                  Alpaca Markets
                </a>{" "}
                → Create a free account
              </li>
              <li>Complete quick KYC (name, ID, funding source)</li>
              <li>
                Fund your Alpaca account via <b>Bank Transfer</b> or{" "}
                <b>Debit Card</b>
              </li>
              <li>
                In IMALI Dashboard → Connect Alpaca via API key & secret
              </li>
              <li>
                Start live or paper trading stocks with your chosen strategy
              </li>
            </ol>
            <div className="text-xs text-amber-200/90 mt-2">
              Tip: Use <b>Paper Mode</b> first — it simulates trades safely.
            </div>
          </div>
        </div>

        {/* ─────────────── Help + Warnings ─────────────── */}
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          <div className={card}>
            <h3 className="text-lg font-bold mb-2">⚠️ Common Mistakes</h3>
            <ul className="list-disc ml-5 text-sm text-gray-200 space-y-1">
              <li>Wrong network (TRC20/BEP20) → funds stuck</li>
              <li>No gas token in wallet → can’t move funds</li>
              <li>Fake DEX or contract links → scams</li>
              <li>Wrong Alpaca API key permissions → blocked trades</li>
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
                  Contact Support
                </Link>
              </li>
              <li>
                <a
                  href="https://alpaca.markets/support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-indigo-300"
                >
                  Alpaca Support Center
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
            View Supported Chains
          </Link>
          <a
            href="https://alpaca.markets"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold"
          >
            Visit Alpaca
          </a>
        </div>
      </div>
    </div>
  );
}