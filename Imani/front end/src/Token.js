import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";

const IMALIToken = () => {
  const { walletAddress, connectWallet, resetWallet, loading, setLoading } = useWallet();
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState("0");
  const [error, setError] = useState("");

  // Ensure the user is on Polygon Mainnet (Chain ID: 137)
  const checkNetwork = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      if (network.chainId !== 137) {
        setError("❌ Not on Polygon Network. Switching...");
        try {
          await provider.send("wallet_switchEthereumChain", [{ chainId: "0x89" }]); // Polygon Chain ID
          setError(""); // Clear error on success
          return true;
        } catch (err) {
          console.error("❌ Failed to switch network:", err);
          setError("❌ Please switch to Polygon in MetaMask.");
          return false;
        }
      }
      return true;
    } catch (err) {
      console.error("Error checking network:", err);
      setError("❌ Failed to check network.");
      return false;
    }
  };

  // Fetch IMALI token balance
  const fetchBalance = async () => {
    if (!walletAddress) {
      setError("❌ Wallet not connected.");
      return;
    }
    try {
      setError(""); // Clear previous errors
      const contract = await getContractInstance("Token");
      if (!contract) {
        throw new Error("Token contract not initialized.");
      }

      const tokenBalance = await contract.balanceOf(walletAddress);
      setBalance(ethers.formatEther(tokenBalance));

      console.log("✅ Token balance fetched successfully:", ethers.formatEther(tokenBalance));
    } catch (err) {
      console.error("❌ Error fetching token balance:", err);
      setError("❌ Failed to fetch token balance. Ensure you're on the right network.");
    }
  };

  // Handle token purchase
  const purchaseTokens = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("❌ Please enter a valid amount.");
      return;
    }

    const isOnPolygon = await checkNetwork();
    if (!isOnPolygon) return;

    try {
      setError("");
      setLoading(true);

      const contract = await getContractInstance("Token");
      if (!contract) {
        setError("❌ Could not get contract instance. Try reconnecting.");
        return;
      }

      const valueToSend = ethers.parseEther(amount);
      console.log("Sending MATIC value (wei):", valueToSend.toString());

      const tx = await contract.buyTokens({ value: valueToSend });
      console.log(`Transaction sent: ${tx.hash}`);

      const receipt = await tx.wait(1);
      console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

      alert("✅ Tokens purchased successfully!");
      fetchBalance();
      setAmount(""); // Reset input
    } catch (err) {
      console.error("❌ Failed to purchase tokens:", err);
      setError(`❌ Transaction failed: ${err.reason || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchBalance();
    }
  }, [walletAddress]);

  return (
    <section className="bg-gray-100 min-h-screen py-16 px-6">
      <div className="container mx-auto max-w-6xl bg-white shadow-lg p-12 rounded-lg">
        <h2 className="text-4xl font-bold text-center mb-8 text-[#036302]">
          💰 Purchase IMALI Tokens
        </h2>

        {/* Wallet Connection */}
        <div className="flex justify-center mb-6">
          {!walletAddress ? (
            <button
              className="px-4 py-2 bg-[#036302] text-white rounded hover:bg-[#FFFF00] transition"
              onClick={connectWallet}
            >
              Connect Wallet
            </button>
          ) : (
            <div className="flex flex-col items-center">
              <p className="text-[#036302]">
                Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
              <button
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                onClick={() => {
                  setError("");
                  resetWallet();
                }}
              >
                Reset Wallet
              </button>
            </div>
          )}
        </div>

        {/* Error Handling */}
        {error && (
          <div className="text-center text-red-600 mb-4">
            <p>{error}</p>
            <button
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={fetchBalance}
            >
              🔄 Retry Connection
            </button>
          </div>
        )}

        {loading && <p className="text-center mb-4">Processing purchase...</p>}

        {/* Token Balance */}
        <div className="space-y-6">
          <div className="p-4 border rounded">
            <h3 className="text-xl text-[#036302]">Your Token Balance</h3>
            <p>{balance} IMALI</p>
          </div>

          {/* Buy Tokens */}
          <div className="p-4 border rounded">
            <h3 className="text-xl text-purple-700">Buy Tokens</h3>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount in MATIC"
              className="w-full px-3 py-2 border rounded mt-2"
              step="0.01" // Improved input precision
              min="0"
            />
            <button
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              onClick={purchaseTokens}
              disabled={loading}
            >
              {loading ? "Processing..." : "Buy Tokens"}
            </button>
          </div>

          {/* Buying Instructions */}
          <div className="p-4 border rounded">
            <h3 className="text-xl text-yellow-700">How to Buy Tokens</h3>
            <ol className="list-decimal ml-6 mt-2 text-lg">
              <li>Install MetaMask from metamask.io.</li>
              <li>Switch to the Polygon network in MetaMask.</li>
              <li>Buy or transfer MATIC to your wallet.</li>
              <li>Connect your wallet using the button above.</li>
              <li>Enter the MATIC amount you want to spend.</li>
              <li>Click "Buy Tokens" and confirm the transaction in MetaMask.</li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IMALIToken;
