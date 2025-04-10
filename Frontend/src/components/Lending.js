import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { getContractInstance } from "../getContractInstance";

import { FaEthereum, FaBitcoin, FaDollarSign } from "react-icons/fa";

// Price feed addresses for Ethereum (Chainlink)
const tokenAddresses = {
  ETH: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419", // ETH/USD
  USDC: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6", // USDC/USD
  DAI: "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9", // DAI/USD
  WBTC: "0xdeb288F737066589598e9214E782fa5A8eD689e8", // WBTC/USD
  LINK: "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c", // LINK/USD
  AAVE: "0x547a514d5e3769680Ce22B2361c10Ea13619e8a9", // AAVE/USD
  UNI: "0x553303d460EE0afB37EdFf9bE42922D8FF63220e" // UNI/USD
};

const assets = [
  { name: "ETH", symbol: "ETH", icon: <FaEthereum size={24} />, address: tokenAddresses.ETH, type: "ETH" },
  { name: "IMALI", symbol: "IMALI", icon: <FaEthereum size={24} />, type: "IMALI" },
  { name: "MATIC", symbol: "MATIC", icon: <FaEthereum size={24} />, type: "MATIC" },
  { name: "USDC", symbol: "USDC", icon: <FaDollarSign size={24} />, address: tokenAddresses.USDC, type: "USDC" },
  { name: "DAI", symbol: "DAI", icon: <FaDollarSign size={24} />, address: tokenAddresses.DAI, type: "DAI" },
  { name: "WBTC", symbol: "WBTC", icon: <FaBitcoin size={24} />, address: tokenAddresses.WBTC, type: "WBTC" },
  { name: "LINK", symbol: "LINK", icon: <FaEthereum size={24} />, address: tokenAddresses.LINK, type: "LINK" },
  { name: "AAVE", symbol: "AAVE", icon: <FaEthereum size={24} />, address: tokenAddresses.AAVE, type: "AAVE" },
  { name: "UNI", symbol: "UNI", icon: <FaEthereum size={24} />, address: tokenAddresses.UNI, type: "UNI" }
];

