import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";
import { FaEthereum, FaBitcoin, FaDollarSign } from "react-icons/fa";

// Mapping of asset symbols to collateral token addresses (must match on‑chain registration)
const tokenAddresses = {
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

// Assets to display on the lending page
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

// Custom Toast component
const Toast = ({ message, onClose }) => (
  <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded shadow-lg z-50">
    <div className="flex items-center justify-between">
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 text-xl font-bold">&times;</button>
    </div>
  </div>
);

const Lending = () => {
  const { walletAddress, connectWallet, resetWallet, loading, setLoading } = useWallet();
  const [assetPrices, setAssetPrices] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);
  const [borrowId, setBorrowId] = useState("");
  const [amount, setAmount] = useState("");
  const [lendingData, setLendingData] = useState({
    collateral: "Loading...",
    liquidity: "Loading...",
    supplyApy: "Loading...",
    borrowApy: "Loading...",
    depositFee: "Loading...",
    borrowFee: "Loading...",
  });
  const [toastMessage, setToastMessage] = useState("");

  // Check that the user is on an allowed network (Ethereum or Polygon)
  const checkNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const supportedNetworks = { 1: "Ethereum", 137: "Polygon" };
      if (!supportedNetworks[network.chainId]) {
        if (!sessionStorage.getItem("networkWarning")) {
          setToastMessage("⚠️ Please switch to Ethereum or Polygon to use lending features.");
          sessionStorage.setItem("networkWarning", "true");
        }
      }
    } catch (error) {
      console.error("Network check failed:", error);
    }
  }, []);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Fetch asset prices from Chainlink price feeds.
  const fetchAssetPrices = async () => {
    try {
      const ethereumProvider = new ethers.JsonRpcProvider(process.env.REACT_APP_INFURA_ETHEREUM);
      const polygonProvider = new ethers.JsonRpcProvider(process.env.REACT_APP_INFURA_POLYGON);
      let prices = {};
      for (let symbol in tokenAddresses) {
        const provider = symbol === "MATIC" ? polygonProvider : ethereumProvider;
        const priceFeedABI = [
          "function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)",
        ];
        const priceFeed = new ethers.Contract(tokenAddresses[symbol], priceFeedABI, provider);
        try {
          const roundData = await priceFeed.latestRoundData();
          if (!roundData || roundData.length < 2) {
            console.error(`Invalid price data for ${symbol}`);
            continue;
          }
          const price = roundData[1];
          if (price && price.toString() !== "0") {
            prices[symbol] = ethers.formatUnits(price, 8);
          } else {
            console.warn(`Price for ${symbol} unavailable.`);
          }
        } catch (error) {
          console.warn(`Failed to fetch price for ${symbol}: ${error.message}`);
        }
      }
      setAssetPrices(prices);
    } catch (error) {
      console.error("Error fetching asset prices:", error);
    }
  };

  // Fetch lending details from the contract.
  const fetchLendingDetails = async () => {
    try {
      console.log("Fetching lending details...");
      const contract = await getContractInstance("Lending");
      if (!contract) {
        console.warn("Contract instance unavailable.");
        return;
      }
      console.log("Contract Loaded:", contract);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      console.log("Wallet Address:", addr);
      if (!addr) throw new Error("Wallet address missing!");

      const [
        liquidity,
        supplyApy,
        borrowApy,
        depositFee,
        borrowFee,
      ] = await Promise.all([
        contract.getLiquidity ? contract.getLiquidity() : "N/A",
        contract.getSupplyRate ? contract.getSupplyRate() : "N/A",
        contract.getBorrowRate ? contract.getBorrowRate() : "N/A",
        contract.depositFee ? contract.depositFee() : "N/A",
        contract.borrowFee ? contract.borrowFee() : "N/A",
      ]);

      setLendingData({
        collateral: "N/A", // You can add logic to compute user's total collateral.
        liquidity: liquidity.toString(),
        supplyApy: supplyApy.toString(),
        borrowApy: borrowApy.toString(),
        depositFee: depositFee.toString(),
        borrowFee: borrowFee.toString(),
      });
    } catch (error) {
      console.error("Error fetching lending details:", error.message);
    }
  };

  // Initialize data on component mount and refresh at intervals.
  useEffect(() => {
    const initialize = async () => {
      await checkNetwork();
      await fetchAssetPrices();
      await fetchLendingDetails();
    };
    initialize();
    const interval = setInterval(() => {
      fetchAssetPrices();
      fetchLendingDetails();
    }, 30000);
    return () => clearInterval(interval);
  }, [walletAddress, checkNetwork]);

  // Open the transaction modal.
  const openModal = (type, asset) => {
    setModalType(type);
    if (type === "supply" || type === "borrow" || type === "withdraw") {
      setSelectedToken(tokenAddresses[asset.symbol]);
    } else {
      setSelectedToken(null);
    }
    if (type === "repay") {
      setBorrowId("");
    }
    setModalOpen(true);
  };

  // Close the modal and clear inputs.
  const closeModal = () => {
    setModalType(null);
    setSelectedToken(null);
    setBorrowId("");
    setAmount("");
    setModalOpen(false);
  };

  // Execute the appropriate transaction based on the selected action.
  const executeTransaction = async () => {
    if (!walletAddress) {
      setToastMessage("Wallet not connected!");
      return;
    }
    try {
      const contract = await getContractInstance("Lending");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      let tx;
      if (modalType === "supply") {
        tx = await contract.connect(signer).depositCollateral(
          selectedToken,
          ethers.parseUnits(amount, 18)
        );
      } else if (modalType === "borrow") {
        tx = await contract.connect(signer).borrow(
          ethers.parseUnits(amount, 18),
          selectedToken
        );
      } else if (modalType === "repay") {
        tx = await contract.connect(signer).repay(
          borrowId,
          ethers.parseUnits(amount, 18)
        );
      } else if (modalType === "withdraw") {
        tx = await contract.connect(signer).withdrawCollateral(
          selectedToken,
          ethers.parseUnits(amount, 18)
        );
      }
      setLoading(true);
      await tx.wait();
      setLoading(false);
      setToastMessage("Transaction Successful!");
      closeModal();
      fetchAssetPrices();
      fetchLendingDetails();
    } catch (error) {
      console.error("Transaction failed:", error);
      setToastMessage("Transaction failed!");
    }
  };

  return (
    <section className="dashboard text-gray-900 py-12">
      {/* Render custom Toast if there's a message */}
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      )}

      {/* Wallet Connection */}
      <div className="container mx-auto text-center mb-8">
        {walletAddress ? (
          <div className="flex flex-col items-center">
            <p className="text-lg font-bold text-green-600">
              ✅ Connected: {walletAddress}
            </p>
            <button
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-gray-700"
              onClick={resetWallet}
            >
              🔄 Reset Wallet
            </button>
          </div>
        ) : (
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={connectWallet}
          >
            🔗 Connect Wallet
          </button>
        )}
      </div>

      {/* Lending Header */}
      <div className="container mx-auto text-center bg-white">
        <h1 className="text-4xl font-bold text-[#036302] mb-2">
          Lending and Borrowing
        </h1>
        <p className="text-lg text-black font-bold">
          Ensure your MetaMask wallet is connected to Ethereum.
          Real-Time APY & Fees are updated via Chainlink Oracles.
        </p>
      </div>

      {/* Display Lending Data */}
      <div className="container mx-auto text-center my-6 bg-white">
        <div className="bg-white shadow-md rounded-lg p-4 inline-block">
          <p className="text-lg font-semibold">📊 Lending Stats:</p>
          <p>💰 Collateral: {lendingData.collateral}</p>
          <p>💸 Liquidity: {lendingData.liquidity}</p>
          <p>📈 Supply APY: {lendingData.supplyApy}</p>
          <p>📉 Borrow APY: {lendingData.borrowApy}</p>
          <p>⚖️ Deposit Fee: {lendingData.depositFee}</p>
          <p>🏦 Borrow Fee: {lendingData.borrowFee}</p>
        </div>
      </div>

      {/* Asset Cards */}
      <div className="container mx-auto mt-6 px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 bg-white">
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
              <button
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md"
                onClick={() => openModal("supply", asset)}
              >
                Deposit Collateral
              </button>
              <button
                className="w-full px-4 py-2 mt-2 bg-red-500 text-white rounded-md"
                onClick={() => openModal("borrow", asset)}
              >
                Borrow Stablecoin
              </button>
              <button
                className="w-full px-4 py-2 mt-2 bg-green-500 text-white rounded-md"
                onClick={() => openModal("repay", asset)}
              >
                Repay Borrow
              </button>
              <button
                className="w-full px-4 py-2 mt-2 bg-yellow-500 text-white rounded-md"
                onClick={() => openModal("withdraw", asset)}
              >
                Withdraw Collateral
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Transaction Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-1/3">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {modalType === "supply"
                ? "Deposit Collateral"
                : modalType === "borrow"
                ? "Borrow Stablecoin"
                : modalType === "repay"
                ? "Repay Borrow"
                : "Withdraw Collateral"}
            </h3>
            {modalType === "repay" && (
              <input
                type="number"
                className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg"
                placeholder="Borrow ID"
                value={borrowId}
                onChange={(e) => setBorrowId(e.target.value)}
              />
            )}
            <input
              type="number"
              className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="flex justify-between">
              <button
                className="px-4 py-2 bg-white text-gray-700 rounded-md"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-md"
                onClick={executeTransaction}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="container mx-auto mt-12 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-green-600 mb-4 text-center">
          How to Use the Lending and Borrowing Platform
        </h2>
        <ol className="list-decimal list-inside text-gray-800 space-y-2">
          <li>
            <strong>Connect Your Wallet:</strong> Click the "Connect Wallet" button at the top if you haven't already.
          </li>
          <li>
            <strong>Network Check:</strong> Ensure your wallet is connected to Ethereum for Lending and Borrowing.
          </li>
          <li>
            <strong>View Lending Stats:</strong> Review the current liquidity, fees, and APY details displayed.
          </li>
          <li>
            <strong>Select an Asset:</strong> Each asset card shows the current price. Choose an asset based on the collateral you want to use.
          </li>
          <li>
            <strong>Deposit Collateral:</strong> Click "Deposit Collateral" on an asset card. Enter the amount in the modal and confirm the transaction.
          </li>
          <li>
            <strong>Borrow Stablecoin:</strong> Click "Borrow Stablecoin" on an asset card. Enter the desired amount and confirm.
          </li>
          <li>
            <strong>Repay Borrow:</strong> Click "Repay Borrow" on an asset card. Enter the Borrow ID and amount to repay, then confirm.
          </li>
          <li>
            <strong>Withdraw Collateral:</strong> Click "Withdraw Collateral" on an asset card. Enter the amount and confirm.
          </li>
        </ol>
        <p className="mt-4 text-center text-gray-600">
          Please note: All transactions require confirmation via MetaMask.
        </p>
      </div>
    </section>
  );
};

export default Lending;

