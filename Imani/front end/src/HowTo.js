import React from "react";

const HowTo = () => {
  return (
    <section className="bg-gray-100 min-h-screen py-16 px-6">
      <div className="container mx-auto max-w-6xl bg-white shadow-lg p-8 rounded-lg">
        <h2 className="text-4xl font-bold text-green-600 text-center mb-8">
          📌 How to Use IMANI
        </h2>

        <div className="space-y-6">
          {/* 1. Connect Your Wallet */}
          <div className="p-6 border rounded-lg bg-white">
            <h3 className="font-bold text-xl text-green-700 mb-2">
              1️⃣ Connect Your Wallet
            </h3>
            <p className="text-gray-700">
              Download and install MetaMask from{" "}
              <a
                href="https://metamask.io/download.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                metamask.io
              </a>
              . Open MetaMask, create or import your wallet, and select the correct network
              (Polygon for staking and yield farming, Ethereum for lending). Then, click the
              “Connect Wallet” button on the dashboard.
            </p>
          </div>

          {/* 2. Purchase Tokens */}
          <div className="p-6 border rounded-lg bg-white">
            <h3 className="font-bold text-xl text-blue-700 mb-2">
              2️⃣ Purchase IMALI Tokens
            </h3>
            <p className="text-gray-700">
              Use our Tokens page to buy IMALI tokens. You can purchase tokens directly
              (using ETH or MATIC, as applicable) or via an exchange. Make sure the tokens
              are sent to your connected wallet.
            </p>
          </div>

          {/* 3. Stake Your Tokens */}
          <div className="p-6 border rounded-lg bg-white">
            <h3 className="font-bold text-xl text-red-700 mb-2">
              3️⃣ Stake Your Tokens
            </h3>
            <p className="text-gray-700">
              Head to the Staking dashboard to deposit your tokens. Enter the amount to
              stake, and confirm the transaction in MetaMask. A small staking fee will be
              deducted as defined in the contract.
            </p>
          </div>

          {/* 4. Yield Farming */}
          <div className="p-6 border rounded-lg bg-white">
            <h3 className="font-bold text-xl text-purple-700 mb-2">
              4️⃣ Yield Farming
            </h3>
            <p className="text-gray-700">
              Yield farming lets you provide liquidity by staking tokens in a pool to earn
              extra rewards. Simply deposit your tokens into the yield farming pool and watch
              your rewards grow.
            </p>
          </div>

          {/* 5. Lending & Borrowing */}
          <div className="p-6 border rounded-lg bg-white">
            <h3 className="font-bold text-xl text-teal-700 mb-2">
              5️⃣ Lending & Borrowing
            </h3>
            <p className="text-gray-700">
              Our lending platform lets you deposit tokens to earn interest or borrow tokens
              against your collateral. Review the fee and interest rates on the dashboard
              before proceeding.
            </p>
          </div>

          {/* 6. Airdrops */}
          <div className="p-6 border rounded-lg bg-white">
            <h3 className="font-bold text-xl text-orange-700 mb-2">
              6️⃣ Airdrops
            </h3>
            <p className="text-gray-700">
              Occasionally, IMANI may distribute free tokens via airdrops to active users.
              Keep an eye on our announcements and ensure your wallet is connected to receive
              any airdrops.
            </p>
          </div>
        </div>

        <div className="text-center mt-8">
          <button className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition">
            🚀 Start Using IMANI
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowTo;
