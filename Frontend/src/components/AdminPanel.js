import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import getContractInstance from "../getContractInstance";
import { useWallet } from "../context/WalletContext";

const AdminPanel = () => {
  const { account } = useWallet();
  const [isOwner, setIsOwner] = useState(false);
  const [status, setStatus] = useState("");
  const [token, setToken] = useState("");
  const [priceFeed, setPriceFeed] = useState("");
  const [ratio, setRatio] = useState("");
  const [parameter, setParameter] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState(null);

  // Initialize contract and check ownership
  useEffect(() => {
    const initAdminPanel = async () => {
      if (!account) {
        console.log("Wallet not connected. Admin check skipped.");
        return;
      }

      setLoading(true);
      try {
        const lendingContract = await getContractInstance("Lending");
        if (!lendingContract) {
          throw new Error("Failed to get contract instance.");
        }
        setContract(lendingContract);
        const owner = await lendingContract.owner();
        const isOwnerCheck = owner.toLowerCase() === account.toLowerCase();
        setIsOwner(isOwnerCheck);
        console.log(`Owner address from contract: ${owner}`);
        console.log(`Connected account: ${account}`);
        console.log(`Is Owner: ${isOwnerCheck}`);
      } catch (error) {
        console.error("Failed to initialize Admin Panel:", error);
        setStatus("Failed to initialize Admin Panel.");
        setIsOwner(false);
      } finally {
        setLoading(false);
      }
    };

    // Check for account first.  Crucially, this is done *inside* the useEffect.
    if (account) {
      initAdminPanel();
    }
  }, [account]);

  // Set collateral parameters
  const handleSetCollateral = async () => {
    if (!token || !priceFeed || !ratio || !contract) { //check for contract
      setStatus("Please fill all fields and ensure contract is initialized.");
      return;
    }
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tx = await contract
        .connect(signer)
        .setCollateralParameters(token, priceFeed, Number(ratio));
      setStatus("Setting collateral...");
      await tx.wait();
      setStatus("Collateral parameters set!");
      setToken("");
      setPriceFeed("");
      setRatio("");
    } catch (error) {
      console.error("Failed to set collateral:", error);
      setStatus(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Update a platform parameter
  const handleUpdateParameter = async () => {
    if (!parameter || !value || !contract) {  //check for contract
      setStatus("Select parameter and enter value and ensure contract is initialized.");
      return;
    }
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      let tx;
      switch (parameter) {
        case "supplyRate":
          tx = await contract.connect(signer).updateSupplyRate(Number(value));
          break;
        case "borrowRate":
          tx = await contract.connect(signer).updateBorrowRate(Number(value));
          break;
        case "depositFee":
          tx = await contract.connect(signer).updateDepositFee(Number(value));
          break;
        case "borrowFee":
          tx = await contract.connect(signer).updateBorrowFee(Number(value));
          break;
        case "liquidationThreshold":
          tx = await contract.connect(signer).updateLiquidationThreshold(Number(value));
          break;
        case "annualInterestRate":
          tx = await contract.connect(signer).updateAnnualInterestRate(Number(value));
          break;
        default:
          setStatus("Invalid parameter.");
          return;
      }
      setStatus("Updating parameter...");
      await tx.wait();
      setStatus(`${parameter} updated!`);
      setParameter("");
      setValue("");
    } catch (error) {
      console.error("Failed to update parameter:", error);
      setStatus(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Pause or unpause the contract
  const handlePauseContract = async (pause) => {
    if (!contract) { //check for contract
      setStatus("Contract not initialized.");
      return;
    }
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tx = pause
        ? await contract.connect(signer).pause()
        : await contract.connect(signer).unpause();
      setStatus(pause ? "Pausing..." : "Unpausing...");
      await tx.wait();
      setStatus(pause ? "Contract paused." : "Contract unpaused.");
    } catch (error) {
      console.error("Failed to pause/unpause:", error);
      setStatus(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Render different content based on connection and ownership
  if (!account) {
    return (
      <div className="p-6 bg-gray-100 rounded-md shadow-md">
        <h1 className="text-3xl font-bold mb-4">Admin Panel</h1>
        <p>Connect wallet to access.</p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="p-6 bg-gray-100 rounded-md shadow-md">
        <h1 className="text-3xl font-bold mb-4">Admin Panel</h1>
        <p className="text-red-600">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 rounded-md shadow-md">
      <h1 className="text-3xl font-bold mb-4">Admin Panel</h1>
      <p className="mb-4 text-green-600">Welcome, Admin!</p>

      {/* Set Collateral Parameters Section */}
      <div className="mb-6 rounded-md bg-white p-4">
        <h2 className="text-xl font-semibold mb-2">Set Collateral</h2>
        <input
          placeholder="Token Address"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full p-2 border rounded-md mb-2"
        />
        <input
          placeholder="Price Feed Address"
          value={priceFeed}
          onChange={(e) => setPriceFeed(e.target.value)}
          className="w-full p-2 border rounded-md mb-2"
        />
        <input
          placeholder="Ratio (e.g., 130)"
          value={ratio}
          onChange={(e) => setRatio(e.target.value)}
          className="w-full p-2 border rounded-md mb-2"
        />
        <button
          onClick={handleSetCollateral}
          disabled={loading}
          className="w-full p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300"
        >
          {loading ? "Loading..." : "Set Collateral"}
        </button>
      </div>

      {/* Update Parameter Section */}
      <div className="mb-6 rounded-md bg-white p-4">
        <h2 className="text-xl font-semibold mb-2">Update Parameter</h2>
        <select
          value={parameter}
          onChange={(e) => setParameter(e.target.value)}
          className="w-full p-2 border rounded-md mb-2"
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
          placeholder="New Value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full p-2 border rounded-md mb-2"
        />
        <button
          onClick={handleUpdateParameter}
          disabled={loading}
          className="w-full p-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition duration-300"
        >
          {loading ? "Loading..." : "Update Parameter"}
        </button>
      </div>

      {/* Pause/Unpause Section */}
      <div className="mb-6 rounded-md bg-white p-4">
        <h2 className="text-xl font-semibold mb-2">Pause/Unpause Contract</h2>
        <button
          onClick={() => handlePauseContract(true)}
          disabled={loading}
          className="w-full p-2 bg-red-500 text-white rounded-md mb-2 hover:bg-red-600 transition duration-300"
        >
          {loading ? "Loading..." : "Pause Contract"}
        </button>
        <button
          onClick={() => handlePauseContract(false)}
          disabled={loading}
          className="w-full p-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition duration-300"
        >
          {loading ? "Loading..." : "Unpause Contract"}
        </button>
      </div>

      {status && <p className="mt-4 font-bold text-blue-600">{status}</p>}
    </div>
  );
};

export default AdminPanel;


