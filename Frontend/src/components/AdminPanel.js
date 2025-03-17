import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import getContractInstance from "../getContractInstance";
import { useWallet } from "../context/WalletContext";

const AdminPanel = () => {
  const { walletAddress } = useWallet();
  const [isOwner, setIsOwner] = useState(false);
  const [txStatus, setTxStatus] = useState("");

  // States for setting collateral parameters.
  const [token, setToken] = useState("");
  const [priceFeed, setPriceFeed] = useState("");
  const [collateralRatio, setCollateralRatio] = useState("");

  // States for updating platform parameters.
  const [parameter, setParameter] = useState("");
  const [newValue, setNewValue] = useState("");

  // Step 1: Check that the connected wallet is the contract owner.
  useEffect(() => {
    const checkOwner = async () => {
      if (!walletAddress) return;
      const contract = await getContractInstance("Lending");
      if (!contract) return;
      try {
        const ownerAddress = await contract.owner();
        // Compare the connected wallet address with the on-chain owner address.
        if (ownerAddress.toLowerCase() === walletAddress.toLowerCase()) {
          setIsOwner(true);
        } else {
          setIsOwner(false);
        }
      } catch (error) {
        console.error("Error checking owner:", error);
      }
    };
    checkOwner();
  }, [walletAddress]);

  // Step 2: Set collateral parameters.
  // This function calls the contract's setCollateralParameters function.
  // You must enter:
  //  - The collateral token's address (the actual ERC20 token)
  //  - The Chainlink price feed address for that token
  //  - The required collateral ratio (e.g., 130 for 130%)
  const handleSetCollateral = async () => {
    try {
      const contract = await getContractInstance("Lending");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tx = await contract
        .connect(signer)
        .setCollateralParameters(token, priceFeed, Number(collateralRatio));
      setTxStatus("Transaction sent, waiting...");
      await tx.wait();
      setTxStatus("Collateral parameters updated successfully!");
    } catch (error) {
      console.error(error);
      setTxStatus("Transaction failed!");
    }
  };

  // Step 3: Update a platform parameter.
  // Use the dropdown to select which parameter to update, and enter the new value.
  const handleUpdateParameter = async () => {
    try {
      const contract = await getContractInstance("Lending");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      let tx;
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
      setTxStatus("Transaction sent, waiting...");
      await tx.wait();
      setTxStatus(`${parameter} updated successfully!`);
    } catch (error) {
      console.error(error);
      setTxStatus("Transaction failed!");
    }
  };

  // Step 4: Pause or unpause the contract.
  // This function calls the contract's pause or unpause functions.
  const handlePause = async (shouldPause) => {
    try {
      const contract = await getContractInstance("Lending");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tx = shouldPause
        ? await contract.connect(signer).pause()
        : await contract.connect(signer).unpause();
      setTxStatus("Transaction sent, waiting...");
      await tx.wait();
      setTxStatus(shouldPause ? "Contract paused!" : "Contract unpaused!");
    } catch (error) {
      console.error(error);
      setTxStatus("Transaction failed!");
    }
  };

  // If wallet is not connected, prompt the user to connect.
  if (!walletAddress) {
    return (
      <section className="admin-panel p-6 bg-gray-100">
        <h1 className="text-3xl font-bold mb-4">Admin Panel</h1>
        <p>Please connect your wallet.</p>
      </section>
    );
  }

  // If the connected wallet is not the owner, show access denied.
  if (!isOwner) {
    return (
      <section className="admin-panel p-6 bg-gray-100">
        <h1 className="text-3xl font-bold mb-4">Admin Panel</h1>
        <p className="text-red-600">Access Denied: Your wallet is not the contract owner.</p>
      </section>
    );
  }

  // Step 5: Render the admin panel.
  // The panel includes:
  // - A section to set collateral parameters.
  // - A section to update platform parameters.
  // - Buttons to pause and unpause the contract.
  return (
    <section className="admin-panel p-6 bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Admin Panel</h1>
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
        <button onClick={handleSetCollateral} className="bg-blue-500 text-white p-2 rounded w-full">
          Set Collateral Parameters
        </button>
      </div>
      
      {/* Update Platform Parameter Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Update Platform Parameter</h2>
        <select onChange={(e) => setParameter(e.target.value)} className="border p-2 mr-2 mb-2 w-full">
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
        <button onClick={() => handleUpdateParameter(parameter)} className="bg-green-500 text-white p-2 rounded w-full">
          Update Parameter
        </button>
      </div>
      
      {/* Pause / Unpause Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Pause / Unpause Contract</h2>
        <button onClick={() => handlePause(true)} className="bg-red-500 text-white p-2 rounded w-full mb-2">
          Pause Contract
        </button>
        <button onClick={() => handlePause(false)} className="bg-green-500 text-white p-2 rounded w-full">
          Unpause Contract
        </button>
      </div>

      {txStatus && <p className="mt-4 font-bold">{txStatus}</p>}
    </section>
  );
};

export default AdminPanel;
