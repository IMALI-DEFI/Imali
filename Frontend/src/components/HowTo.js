import React from "react";

const HowTo = () => {
  return (
    <section className="bg-gray-100 min-h-screen py-16 px-6">
      <div className="container mx-auto max-w-6xl bg-white shadow-lg p-8 rounded-lg">
        <h2 className="text-4xl font-bold text-green-600 text-center mb-8">
          📌 How to Use IMALI
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
              . Open MetaMask, create or import your wallet, and click the “Connect Wallet” button on the dashboard.
              Ensure you’re on the correct network (Ethereum for lending and IMALI tokens; Polygon for staking and yield farming).
            </p>
          </div>

          {/* 2. Purchase IMALI Tokens */}
          <div className="p-6 border rounded-lg bg-white">
            <h3 className="font-bold text-xl text-blue-700 mb-2">
              2️⃣ Purchase IMALI Tokens
            </h3>
            <p className="text-gray-700">
              Navigate to the Tokens page where you can purchase IMALI tokens. You can buy these directly using ETH or MATIC,
              or purchase them through an exchange. Make sure the tokens are sent to your connected wallet.
            </p>
          </div>

          {/* 3. Stake Your Tokens */}
          <div className="p-6 border rounded-lg bg-white">
            <h3 className="font-bold text-xl text-red-700 mb-2">
              3️⃣ Stake Your Tokens
            </h3>
            <p className="text-gray-700">
              To earn additional rewards, visit the Staking dashboard. Enter the amount of tokens you wish to stake and confirm the
              transaction in MetaMask. A small staking fee may be deducted as defined in the contract.
            </p>
          </div>

          {/* 4. Yield Farming */}
          <div className="p-6 border rounded-lg bg-white">
            <h3 className="font-bold text-xl text-purple-700 mb-2">
              4️⃣ Yield Farming
            </h3>
            <p className="text-gray-700">
              Yield farming allows you to provide liquidity and earn extra rewards. Deposit your tokens into the yield farming pool,
              and you’ll start earning rewards. Check the Yield Farming dashboard for details on APYs and your accrued rewards.
            </p>
          </div>

          {/* 5. Lending & Borrowing */}
          <div className="p-6 border rounded-lg bg-white">
            <h3 className="font-bold text-xl text-teal-700 mb-2">
              5️⃣ Lending & Borrowing
            </h3>
            <p className="text-gray-700">
              Our lending platform lets you use your tokens as collateral to borrow stablecoins or deposit tokens to earn interest.
              <br /><br />
              <strong>Deposit Collateral:</strong> Choose an asset from the lending dashboard and click “Deposit Collateral.”
              Enter the amount to lock as collateral and confirm the transaction.
              <br /><br />
              <strong>Borrow Stablecoin:</strong> Once you’ve deposited collateral, click “Borrow Stablecoin” on the asset card.
              Enter the amount you wish to borrow. (Make sure your collateral meets the required ratio.)
              <br /><br />
              <strong>Repay Borrow:</strong> To repay your loan, click “Repay Borrow.” In the modal, enter your Borrow ID (if you have multiple positions)
              and the amount you wish to repay, then confirm the transaction.
              <br /><br />
              <strong>Withdraw Collateral:</strong> After repaying or if you have extra collateral, click “Withdraw Collateral.”
              Enter the amount to withdraw and confirm the transaction. Ensure you leave enough collateral to cover any outstanding loans.
            </p>
          </div>

          {/* 6. Airdrops (Optional) */}
          <div className="p-6 border rounded-lg bg-white">
            <h3 className="font-bold text-xl text-orange-700 mb-2">
              6️⃣ Airdrops
            </h3>
            <p className="text-gray-700">
              Occasionally, IMALI may distribute free tokens via airdrops to active users.
              Stay tuned to our announcements and make sure your wallet is connected to receive any airdrops.
            </p>
          </div>
        </div>

        <div className="text-center mt-8">
          <button className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition">
            🚀 Start Using IMALI
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowTo;
