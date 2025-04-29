// 📦 src/components/Lending.js (Full Lending + Borrowing Platform Connected to Contract)

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

const Lending = () => {
  const { account, connectWallet } = useWallet();
  const [selectedAction, setSelectedAction] = useState(null);
  const [inputAmount, setInputAmount] = useState("");
  const [inputCollateral, setInputCollateral] = useState("");
  const [inputBorrowId, setInputBorrowId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    try {
      if (!selectedAction) return;
      setLoading(true);
      const contract = await getContractInstance("Lending");
      const signer = await contract.runner;

      if (selectedAction === "deposit") {
        const token = new ethers.Contract(inputCollateral, ["function approve(address,uint256) public returns (bool)"], signer);
        const parsedAmount = ethers.parseUnits(inputAmount, 18);
        await token.approve(contract.target, parsedAmount);
        const tx = await contract.depositCollateral(inputCollateral, parsedAmount);
        await tx.wait();
        alert("Deposit successful!");
      }
      if (selectedAction === "withdraw") {
        const tx = await contract.withdrawCollateral(inputCollateral, ethers.parseUnits(inputAmount, 18));
        await tx.wait();
        alert("Withdraw successful!");
      }
      if (selectedAction === "borrow") {
        const tx = await contract.borrow(ethers.parseUnits(inputAmount, 18), inputCollateral);
        await tx.wait();
        alert("Borrow successful!");
      }
      if (selectedAction === "repay") {
        const stablecoinAddress = await contract.stablecoin();
        const stablecoin = new ethers.Contract(stablecoinAddress, ["function approve(address,uint256) public returns (bool)"], signer);
        const parsedAmount = ethers.parseUnits(inputAmount, 18);
        await stablecoin.approve(contract.target, parsedAmount);
        const tx = await contract.repay(inputBorrowId, parsedAmount);
        await tx.wait();
        alert("Repay successful!");
      }
      if (selectedAction === "supply") {
        const stablecoinAddress = await contract.stablecoin();
        const stablecoin = new ethers.Contract(stablecoinAddress, ["function approve(address,uint256) public returns (bool)"], signer);
        const parsedAmount = ethers.parseUnits(inputAmount, 18);
        await stablecoin.approve(contract.target, parsedAmount);
        const tx = await contract.supply(parsedAmount);
        await tx.wait();
        alert("Supply successful!");
      }
      if (selectedAction === "withdrawSupply") {
        const tx = await contract.withdrawSupply(ethers.parseUnits(inputAmount, 18));
        await tx.wait();
        alert("Withdraw supply successful!");
      }
    } catch (error) {
      console.error(error);
      alert("Transaction failed");
    } finally {
      setLoading(false);
      setSelectedAction(null);
      setInputAmount("");
      setInputCollateral("");
      setInputBorrowId("");
    }
  };

  const ActionModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg max-w-md w-full text-center">
        <h3 className="text-xl font-bold mb-4 capitalize">{selectedAction} Interface</h3>
        {selectedAction !== "withdrawSupply" && (
          <input
            type="text"
            placeholder="Collateral Token Address"
            value={inputCollateral}
            onChange={(e) => setInputCollateral(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 mb-4"
          />
        )}
        {selectedAction === "repay" && (
          <input
            type="text"
            placeholder="Borrow ID"
            value={inputBorrowId}
            onChange={(e) => setInputBorrowId(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 mb-4"
          />
        )}
        <input
          type="number"
          placeholder="Amount"
          value={inputAmount}
          onChange={(e) => setInputAmount(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-4"
        />
        <button
          onClick={handleAction}
          disabled={loading}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 w-full"
        >
          {loading ? "Processing..." : `Confirm ${selectedAction}`}
        </button>
        <button
          onClick={() => setSelectedAction(null)}
          className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 w-full"
        >
          Cancel
        </button>
      </div>
    </div>
  );

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
