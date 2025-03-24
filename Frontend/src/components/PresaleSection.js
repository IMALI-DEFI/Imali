import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";
import FlowerAnimation from "../assets/animations/flower-opening.svg"; // Replace with your flower opening SVG

const Presale = () => {
  const { walletAddress, connectWallet } = useWallet();
  const [contribution, setContribution] = useState("");
  const [presaleEndTime, setPresaleEndTime] = useState(0);
  const [totalRaised, setTotalRaised] = useState(0);
  const [tokenPrice, setTokenPrice] = useState(0);
  const [softCap, setSoftCap] = useState(0);
  const [hardCap, setHardCap] = useState(0);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  const [transactionError, setTransactionError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const contract = await getContractInstance("Presale");
        if (!contract) return;

        const endTime = await contract.presaleEndTime();
        const raised = await contract.totalRaised();
        const price = await contract.TOKEN_PRICE();
        const softCapValue = await contract.SOFT_CAP();
        const hardCapValue = await contract.HARD_CAP();

        setPresaleEndTime(Number(endTime));
        setTotalRaised(Number(ethers.formatEther(raised)));
        setTokenPrice(Number(ethers.formatEther(price)));
        setSoftCap(Number(ethers.formatEther(softCapValue)));
        setHardCap(Number(ethers.formatEther(hardCapValue)));

      } catch (error) {
        console.error("Error fetching presale data:", error);
      }
    };

    fetchData();
  }, []);

  const handleParticipate = async () => {
    if (!walletAddress) {
      alert("Please connect your wallet.");
      return;
    }

    setTransactionLoading(true);
    setTransactionError(null);

    try {
      const contract = await getContractInstance("Presale");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const tx = await contract.connect(signer).participate({
        value: ethers.parseEther(contribution),
      });

      await tx.wait();
      setTransactionSuccess(true);
      setTransactionLoading(false);
    } catch (error) {
      console.error("Presale participation failed:", error);
      setTransactionError(error.message || "Transaction failed.");
      setTransactionLoading(false);
    }
  };

  const calculateTokens = () => {
    return contribution ? (contribution / tokenPrice).toFixed(2) : 0;
  };

  const formatTimestamp = (timestamp) => {
    if (timestamp === 0) return "Loading...";
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">IMALI Token Presale</h1>
      <div className="flex flex-col md:flex-row items-center">
        <div className="md:w-1/2">
          <img
            src={FlowerAnimation}
            alt="Presale Animation"
            className="w-full h-auto"
          />
        </div>
        <div className="md:w-1/2">
          <h2 className="text-2xl font-bold mb-4">Participate in the IMALI Presale</h2>
          <p className="mb-4">
            Join the IMALI community and be an early adopter! By participating in the presale, you'll gain access to IMALI tokens at a discounted rate.
            These tokens will unlock exclusive benefits within our ecosystem, including enhanced yield farming rewards and staking bonuses.
          </p>
          <p className="mb-4">
            <strong>Why Participate?</strong>
            <ul>
              <li>Early Access: Get IMALI tokens before they are publicly available.</li>
              <li>Discounted Rate: Acquire tokens at a favorable price.</li>
              <li>Enhanced Rewards: Unlock higher staking and yield farming rewards.</li>
              <li>Community Growth: Be a part of the IMALI DeFi revolution.</li>
            </ul>
          </p>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Enter ETH Contribution:
            </label>
            <input
              type="number"
              value={contribution}
              onChange={(e) => setContribution(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <p className="mb-4">
            Estimated IMALI Tokens: {calculateTokens()}
          </p>
          <p className="mb-4">
            Token Price: {tokenPrice} ETH
          </p>
          <p className="mb-4">
            Total Raised: {totalRaised} / {hardCap} ETH (Soft Cap: {softCap} ETH)
          </p>
          <p className="mb-4">
            Presale Ends: {formatTimestamp(presaleEndTime)}
          </p>
          <button
            onClick={handleParticipate}
            className={`bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${transactionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={transactionLoading}
          >
            {transactionLoading ? "Processing..." : "Participate"}
          </button>
          {transactionSuccess && (
            <p className="text-green-500 mt-2">Transaction successful!</p>
          )}
          {transactionError && (
            <p className="text-red-500 mt-2">{transactionError}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Presale;