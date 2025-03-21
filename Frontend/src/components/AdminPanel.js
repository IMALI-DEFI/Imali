import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import getContractInstance from "../getContractInstance";
import { useWallet } from "../context/WalletContext";

const AdminPanel = () => {
  const { walletAddress } = useWallet(); // Get the connected wallet address
  const [isOwner, setIsOwner] = useState(false); // Check if the wallet is the contract owner
  const [txStatus, setTxStatus] = useState(""); // Track transaction status

  // States for setting collateral parameters
  const [token, setToken] = useState(""); // Collateral token address
  const [priceFeed, setPriceFeed] = useState(""); // Chainlink price feed address
  const [collateralRatio, setCollateralRatio] = useState(""); // Collateral ratio (e.g., 130%)

  // States for updating platform parameters
  const [parameter, setParameter] = useState(""); // Parameter to update (e.g., supply rate)
  const [newValue, setNewValue] = useState(""); // New value for the parameter

  // Step 1: Check if the connected wallet is the contract owner
  useEffect(() => {
    const checkOwner = async () => {
      if (!walletAddress) return; // If wallet is not connected, exit
      const contract = await getContractInstance("Lending"); // Get the contract instance
      if (!contract) return; // If contract is not found, exit
      try {
        const ownerAddress = await contract.owner(); // Get the contract owner's address
        // Check if the connected wallet is the owner
        if (ownerAddress.toLowerCase() === walletAddress.toLowerCase()) {
          setIsOwner(true); // Set isOwner to true if the wallet is the owner
        } else {
          setIsOwner(false); // Set isOwner to false if the wallet is not the owner
        }
      } catch (error) {
        console.error("Error checking owner:", error); // Log any errors
      }
    };
    checkOwner(); // Call the function to check ownership
  }, [walletAddress]); // Run this effect whenever the wallet address changes

  // Step 2: Set collateral parameters
  const handleSetCollateral = async () => {
    try {
      const contract = await getContractInstance("Lending"); // Get the contract instance
      const provider = new ethers.BrowserProvider(window.ethereum); // Connect to the Ethereum provider
      const signer = await provider.getSigner(); // Get the signer (connected wallet)
      // Send a transaction to set collateral parameters
      const tx = await contract
        .connect(signer)
        .setCollateralParameters(token, priceFeed, Number(collateralRatio));
      setTxStatus("Transaction sent, waiting..."); // Update transaction status
      await tx.wait(); // Wait for the transaction to be confirmed
      setTxStatus("Collateral parameters updated successfully!"); // Update status on success
    } catch (error) {
      console.error(error); // Log any errors
      setTxStatus("Transaction failed!"); // Update status on failure
    }
  };

  // Step 3: Update a platform parameter
  const handleUpdateParameter = async () => {
    try {
      const contract = await getContractInstance("Lending"); // Get the contract instance
      const provider = new ethers.BrowserProvider(window.ethereum); // Connect to the Ethereum provider
      const signer = await provider.getSigner(); // Get the signer (connected wallet)
      let tx;
      // Determine which parameter to update and send the transaction
      if (parameter === "supplyRate") {
        tx = await contract.connect(signer).updateSupplyRate(Number(newValue));
      } else if (parameter === "borrowRate") {
        tx = await contract.connect(signer).updateBorrowRate(Number(newValue));
      } else if (parameter === "depositFee") {
        tx = await contract.connect(signer).updateDepositFee(Number(newValue));
      } else if (parameter === "borrowFee") {
        tx = await contract.connect(signer).updateBorrowFee(Number(newValue));
      } else if (parameter === "liquidationThreshold") {
        tx = await contract.connect(signer).updateLiquidationThreshold(Number(newValue));
      } else if (parameter === "annualInterestRate") {
        tx = await contract.connect(signer).updateAnnualInterestRate(Number(newValue));
      }
      setTxStatus("Transaction sent, waiting..."); // Update transaction status
      await tx.wait(); // Wait for the transaction to be confirmed
      setTxStatus(`${parameter} updated successfully!`); // Update status on success
    } catch (error) {
      console.error(error); // Log any errors
      setTxStatus("Transaction failed!"); // Update status on failure
    }
  };

  // Step 4: Pause or unpause the contract
  const handlePause = async (shouldPause) => {
    try {
      const contract = await getContractInstance("Lending"); // Get the contract instance
      const provider = new ethers.BrowserProvider(window.ethereum); // Connect to the Ethereum provider
      const signer = await provider.getSigner(); // Get the signer (connected wallet)
      // Send a transaction to pause or unpause the contract
      const tx = shouldPause
        ? await contract.connect(signer).pause()
        : await contract.connect(signer).unpause();
      setTxStatus("Transaction sent, waiting..."); // Update transaction status
      await tx.wait(); // Wait for the transaction to be confirmed
      setTxStatus(shouldPause ? "Contract paused!" : "Contract unpaused!"); // Update status on success
    } catch (error) {
      console.error(error); // Log any errors
      setTxStatus("Transaction failed!"); // Update status on failure
    }
  };

  // Step 5: Render the admin panel
  return (
    <section className="admin-panel p-6 bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Admin Panel</h1>

      {/* If wallet is not connected, prompt the user to connect */}
      {!walletAddress && <p>Please connect your wallet.</p>}

      {/* If the connected wallet is not the owner, show access denied */}
      {walletAddress && !isOwner && (
        <p className="text-red-600">Access Denied: Your wallet is not the contract owner.</p>
      )}

      {/* If the connected wallet is the owner, show the admin panel */}
      {walletAddress && isOwner && (
        <>
          <p className="mb-4 text-green-600">Welcome, contract owner!</p>

          {/* Set Collateral Parameters Section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Set Collateral Parameters</h2>
            <input
              type="text"
              placeholder="Collateral Token Address"
              className="border p-2 mr-2 mb-2 w-full"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <input
              type="text"
              placeholder="Price Feed Address"
              className="border p-2 mr-2 mb-2 w-full"
              value={priceFeed}
              onChange={(e) => setPriceFeed(e.target.value)}
            />
            <input
              type="number"
              placeholder="Collateral Ratio (e.g., 130)"
              className="border p-2 mr-2 mb-2 w-full"
              value={collateralRatio}
              onChange={(e) => setCollateralRatio(e.target.value)}
            />
            <button
              onClick={handleSetCollateral}
              className="bg-blue-500 text-white p-2 rounded w-full"
            >
              Set Collateral Parameters
            </button>
          </div>

          {/* Update Platform Parameter Section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Update Platform Parameter</h2>
            <select
              onChange={(e) => setParameter(e.target.value)}
              className="border p-2 mr-2 mb-2 w-full"
            >
              <option value="">Select Parameter</option>
              <option value="supplyRate">Supply Rate</option>
              <option value="borrowRate">Borrow Rate</option>
              <option value="depositFee">Deposit Fee</option>
              <option value="borrowFee">Borrow Fee</option>
              <option value="liquidationThreshold">Liquidation Threshold</option>
              <option value="annualInterestRate">Annual Interest Rate</option>
            </select>
            <input
              type="number"
              placeholder="New Value"
              className="border p-2 mr-2 mb-2 w-full"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
            <button
              onClick={handleUpdateParameter}
              className="bg-green-500 text-white p-2 rounded w-full"
            >
              Update Parameter
            </button>
          </div>

          {/* Pause / Unpause Section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Pause / Unpause Contract</h2>
            <button
              onClick={() => handlePause(true)}
              className="bg-red-500 text-white p-2 rounded w-full mb-2"
            >
              Pause Contract
            </button>
            <button
              onClick={() => handlePause(false)}
              className="bg-green-500 text-white p-2 rounded w-full"
            >
              Unpause Contract
            </button>
          </div>

          {/* Transaction Status */}
          {txStatus && <p className="mt-4 font-bold">{txStatus}</p>}
        </>
      )}
    </section>
  );
};

export default AdminPanel;