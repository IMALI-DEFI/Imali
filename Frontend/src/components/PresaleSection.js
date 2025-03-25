import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";
import FlowerAnimation from "../assets/animations/flower-opening.svg";

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
  const [userStats, setUserStats] = useState(null);
  const [showTokenomics, setShowTokenomics] = useState(false);

  // Tokenomics data for SVG chart
  const tokenomicsData = [
    { label: 'Presale', value: 50, color: '#4BC0C0', description: '6-month linear vesting period' },
    { label: 'Liquidity', value: 20, color: '#36A2EB', description: 'Locked in Uniswap for 1 year' },
    { label: 'Team', value: 15, color: '#FFCE56', description: '12-month cliff, then quarterly vesting' },
    { label: 'Marketing', value: 10, color: '#FF6384', description: 'Community growth and partnerships' },
    { label: 'Advisors', value: 5, color: '#9966FF', description: '6-month linear vesting' }
  ];

  // Calculate SVG pie chart segments
  const calculateSvgPath = (index, radius) => {
    const total = tokenomicsData.reduce((sum, item) => sum + item.value, 0);
    const degrees = tokenomicsData.reduce((sum, item, i) => {
      if (i < index) return sum + (item.value / total) * 360;
      return sum;
    }, 0);
    
    const x1 = radius + radius * Math.cos(degrees * Math.PI / 180);
    const y1 = radius + radius * Math.sin(degrees * Math.PI / 180);
    
    const arcDegrees = (tokenomicsData[index].value / total) * 360;
    const x2 = radius + radius * Math.cos((degrees + arcDegrees) * Math.PI / 180);
    const y2 = radius + radius * Math.sin((degrees + arcDegrees) * Math.PI / 180);
    
    const largeArcFlag = arcDegrees > 180 ? 1 : 0;
    
    return `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

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

        if (walletAddress) {
          const userContribution = await contract.userContributions(walletAddress);
          const tokensAllocated = await contract.calculateTokens(ethers.parseEther(userContribution.toString()));
          
          setUserStats({
            contribution: Number(ethers.formatEther(userContribution)),
            tokens: Number(ethers.formatEther(tokensAllocated))
          });
        }
      } catch (error) {
        console.error("Error fetching presale data:", error);
      }
    };

    fetchData();
  }, [walletAddress]);

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
      window.location.reload();
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
      
      {/* Tokenomics Toggle */}
      <div className="flex justify-center mb-8">
        <button
          onClick={() => setShowTokenomics(!showTokenomics)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {showTokenomics ? "Hide Tokenomics" : "Show Tokenomics"}
        </button>
      </div>

      {showTokenomics && (
        <div className="tokenomics-section mb-8 p-6 bg-gray-50 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6 text-center">Token Distribution</h2>
          
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 h-80 flex items-center justify-center">
              <svg width="300" height="300" viewBox="0 0 300 300">
                {tokenomicsData.map((item, index) => (
                  <path
                    key={item.label}
                    d={calculateSvgPath(index, 150)}
                    fill={item.color}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                ))}
              </svg>
            </div>
            
            <div className="md:w-1/2 mt-4 md:mt-0 md:pl-8">
              <h3 className="text-lg font-semibold mb-4">Allocation Details</h3>
              <ul className="space-y-3">
                {tokenomicsData.map(item => (
                  <li key={item.label} className="flex items-start">
                    <span 
                      className="inline-block w-3 h-3 rounded-full mt-1 mr-2"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    <div>
                      <strong>{item.label} ({item.value}%)</strong>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center">
        <div className="md:w-1/2">
          <img
            src={FlowerAnimation}
            alt="Presale Animation"
            className="w-full h-auto"
          />
        </div>
        
        <div className="md:w-1/2">
          <h2 className="text-2xl font-bold mb-4">Participate in Presale</h2>
          
          <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
            <h3 className="text-xl font-semibold mb-3">Why Participate?</h3>
            <ul className="space-y-2 mb-4">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Early access to IMALI tokens at discounted rates</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Higher staking rewards for presale participants</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Exclusive access to future platform features</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Priority voting rights in governance decisions</span>
              </li>
            </ul>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <h4 className="font-bold text-yellow-800">How to Participate:</h4>
              <ol className="list-decimal pl-5 space-y-1 text-sm">
                <li>Connect your wallet</li>
                <li>Enter the ETH amount you want to contribute</li>
                <li>Review your token allocation</li>
                <li>Confirm the transaction in your wallet</li>
                <li>Tokens will be distributed after presale ends</li>
              </ol>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow mb-4">
            <h3 className="font-bold mb-2">💰 ROI Calculator</h3>
            <input
              type="number"
              value={contribution}
              onChange={(e) => setContribution(e.target.value)}
              placeholder="ETH amount"
              className="w-full p-2 border rounded mb-2"
            />
            {contribution && (
              <div className="bg-gray-100 p-3 rounded">
                <p className="font-semibold">
                  {calculateTokens().toLocaleString()} IMALI
                </p>
                <p className="text-sm">
                  Potential value: {(calculateTokens() * 0.0003).toFixed(4)} ETH (3x ROI estimate)
                </p>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Enter ETH Contribution:
            </label>
            <input
              type="number"
              value={contribution}
              onChange={(e) => setContribution(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Token Price</p>
              <p className="font-medium">{tokenPrice} ETH</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Presale Ends</p>
              <p className="font-medium">{formatTimestamp(presaleEndTime)}</p>
            </div>
          </div>
          
          <button
            onClick={handleParticipate}
            disabled={transactionLoading}
            className={`w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded ${
              transactionLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {transactionLoading ? "Processing..." : "Participate Now"}
          </button>
          
          {transactionSuccess && (
            <p className="text-green-500 mt-2 text-center">Transaction successful!</p>
          )}
          {transactionError && (
            <p className="text-red-500 mt-2 text-center">{transactionError}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Presale;
