import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";
import { FaEthereum, FaBitcoin, FaDollarSign } from "react-icons/fa";

const priceFeeds = {
  ETH: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419",
  USDC: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
  DAI: "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9",
  WBTC: "0xdeb288F737066589598e9214E782fa5A8eD689e8",
  LUSD: "0x9dfc79Aaeb5bb0f96C6e9402671981CdFc424052",
  MATIC: "0x327e23A4855b6F663a28c5161541d69Af8973302",
  LINK: "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c",
  AAVE: "0x547a514d5e3769680Ce22B2361c10Ea13619e8a9",
  UNI: "0x553303d460EE0afB37EdFf9bE42922D8FF63220e",
};

const assets = [
  { name: "ETH", symbol: "ETH", icon: <FaEthereum size={24} /> },
  { name: "USDC", symbol: "USDC", icon: <FaDollarSign size={24} /> },
  { name: "DAI", symbol: "DAI", icon: <FaDollarSign size={24} /> },
  { name: "WBTC", symbol: "WBTC", icon: <FaBitcoin size={24} /> },
  { name: "LUSD", symbol: "LUSD", icon: <FaDollarSign size={24} /> },
  { name: "MATIC", symbol: "MATIC", icon: <FaEthereum size={24} /> },
  { name: "LINK", symbol: "LINK", icon: <FaEthereum size={24} /> },
  { name: "AAVE", symbol: "AAVE", icon: <FaEthereum size={24} /> },
  { name: "UNI", symbol: "UNI", icon: <FaEthereum size={24} /> },
];

const Lending = () => {
  const { walletAddress, connectWallet, resetWallet, loading, setLoading } = useWallet();
  const [assetPrices, setAssetPrices] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    fetchAssetPrices();
    const interval = setInterval(fetchAssetPrices, 30000); // Refresh prices every 30 seconds
    return () => clearInterval(interval);
  }, []);

    const fetchAssetPrices = async () => {
      try {
        const ethereumProvider = new ethers.JsonRpcProvider(process.env.REACT_APP_INFURA_ETHEREUM);
        const polygonProvider = new ethers.JsonRpcProvider(process.env.REACT_APP_INFURA_POLYGON);
        
        let prices = {};

        for (let asset of assets) {
          if (!priceFeeds[asset.symbol]) {
            console.warn(`⚠️ No price feed found for ${asset.symbol}`);
            continue;
          }

          // Use Polygon provider for MATIC, Ethereum provider for others
          const provider = asset.symbol === "MATIC" ? polygonProvider : ethereumProvider;
          const priceFeed = new ethers.Contract(
            priceFeeds[asset.symbol],
            ["function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)"],
            provider
          );

          try {
            const roundData = await priceFeed.latestRoundData();

            if (!roundData || roundData.length < 2) {
              console.error(`❌ Invalid price data for ${asset.symbol}`);
              continue;
            }

            let price = roundData[1]; // Extracting price (int256)

            // Ensure price is valid before storing
            if (price && price.toString() !== "0") {
              prices[asset.symbol] = ethers.formatUnits(price, 8);
            } else {
              console.error(`❌ Fetched price for ${asset.symbol} is invalid or zero.`);
            }
          } catch (error) {
            console.error(`❌ Failed to fetch price for ${asset.symbol}:`, error.message);
          }
        }

        setAssetPrices(prices);
      } catch (error) {
        console.error("❌ Error fetching asset prices:", error);
      }
    };




  const openModal = (type, asset) => {
    setModalType(type);
    setSelectedAsset(asset);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedAsset(null);
    setAmount("");
    setModalOpen(false);
  };

  return (
    <section className="dashboard text-gray-900 py-12" style={{ backgroundColor: "#FDFEFF" }}>
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl font-bold text-[#036302] mb-2">Lending and Borrowing</h1>
        <p className="text-lg text-black font-bold">
          Real-time APY updated via Chainlink Oracles.
        </p>
      </div>

      <div className="container mx-auto mt-6 px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {assets.map((asset, index) => (
          <div key={index} className="bg-white shadow-md rounded-lg p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                {asset.icon}
                <span>{asset.name}</span>
              </div>
              <div className="text-right">
                <p>Price: ${assetPrices[asset.symbol] || "Loading..."}</p>
              </div>
            </div>
            <div className="mt-4">
              <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-md" onClick={() => openModal("supply", asset.name)}>
                Lend
              </button>
              <button className="w-full px-4 py-2 mt-2 bg-red-500 text-white rounded-md" onClick={() => openModal("borrow", asset.name)}>
                Borrow
              </button>
              <button className="w-full px-4 py-2 mt-2 bg-green-500 text-white rounded-md" onClick={() => openModal("repay", asset.name)}>
                Repay
              </button>
              <button className="w-full px-4 py-2 mt-2 bg-yellow-500 text-white rounded-md" onClick={() => openModal("withdraw", asset.name)}>
                Withdraw
              </button>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-1/3">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {modalType === "supply" ? "Supply" : modalType === "borrow" ? "Borrow" : modalType === "repay" ? "Repay" : "Withdraw"} {selectedAsset}
            </h3>
            <input type="number" className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg"
              placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <div className="flex justify-between">
              <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md" onClick={closeModal}>Cancel</button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-md" onClick={() => console.log("Transaction Executed!")}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Lending;
