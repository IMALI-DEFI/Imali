import React from "react";

export default function WalletMetaMask() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-white">
      <h1 className="text-3xl font-bold mb-6">MetaMask Setup</h1>

      <h2 className="text-xl font-semibold mb-2">1) Install</h2>
      <p className="text-gray-300 mb-4">
        Get MetaMask from the official site or app store. Avoid fake extensions.
      </p>

      <h2 className="text-xl font-semibold mb-2">2) Create or Import a Wallet</h2>
      <p className="text-gray-300 mb-4">
        Create a new wallet and securely store your seed phrase (offline), or import an existing one.
      </p>

      <h2 className="text-xl font-semibold mb-2">3) Add Networks (If Needed)</h2>
      <p className="text-gray-300 mb-4">
        MetaMask ships with Ethereum. To use BNB Chain or Polygon, add those networks in settings or
        connect once and approve the add-network prompt.
      </p>

      <h2 className="text-xl font-semibold mb-2">4) Fund Your Wallet</h2>
      <p className="text-gray-300 mb-4">
        Send the chain’s native token to your address for gas. See the{" "}
        <a href="/funding-guide" className="text-indigo-400 underline">Funding Guide</a>.
      </p>

      <h2 className="text-xl font-semibold mb-2">5) Connect to IMALI</h2>
      <p className="text-gray-300">
        On the Signup page, click <b>Connect Wallet</b> and approve the request in MetaMask. You’re
        ready to choose a tier and start using bots.
      </p>
    </div>
  );
}
