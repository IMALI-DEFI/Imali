// Lending.js (Final: APY, Fees, Token Prices, Beginner Layout)
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
  UNI: "0x553303d460EE0afB37EdFf9bE42922D8FF63220e"
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
  const { account, connectWallet, disconnectWallet, provider, chainId } = useWallet();
  const [collateral, setCollateral] = useState({ eth: "0", imali: "0", matic: "0", total: "0" });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);
  const [amount, setAmount] = useState("");
  const [borrowId, setBorrowId] = useState("");
  const [transactionError, setTransactionError] = useState(null);
  const [stats, setStats] = useState({ supplyApy: "Loading...", borrowApy: "Loading...", depositFee: "-", borrowFee: "-" });
  const [tokenPrices, setTokenPrices] = useState({});

  const fetchUserCollateral = useCallback(async () => {
    if (!provider || !account) return;
    setLoading(true);
    try {
      const contract = await getContractInstance("Lending");
      const [ethRaw, imaliRaw, maticRaw] = await Promise.all([
        contract.ethCollateral(account).catch(() => 0n),
        contract.imaliCollateral(account).catch(() => 0n),
        contract.maticCollateral(account).catch(() => 0n),
      ]);
      const eth = ethers.formatUnits(ethRaw || 0n, 18);
      const imali = ethers.formatUnits(imaliRaw || 0n, 18);
      const matic = ethers.formatUnits(maticRaw || 0n, 18);
      const total = (parseFloat(eth) + parseFloat(imali) + parseFloat(matic)).toFixed(4);
      setCollateral({ eth, imali, matic, total });
    } catch (err) {
      console.error("Failed to fetch collateral:", err);
    } finally {
      setLoading(false);
    }
  }, [account, provider]);

  const fetchLendingStats = useCallback(async () => {
    try {
      const contract = await getContractInstance("Lending");
      const [supplyRate, borrowRate, depositFee, borrowFee] = await Promise.all([
        contract.getSupplyRate(),
        contract.getBorrowRate(),
        contract.depositFee(),
        contract.borrowFee(),
      ]);
      setStats({
        supplyApy: (Number(supplyRate) / 10000).toFixed(2) + "%",
        borrowApy: (Number(borrowRate) / 10000).toFixed(2) + "%",
        depositFee: ethers.formatEther(depositFee) + " ETH",
        borrowFee: ethers.formatEther(borrowFee) + " ETH",
      });
    } catch (err) {
      console.error("Failed to fetch lending stats:", err);
    }
  }, []);

  const fetchAssetPrices = useCallback(async () => {
    const prices = {};
    try {
      const rpcUrl = process.env.REACT_APP_ALCHEMY_ETHERIUM;
      if (!rpcUrl) return;
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const abi = ["function latestRoundData() external view returns (uint80, int256 answer, uint256, uint256, uint80)"];
      for (let key in tokenAddresses) {
        const feed = new ethers.Contract(tokenAddresses[key], abi, provider);
        const data = await feed.latestRoundData();
        prices[key] = ethers.formatUnits(data.answer, 8);
      }
      setTokenPrices(prices);
    } catch (err) {
      console.error("Failed to fetch token prices:", err);
    }
  }, []);

  useEffect(() => {
    fetchUserCollateral();
    fetchLendingStats();
    fetchAssetPrices();
  }, [fetchUserCollateral, fetchLendingStats, fetchAssetPrices]);

  const openModal = (type, asset) => {
    setModalType(type);
    setSelectedToken(asset);
    setBorrowId("");
    setAmount("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedToken(null);
    setAmount("");
    setModalOpen(false);
  };

  const executeTransaction = async () => {
    if (!account || !provider || typeof provider.getSigner !== 'function') return;
    try {
      const contract = await getContractInstance("Lending");
      const signer = await provider.getSigner();
      let tx;
      if (modalType === "supply") {
        tx = await contract.connect(signer).depositEthCollateral({ value: ethers.parseUnits(amount, 18) });
      } else if (modalType === "borrow") {
        tx = await contract.connect(signer).borrow(ethers.parseUnits(amount, 18), selectedToken.symbol);
      } else if (modalType === "repay") {
        tx = await contract.connect(signer).repay(ethers.parseUnits(amount, 18));
      } else if (modalType === "withdraw") {
        tx = await contract.connect(signer).withdrawCollateral(ethers.parseUnits(amount, 18), selectedToken.symbol);
      }
      await tx.wait();
      fetchUserCollateral();
      closeModal();
    } catch (error) {
      console.error("Transaction failed:", error);
      setTransactionError(error.message);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <img
          src={lendingGuideImage}
          alt="Lending Guide Visual"
          className="w-full max-w-sm mx-auto mb-6"
        />
        <h2 className="text-3xl font-bold text-center text-green-700 mb-4">Lending for Beginners</h2>
        <p className="text-center text-gray-700 mb-6">
          IMALI’s lending system lets you earn and borrow at your own pace. Deposit crypto like ETH, IMALI, or MATIC as collateral — and access stablecoins without giving up your assets. You stay in control.
        </p>

        {!account ? (
          <div className="text-center mt-4">
            <button
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={() => connectWallet("metamask")}
            >
              🦊 Connect Wallet
            </button>
          </div>
        ) : (
          <>
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <p><strong>ETH Collateral:</strong> {collateral.eth}</p>
              <p><strong>IMALI Collateral:</strong> {collateral.imali}</p>
              <p><strong>MATIC Collateral:</strong> {collateral.matic}</p>
              <p><strong>Total Collateral:</strong> {collateral.total}</p>
              <p><strong>Supply APY:</strong> {stats.supplyApy}</p>
              <p><strong>Borrow APY:</strong> {stats.borrowApy}</p>
              <p><strong>Deposit Fee:</strong> {stats.depositFee}</p>
              <p><strong>Borrow Fee:</strong> {stats.borrowFee}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map((asset, idx) => (
                <div key={idx} className="bg-white shadow p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    {asset.icon}<span>{asset.name}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Price: ${tokenPrices[asset.symbol] || 'Loading...'}</p>
                  <div className="mt-3 space-y-2">
                    <button onClick={() => openModal("supply", asset)} className="w-full bg-green-600 text-white py-2 rounded">Deposit</button>
                    <button onClick={() => openModal("borrow", asset)} className="w-full bg-blue-600 text-white py-2 rounded">Borrow</button>
                    <button onClick={() => openModal("repay", asset)} className="w-full bg-yellow-600 text-white py-2 rounded">Repay</button>
                    <button onClick={() => openModal("withdraw", asset)} className="w-full bg-red-600 text-white py-2 rounded">Withdraw</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {modalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">{modalType.charAt(0).toUpperCase() + modalType.slice(1)} {selectedToken?.symbol}</h3>
              <input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full mb-4 p-2 border rounded"
              />
              <div className="flex justify-between">
                <button className="bg-gray-300 px-4 py-2 rounded" onClick={closeModal}>Cancel</button>
                <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={executeTransaction}>
                  Confirm
                </button>
              </div>
              {transactionError && <p className="text-red-600 mt-2">{transactionError}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Lending;
