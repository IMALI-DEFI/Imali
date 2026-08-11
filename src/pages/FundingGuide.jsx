/*
=============================================================
File: src/pages/FundingGuide.jsx
Purpose: Simple funding and connection guide for IMALI
=============================================================
*/

import React from "react";
import { Link } from "react-router-dom";

export default function FundingGuide() {
  const card =
    "rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Header */}
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-center">
          Fund Your Account and{" "}
          <span className="text-emerald-300">Connect to IMALI</span>
        </h1>

        <p className="mt-3 text-gray-300 text-center max-w-3xl mx-auto">
          Your money stays with your brokerage, exchange, or wallet. Choose the
          account you already use, fund it there, then connect it to IMALI.
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs text-gray-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Robinhood Crypto
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            OKX Crypto
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Alpaca Stocks
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Self-Custody Wallet
          </span>
        </div>

        {/* Funding Options */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mt-8">
          {/* Robinhood */}
          <div className={`${card} border-emerald-400/30`}>
            <div className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 mb-3">
              Familiar option
            </div>

            <h3 className="text-lg font-bold mb-2">
              🪶 Crypto with Robinhood
            </h3>

            <ol className="list-decimal ml-5 text-sm text-gray-200 space-y-1">
              <li>Open or log in to Robinhood</li>
              <li>Fund your Robinhood account</li>
              <li>Enable Robinhood Crypto API access</li>
              <li>Create your API key pair</li>
              <li>Copy the API key and private key</li>
              <li>Connect them securely inside IMALI</li>
            </ol>

            <Link
              to="/connect-robinhood"
              className="mt-4 inline-flex rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold"
            >
              Connect Robinhood
            </Link>

            <div className="text-xs text-amber-200/90 mt-3">
              ⚠️ Only enable the permissions IMALI needs for account reading and
              crypto trading.
            </div>
          </div>

          {/* OKX */}
          <div className={card}>
            <h3 className="text-lg font-bold mb-2">
              🏦 Crypto with OKX
            </h3>

            <ol className="list-decimal ml-5 text-sm text-gray-200 space-y-1">
              <li>Log in to OKX</li>
              <li>Click <b>Assets → Deposit</b></li>
              <li>Pick <b>USDT</b> or <b>USDC</b></li>
              <li>Choose the correct deposit network</li>
              <li>Send a small test amount first</li>
              <li>Connect your OKX API keys in IMALI</li>
            </ol>

            <Link
              to="/connect-okx"
              className="mt-4 inline-flex rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-sm font-semibold"
            >
              Connect OKX
            </Link>

            <div className="text-xs text-amber-200/90 mt-3">
              ⚠️ Allow read and trading access only. Never enable withdrawals.
            </div>
          </div>

          {/* Stocks */}
          <div className={card}>
            <h3 className="text-lg font-bold mb-2">
              📈 Stocks with Alpaca
            </h3>

            <ol className="list-decimal ml-5 text-sm text-gray-200 space-y-1">
              <li>Create or log in to your Alpaca account</li>
              <li>Verify your identity</li>
              <li>Fund your brokerage account</li>
              <li>Create API keys</li>
              <li>Connect the keys inside IMALI</li>
            </ol>

            <Link
              to="/connect-alpaca"
              className="mt-4 inline-flex rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold"
            >
              Connect Alpaca
            </Link>

            <div className="text-xs text-gray-400 mt-3">
              Robinhood integration currently covers the Robinhood Crypto API;
              Alpaca remains the direct stock-broker connection shown here.
            </div>
          </div>

          {/* Wallet */}
          <div className={card}>
            <h3 className="text-lg font-bold mb-2">
              🔁 Use Your Crypto Wallet
            </h3>

            <ol className="list-decimal ml-5 text-sm text-gray-200 space-y-1">
              <li>Install a supported wallet such as MetaMask</li>
              <li>Add the network gas token</li>
              <li>Hold the supported asset you want to trade</li>
              <li>Connect your wallet in IMALI</li>
              <li>Review the network and trading settings</li>
            </ol>

            <Link
              to="/connect-wallet"
              className="mt-4 inline-flex rounded-lg bg-purple-600 hover:bg-purple-500 px-4 py-2 text-sm font-semibold"
            >
              Connect Wallet
            </Link>

            <div className="text-xs text-amber-200/90 mt-3">
              Only use supported networks and verified token contracts.
            </div>
          </div>
        </div>

        {/* Common Mistakes */}
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          <div className={card}>
            <h3 className="text-lg font-bold mb-2">⚠️ Watch Out For</h3>
            <ul className="list-disc ml-5 text-sm text-gray-200 space-y-1">
              <li>Using the wrong blockchain network</li>
              <li>Missing the gas token for wallet transactions</li>
              <li>Using unverified token or contract links</li>
              <li>Creating API credentials without trading permission</li>
              <li>Enabling permissions IMALI does not need</li>
            </ul>
          </div>

          <div className={card}>
            <h3 className="text-lg font-bold mb-2">💬 Need Help?</h3>
            <div className="space-y-3 text-sm text-gray-200">
              <p>
                Start with the account you are already comfortable using. You
                can connect another platform later.
              </p>

              <div className="flex flex-wrap gap-2">
                <Link
                  to="/how-it-works"
                  className="underline text-indigo-300"
                >
                  How IMALI Works
                </Link>

                <Link
                  to="/supported-chains"
                  className="underline text-indigo-300"
                >
                  Supported Chains
                </Link>

                <Link
                  to="/support"
                  className="underline text-indigo-300"
                >
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-10 text-center flex flex-wrap gap-3 justify-center">
          <Link
            to="/dashboard"
            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold"
          >
            Go to Dashboard
          </Link>

          <Link
            to="/signup"
            className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold"
          >
            Create IMALI Account
          </Link>
        </div>
      </div>
    </div>
  );
}
