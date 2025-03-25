import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";
import { Pie } from "react-chartjs-2";
import { 
  Chart, 
  ArcElement, 
  Tooltip, 
  Legend, 
  Title,
  DoughnutController // Required for Pie charts in v4+
} from 'chart.js';

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
  const [showDashboard, setShowDashboard] = useState(false);

  // Tokenomics data
  const tokenomicsData = {
    labels: ['Presale', 'Liquidity', 'Team', 'Marketing', 'Advisors'],
    datasets: [{
      data: [50, 20, 15, 10, 5],
      backgroundColor: [
        '#FF6384',
        '#36A2EB',
        '#FFCE56',
        '#4BC0C0',
        '#9966FF'
      ]
    }]
  };

  // Fundraising progress data
  const progressData = {
    labels: ['Raised', 'Remaining'],
    datasets: [{
      data: [totalRaised, hardCap - totalRaised],
      backgroundColor: ['#4BC0C0', '#E7E7E7']
    }]
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

        // Fetch user stats if wallet is connected
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
      // Refresh data after successful transaction
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

  const toggleDashboard = () => {
    setShowDashboard(!showDashboard);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">IMALI Token Presale</h1>
      
      {/* Dashboard Toggle */}
      <div className="flex justify-end mb-4">
        <button
          onClick={toggleDashboard}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {showDashboard ? "Hide Dashboard" : "Show Dashboard"}
        </button>
      </div>

      {showDashboard && (
        <div className="dashboard mb-8 p-6 bg-gray-50 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6 text-center">IMALI Presale Dashboard</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Tokenomics Pie Chart */}
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-4">Token Distribution</h3>
              <div className="h-64">
                <Pie data={tokenomicsData} options={{ maintainAspectRatio: false }} />
              </div>
              <ul className="mt-4 text-sm">
                <li>• Presale: 50% (6-month linear vesting)</li>
                <li>• Liquidity: 20% (Uniswap LP locked for 1 year)</li>
                <li>• Team: 15% (12-month cliff, then quarterly release)</li>
                <li>• Marketing: 10% (Community incentives)</li>
                <li>• Advisors: 5% (6-month vesting)</li>
              </ul>
            </div>

            {/* Fundraising Progress */}
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-4">Fundraising Progress</h3>
              <div className="h-64">
                <Pie data={progressData} options={{ maintainAspectRatio: false }} />
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-green-500 h-4 rounded-full" 
                    style={{ width: `${(totalRaised / hardCap) * 100}%` }}
                  ></div>
                </div>
                <p className="text-center mt-2">
                  {totalRaised.toFixed(2)} ETH / {hardCap} ETH ({((totalRaised / hardCap) * 100).toFixed(2)}%)
                </p>
                <p className="text-sm text-center">
                  Soft Cap: {softCap} ETH | Hard Cap: {hardCap} ETH
                </p>
              </div>
            </div>
          </div>

          {/* User Stats Section */}
          {walletAddress && userStats && (
            <div className="mt-8 bg-white p-6 rounded shadow">
              <h3 className="text-xl font-semibold mb-4">Your Contribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Your Contribution</p>
                  <p className="text-xl font-bold">{userStats.contribution.toFixed(4)} ETH</p>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Tokens Allocated</p>
                  <p className="text-xl font-bold">{userStats.tokens.toFixed(2)} IMALI</p>
                </div>
                <div className="bg-purple-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Current Value</p>
                  <p className="text-xl font-bold">{(userStats.tokens * tokenPrice).toFixed(4)} ETH</p>
                </div>
              </div>
            </div>
          )}
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
          <h2 className="text-2xl font-bold mb-4">Participate in the IMALI Presale</h2>
          <p className="mb-4">
            Join the IMALI community and be an early adopter! By participating in the presale, you'll gain access to IMALI tokens at a discounted rate.
            These tokens will unlock exclusive benefits within our ecosystem, including enhanced yield farming rewards and staking bonuses.
          </p>
          
          {/* ROI Calculator */}
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
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <p className="mb-4">
            Token Price: {tokenPrice} ETH
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
