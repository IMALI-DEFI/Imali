// 📦 src/components/Lending.js (Fully Repaired and Optimized)
import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { getContractInstance } from "../getContractInstance";
import lendingGuideImage from "../assets/images/lending-guide-visual.png";
import { FaEthereum, FaBitcoin, FaDollarSign } from "react-icons/fa";

const tokenAddresses = {
  ETH: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419",
  USDC: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
  DAI: "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9",
  WBTC: "0xdeb288F737066589598e9214E782fa5A8eD689e8",
  LINK: "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c",
  AAVE: "0x547a514d5e3769680Ce22B2361c10Ea13619e8a9",
  UNI: "0x553303d460EE0afB37EdFf9bE42922D8FF63220e",
};

const assets = [
  { name: "ETH", symbol: "ETH", icon: <FaEthereum size={24} /> },
  { name: "IMALI", symbol: "IMALI", icon: <FaEthereum size={24} /> },
  { name: "MATIC", symbol: "MATIC", icon: <FaEthereum size={24} /> },
  { name: "USDC", symbol: "USDC", icon: <FaDollarSign size={24} /> },
  { name: "DAI", symbol: "DAI", icon: <FaDollarSign size={24} /> },
  { name: "WBTC", symbol: "WBTC", icon: <FaBitcoin size={24} /> },
  { name: "LINK", symbol: "LINK", icon: <FaEthereum size={24} /> },
  { name: "AAVE", symbol: "AAVE", icon: <FaEthereum size={24} /> },
  { name: "UNI", symbol: "UNI", icon: <FaEthereum size={24} /> },
];

const Lending = () => {
  const { account, provider, chainId, connectWallet } = useWallet();
  const [assetPrices, setAssetPrices] = useState({});
  const [lendingData, setLendingData] = useState({
    liquidity: "-",
    supplyApy: "-",
    borrowApy: "-",
    depositFee: "-",
    borrowFee: "-",
  });
  const [selectedAsset, setSelectedAsset] = useState(null);

  const fetchAssetPrices = useCallback(async () => {
    try {
      const rpcUrl = process.env.REACT_APP_ALCHEMY_ETHERIUM;
      const ethProvider = new ethers.JsonRpcProvider(rpcUrl);
      const prices = {};

      for (const [symbol, address] of Object.entries(tokenAddresses)) {
        if (!address) continue;
        const priceFeed = new ethers.Contract(address, [
          "function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)",
        ], ethProvider);
        const roundData = await priceFeed.latestRoundData();
        if (roundData && roundData[1]) {
          prices[symbol] = Number(ethers.formatUnits(roundData[1], 8)).toFixed(2);
        }
      }
      setAssetPrices(prices);
    } catch (error) {
      console.error("Price fetch error:", error);
    }
  }, []);

  const fetchLendingDetails = useCallback(async () => {
    try {
      if (!provider) return;
      const contract = await getContractInstance("Lending");
      const liquidity = await contract.getLiquidity();
      const supplyRate = await contract.getSupplyRate();
      const borrowRate = await contract.getBorrowRate();
      const depositFee = await contract.depositFee();
      const borrowFee = await contract.borrowFee();

      setLendingData({
        liquidity: ethers.formatUnits(liquidity, 18),
        supplyApy: (Number(supplyRate) / 10000).toFixed(2) + "%",
        borrowApy: (Number(borrowRate) / 10000).toFixed(2) + "%",
        depositFee: ethers.formatUnits(depositFee, 18) + " ETH",
        borrowFee: ethers.formatUnits(borrowFee, 18) + " ETH",
      });
    } catch (error) {
      console.error("Error fetching lending details:", error);
    }
  }, [provider]);

  useEffect(() => {
    fetchAssetPrices();
    fetchLendingDetails();
    const interval = setInterval(() => {
      fetchAssetPrices();
      fetchLendingDetails();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAssetPrices, fetchLendingDetails]);

  return (
    <section className="dashboard text-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {!account ? (
          <div className="text-center">
            <button
              onClick={connectWallet}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg font-bold hover:bg-blue-700"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-10">
              <img src={lendingGuideImage} alt="Lending Guide" className="w-full max-w-md mb-6 rounded-xl" />

              <div className="bg-white p-6 rounded-lg shadow-md w-full">
                <h2 className="text-2xl font-bold mb-4">Lending Overview</h2>
                <p>Liquidity Available: <strong>{lendingData.liquidity}</strong> ETH</p>
                <p>Supply APY: <strong>{lendingData.supplyApy}</strong></p>
                <p>Borrow APY: <strong>{lendingData.borrowApy}</strong></p>
                <p>Deposit Fee: <strong>{lendingData.depositFee}</strong></p>
                <p>Borrow Fee: <strong>{lendingData.borrowFee}</strong></p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {assets.map((asset) => (
                <div
                  key={asset.symbol}
                  onClick={() => setSelectedAsset(asset)}
                  className="bg-gray-100 p-4 rounded-lg text-center hover:bg-gray-200 cursor-pointer"
                >
                  <div className="flex justify-center mb-2">{asset.icon}</div>
                  <div className="font-bold text-lg">{asset.name}</div>
                  <div className="text-sm text-gray-600">Price: ${assetPrices[asset.symbol] ?? "-"}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-md w-full text-center">
            <h3 className="text-xl font-bold mb-4">Deposit {selectedAsset.name}</h3>
            <p className="mb-6">Coming Soon: Detailed deposit and borrow functionality for {selectedAsset.symbol}!</p>
            <button
              onClick={() => setSelectedAsset(null)}
              className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default Lending;
