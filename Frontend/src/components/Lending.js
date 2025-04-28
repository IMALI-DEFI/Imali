import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { getContractInstance } from "../getContractInstance";
import lendingGuideImage from "../assets/images/lending-guide-visual.png";
import { FaEthereum, FaBitcoin, FaDollarSign } from "react-icons/fa";

const tokenAddresses = { /* Chainlink feeds */
  ETH: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419",
  USDC: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
  DAI: "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9",
  WBTC: "0xdeb288F737066589598e9214E782fa5A8eD689e8",
  LINK: "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c",
  AAVE: "0x547a514d5e3769680Ce22B2361c10Ea13619e8a9",
  UNI: "0x553303d460EE0afB37EdFf9bE42922D8FF63220e",
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
  { name: "UNI", symbol: "UNI", icon: <FaEthereum size={24} />, address: tokenAddresses.UNI, type: "UNI" },
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
    liquidity: "Loading...",
    supplyApy: "Loading...",
    borrowApy: "Loading...",
    depositFee: "Loading...",
    borrowFee: "Loading...",
  });

  const fetchAssetPrices = useCallback(async () => {
    try {
      const rpcUrl = process.env.REACT_APP_ALCHEMY_ETHERIUM;
      if (!rpcUrl) throw new Error("Alchemy Ethereum RPC URL missing");
      const ethProvider = new ethers.JsonRpcProvider(rpcUrl);
      await ethProvider.getNetwork();

      const updatedPrices = {};
      for (const [symbol, address] of Object.entries(tokenAddresses)) {
        const feed = new ethers.Contract(address, ["function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)",], ethProvider);
        const data = await feed.latestRoundData();
        updatedPrices[symbol] = ethers.formatUnits(data.answer, 8);
      }
      setAssetPrices(updatedPrices);
    } catch (error) {
      console.error("Price fetch error:", error);
    }
  }, []);

  const fetchLendingDetails = useCallback(async () => {
    try {
      if (chainId !== 1) throw new Error("Switch to Ethereum Mainnet");
      const contract = await getContractInstance("Lending");
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();

      const [liquidity, supplyApy, borrowApy, depositFee, borrowFee] = await Promise.all([
        contract.getLiquidity(),
        contract.getSupplyRate(),
        contract.getBorrowRate(),
        contract.depositFee(),
        contract.borrowFee()
      ]);

      const collateralData = await fetchUserCollateral(contract, addr);

      setLendingData({
        collateral: { eth: collateralData.eth + " ETH", imali: collateralData.imali + " IMALI", matic: collateralData.matic + " MATIC", total: collateralData.total + " TOTAL" },
        liquidity: ethers.formatUnits(liquidity, 18),
        supplyApy: (Number(supplyApy) / 10000).toFixed(2) + "%",
        borrowApy: (Number(borrowApy) / 10000).toFixed(2) + "%",
        depositFee: ethers.formatUnits(depositFee, 18) + " ETH",
        borrowFee: ethers.formatUnits(borrowFee, 18) + " ETH",
      });
    } catch (error) {
      console.error("Error fetching lending info:", error);
    }
  }, [chainId, provider]);

  const fetchUserCollateral = async (contract, userAddress) => {
    try {
      const [eth, imali, matic] = await Promise.all([
        contract.ethCollateral(userAddress),
        contract.imaliCollateral(userAddress),
        contract.maticCollateral(userAddress)
      ]);
      const total = eth + imali + matic;
      return {
        eth: ethers.formatUnits(eth, 18),
        imali: ethers.formatUnits(imali, 18),
        matic: ethers.formatUnits(matic, 18),
        total: ethers.formatUnits(total, 18)
      };
    } catch (error) {
      console.error("Collateral fetch error:", error);
      return { eth: "0", imali: "0", matic: "0", total: "0" };
    }
  };

  useEffect(() => {
    fetchAssetPrices();
    if (provider) fetchLendingDetails();
    const interval = setInterval(() => {
      fetchAssetPrices();
      if (provider) fetchLendingDetails();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAssetPrices, fetchLendingDetails, provider]);

  const openModal = (type, asset) => {
    setModalType(type);
    setSelectedToken(asset.address || null);
    setBorrowId("");
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
    if (!account || !provider) {
      alert("Connect your wallet");
      return;
    }
    setLoading(true);
    try {
      const contract = await getContractInstance("Lending");
      const tx = await (modalType === "supply"
        ? contract.depositEthCollateral({ value: ethers.parseUnits(amount, 18) })
        : modalType === "borrow"
        ? contract.borrow(ethers.parseUnits(amount, 18), selectedToken)
        : modalType === "repay"
        ? contract.repay(ethers.parseUnits(amount, 18))
        : contract.withdrawCollateral(ethers.parseUnits(amount, 18), selectedToken)
      );
      await tx.wait();
      alert("✅ Transaction successful");
      closeModal();
      fetchAssetPrices();
      fetchLendingDetails();
    } catch (error) {
      console.error("Transaction error:", error);
      setTransactionError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="dashboard text-gray-900 py-12">
      {/* Wallet section, Lending guide, Lending stats, Asset Cards, Modal */}
      {/* Omitted for brevity: Shall I proceed and generate the full JSX structure too? */}
    </section>
  );
};

export default Lending;
