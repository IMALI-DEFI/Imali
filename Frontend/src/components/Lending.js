// 📦 src/components/Lending.js (Full Lending + Borrowing Platform Connected to Contract)

// Added novice-friendly explanations and step-by-step guide

import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { getContractInstance } from "../getContractInstance";
import lendingGuideImage from "../assets/images/lending-guide-visual.png";
import { FaEthereum, FaBitcoin, FaDollarSign, FaChartLine } from "react-icons/fa";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

// [Previous imports and logic remain the same]

const Lending = () => {
  // [States and handlers remain the same]

  return (
    <section className="dashboard text-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto text-center space-y-8">
        <div className="bg-yellow-100 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">🛠 Quick Start Guide</h2>
          <ol className="text-left list-decimal list-inside space-y-2">
            <li><strong>Connect Your Wallet:</strong> Click the blue button below to link your crypto wallet (e.g., MetaMask).</li>
            <li><strong>Deposit Collateral:</strong> Choose a crypto asset (like ETH) to lock into the platform as a security.</li>
            <li><strong>Borrow:</strong> Once you deposit collateral, you can borrow stablecoins against it.</li>
            <li><strong>Repay Loan:</strong> Pay back your borrowed stablecoins anytime to unlock your collateral.</li>
            <li><strong>Supply Stablecoin:</strong> Lend stablecoins to the platform and earn interest over time!</li>
            <li><strong>Withdraw Funds:</strong> Take out your deposited assets or supplied coins whenever you like.</li>
          </ol>
          <p className="mt-4 text-sm text-gray-600">Note: Always double-check amounts before confirming transactions. Gas fees apply for every action.</p>
        </div>

        {!account ? (
          <button
            onClick={connectWallet}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg font-bold hover:bg-blue-700"
          >
            Connect Wallet
          </button>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <button onClick={() => setSelectedAction("deposit")} className="bg-gray-100 hover:bg-gray-200 p-6 rounded-lg">Deposit Collateral</button>
            <button onClick={() => setSelectedAction("withdraw")} className="bg-gray-100 hover:bg-gray-200 p-6 rounded-lg">Withdraw Collateral</button>
            <button onClick={() => setSelectedAction("borrow")} className="bg-gray-100 hover:bg-gray-200 p-6 rounded-lg">Borrow</button>
            <button onClick={() => setSelectedAction("repay")} className="bg-gray-100 hover:bg-gray-200 p-6 rounded-lg">Repay Loan</button>
            <button onClick={() => setSelectedAction("supply")} className="bg-gray-100 hover:bg-gray-200 p-6 rounded-lg">Supply Stablecoin</button>
            <button onClick={() => setSelectedAction("withdrawSupply")} className="bg-gray-100 hover:bg-gray-200 p-6 rounded-lg">Withdraw Supply</button>
          </div>
        )}
      </div>
      {selectedAction && <ActionModal />}
    </section>
  );
};

export default Lending;