const Lending = () => {
  const { account, chainId, connectWallet, disconnectWallet, provider } = useWallet();
  const [assetPrices, setAssetPrices] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);
  const [borrowId, setBorrowId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [transactionError, setTransactionError] = useState(null);
  const [lendingData, setLendingData] = useState({
    collateral: { eth: "Loading...", imali: "Loading...", matic: "Loading...", total: "Loading..." },
    liquidity: "Loading...", supplyApy: "Loading...", borrowApy: "Loading...", depositFee: "Loading...", borrowFee: "Loading..."
  });

  const fetchUserCollateral = async (contract, userAddress) => {
    try {
      const [ethCollateralRaw, imaliCollateralRaw, maticCollateralRaw] = await Promise.all([
        contract.ethCollateral(userAddress).catch(() => 0n),
        contract.imaliCollateral(userAddress).catch(() => 0n),
        contract.maticCollateral(userAddress).catch(() => 0n)
      ]);

      const ethCollateral = ethCollateralRaw || 0n;
      const imaliCollateral = imaliCollateralRaw || 0n;
      const maticCollateral = maticCollateralRaw || 0n;
      const total = ethCollateral + imaliCollateral + maticCollateral;

      return {
        eth: ethers.formatUnits(ethCollateral, 18),
        imali: ethers.formatUnits(imaliCollateral, 18),
        matic: ethers.formatUnits(maticCollateral, 18),
        total: ethers.formatUnits(total, 18)
      };
    } catch (error) {
      console.error("Error fetching collateral:", error);
      return { eth: "0", imali: "0", matic: "0", total: "0" };
    }
  };

  const fetchAssetPrices = useCallback(async () => {
    const prices = {};
    try {
      const rpcUrl = process.env.REACT_APP_ALCHEMY_ETHERIUM;
      if (!rpcUrl) {
        console.error("Missing Alchemy Ethereum RPC URL in .env");
        return;
      }
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      await provider.getNetwork();
      for (let symbol in tokenAddresses) {
        const priceFeedAddress = tokenAddresses[symbol];
        const priceFeedABI = ["function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"];
        const priceFeed = new ethers.Contract(priceFeedAddress, priceFeedABI, provider);
        const roundData = await priceFeed.latestRoundData();
        if (roundData && roundData.answer) {
          const price = ethers.formatUnits(roundData.answer, 8);
          prices[symbol] = price;
        }
      }
      setAssetPrices(prices);
    } catch (error) {
      console.error("Error fetching asset prices:", error);
      setAssetPrices({});
    }
  }, []);

  const fetchLendingDetails = useCallback(async () => {
    try {
      if (chainId !== 1) {
        setTransactionError("Please switch to Ethereum Mainnet.");
        return;
      }
      const contract = await getContractInstance("Lending");
      if (!contract) {
        console.error("Contract instance not found.");
        return;
      }
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      const [liquidity, supplyApy, borrowApy, depositFee, borrowFee, collateralData] = await Promise.all([
        contract.getLiquidity().catch(() => "Error"),
        contract.getSupplyRate().catch(() => "Error"),
        contract.getBorrowRate().catch(() => "Error"),
        contract.depositFee().catch(() => "Error"),
        contract.borrowFee().catch(() => "Error"),
        fetchUserCollateral(contract, addr)
      ]);
      const formatFee = (fee) => (fee === "Error" ? "Could not retrieve fee." : Number(ethers.formatUnits(fee, 18)).toFixed(2) + " ETH");
      const formatApy = (apy) => (apy === "Error" ? "Could not retrieve APY." : (Number(apy) / 10000).toFixed(2) + "%");
      const formatLiquidity = (liquidity) => (liquidity === "Error" ? "Could not retrieve liquidity." : Number(ethers.formatUnits(liquidity, 18)).toFixed(2) + " ETH");
      setLendingData({
        collateral: { eth: collateralData.eth + " ETH", imali: collateralData.imali + " IMALI", matic: collateralData.matic + " MATIC", total: collateralData.total + " TOTAL" },
        liquidity: formatLiquidity(liquidity), supplyApy: formatApy(supplyApy), borrowApy: formatApy(borrowApy), depositFee: formatFee(depositFee), borrowFee: formatFee(borrowFee)
      });
    } catch (error) {
      console.error("Error fetching lending details:", error);
      setLendingData({ collateral: { eth: "Error", imali: "Error", matic: "Error", total: "Error" }, liquidity: "Error", supplyApy: "Error", borrowApy: "Error", depositFee: "Error", borrowFee: "Error" });
    }
  }, [chainId, provider]);

    useEffect(() => {
        const initialize = async () => {
          await fetchAssetPrices();
          if (provider) { // Check if provider is available
            await fetchLendingDetails();
          }
        };
        initialize();
            const interval = setInterval(() => {
              fetchAssetPrices();
              if (provider) { // Check if provider is available
                fetchLendingDetails();
              }
            }, 30000);
            return () => clearInterval(interval);
          }, [fetchAssetPrices, fetchLendingDetails, provider]);

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

  const closeModal = () => {
    setModalType(null);
    setSelectedToken(null);
    setBorrowId("");
    setAmount("");
    setModalOpen(false);
  };

  const executeTransaction = async () => {
    if (!account) {
      alert("Wallet not connected!");
      return;
    }
      if (!provider || typeof provider.getSigner !== 'function') {
        setTransactionError("Wallet provider not properly initialized");
        return;
      }
    setLoading(true);
    setTransactionError(null);
    try {
      if (chainId !== 1) {
        setTransactionError("Please switch to Ethereum Mainnet.");
        return;
      }
      const contract = await getContractInstance("Lending");
      let tx;
      if (modalType === "supply") {
        if (selectedToken === tokenAddresses.ETH) {
          tx = await contract.connect(provider.getSigner()).depositEthCollateral({ value: ethers.parseUnits(amount, 18) });
        } else if (selectedToken === tokenAddresses.IMALI) {
          tx = await contract.connect(provider.getSigner()).depositImaliCollateral(ethers.parseUnits(amount, 18));
        } else if (selectedToken === tokenAddresses.MATIC) {
          tx = await contract.connect(provider.getSigner()).depositMaticCollateral(ethers.parseUnits(amount, 18));
        }
      } else if (modalType === "borrow") {
        tx = await contract.connect(provider.getSigner()).borrow(ethers.parseUnits(amount, 18), selectedToken === tokenAddresses.ETH ? "ETH" : selectedToken === tokenAddresses.IMALI ? "IMALI" : "MATIC");
      } else if (modalType === "repay") {
        tx = await contract.connect(provider.getSigner()).repay(ethers.parseUnits(amount, 18));
      } else if (modalType === "withdraw") {
        tx = await contract.connect(provider.getSigner()).withdrawCollateral(ethers.parseUnits(amount, 18), selectedToken === tokenAddresses.ETH ? "ETH" : selectedToken === tokenAddresses.IMALI ? "IMALI" : "MATIC");
      }
      await tx.wait();
      setLoading(false);
      alert("Transaction Successful!");
      closeModal();
      fetchAssetPrices();
      fetchLendingDetails();
    } catch (error) {
      console.error("Transaction failed:", error);
      setTransactionError(`Transaction failed! ${error.message}`);
      setLoading(false);
    }
  };
  return (
    <section className="dashboard text-gray-900 py-12">
      {/* Wallet Connection */}
      <div className="container mx-auto text-center mb-8">
        {account ? (
          <>
            <div className="bg-gray-100 p-3 rounded-lg shadow-sm text-center">
              <p className="text-sm text-gray-700">Connected Wallet:</p>
              <p className="text-md font-mono text-[#036302] break-words">{account}</p>
            </div>
            <button
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-gray-700"
              onClick={disconnectWallet}
            >
              🔄 Disconnect Wallet
            </button>
          </>
        ) : (
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={connectWallet}
          >
            🔗 Connect Wallet
          </button>
        )}
      </div>

      {/* Instructions at the Top */}
      <div className="container mx-auto mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-green-600 mb-4">How to Use the Lending Platform</h2>
        <ol className="list-decimal list-inside text-gray-800 space-y-2">
          <li>Connect your wallet using the "Connect Wallet" button.</li>
          <li>Ensure your wallet is connected to Ethereum.</li>
          <li>Deposit collateral to start earning interest or borrow assets.</li>
          <li>Review transaction details before confirming.</li>
        </ol>
      </div>

      {/* Lending Stats */}
          {/* Lending Stats */}
          <div className="container mx-auto text-center my-6 bg-white">
            <div className="bg-white shadow-md rounded-lg p-4 inline-block">
              <p className="text-lg font-semibold">📊 Lending Stats:</p>
              <p>💰 ETH Collateral: {lendingData.collateral.eth}</p>
              <p>💰 IMALI Collateral: {lendingData.collateral.imali}</p>
              <p>💰 MATIC Collateral: {lendingData.collateral.matic}</p>
              <p>💎 Total Collateral: {lendingData.collateral.total}</p>
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
          <div className="bg-white p-6 rounded-lg shadow-lg w-1/3 relative">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {modalType === "supply"
                ? "Deposit Collateral"
                : modalType === "borrow"
                ? "Borrow Stablecoin"
                : modalType === "repay"
                ? "Repay Borrow"
                : "Withdraw Collateral"}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {modalType === "supply"
                ? "Deposit your asset as collateral to borrow stablecoins."
                : modalType === "borrow"
                ? "Borrow stablecoins using your deposited collateral."
                : modalType === "repay"
                ? "Repay your borrow to unlock your collateral."
                : "Withdraw your collateral after repaying your borrow."}
            </p>
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
                disabled={loading}
              >
                {loading ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Lending;
