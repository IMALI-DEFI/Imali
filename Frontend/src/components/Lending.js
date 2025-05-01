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
  const { account, connectWallet, disconnectWallet, provider } = useWallet();
  const [collateral, setCollateral] = useState({ eth: "0", imali: "0", matic: "0", total: "0" });
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    fetchUserCollateral();
  }, [fetchUserCollateral]);

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
          <div className="max-w-lg mx-auto text-gray-800">
            <ul className="list-disc space-y-2">
              <li>📥 Deposit crypto as collateral (ETH, IMALI, MATIC)</li>
              <li>💸 Borrow instantly using your deposited assets</li>
              <li>🔁 Repay anytime — get your crypto back</li>
              <li>🚫 No credit checks — DeFi is open to all</li>
            </ul>
            <div className="mt-6 bg-gray-100 p-4 rounded-lg shadow">
              <p><strong>ETH Collateral:</strong> {collateral.eth}</p>
              <p><strong>IMALI Collateral:</strong> {collateral.imali}</p>
              <p><strong>MATIC Collateral:</strong> {collateral.matic}</p>
              <p><strong>Total Collateral:</strong> {collateral.total}</p>
            </div>
            <div className="text-center mt-4">
              <button
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                onClick={disconnectWallet}
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        )}

        {/* Step-by-step walkthrough */}
        <div className="mt-10">
          <h3 className="text-2xl font-semibold text-center text-gray-800 mb-4">
            How IMALI Lending Works (Step-by-Step)
          </h3>
          <div className="bg-green-50 p-4 rounded-lg shadow-md text-gray-700 space-y-3 max-w-2xl mx-auto">
            {[
              {
                step: "1. Connect Your Wallet",
                detail: "Click the 🦊 Connect Wallet button above to get started using MetaMask or WalletConnect."
              },
              {
                step: "2. Deposit Crypto as Collateral",
                detail: "Choose an asset like ETH, IMALI, or MATIC. Your deposit earns interest and secures your borrowing."
              },
              {
                step: "3. Borrow Instantly",
                detail: "Once you’ve deposited, borrow stablecoins (like USDC or DAI) directly into your wallet."
              },
              {
                step: "4. Use Your Funds Freely",
                detail: "Use borrowed funds for trading, payments, or other DeFi opportunities — all while keeping your crypto collateral."
              },
              {
                step: "5. Repay & Reclaim Collateral",
                detail: "Repay what you borrowed and unlock your original assets anytime, with no penalties."
              }
            ].map((item, index) => (
              <div key={index}>
                <strong>{item.step}</strong>
                <p className="ml-4">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="mt-10 max-w-2xl mx-auto">
          <h3 className="text-2xl font-semibold text-center text-gray-800 mb-4">
            Frequently Asked Questions
          </h3>
          <div className="divide-y divide-gray-300 rounded-lg border border-gray-200 shadow-sm">
            {[
              {
                q: "What happens if I don’t repay my loan?",
                a: "Your collateral may be liquidated to cover the borrowed amount if it falls below a safe ratio."
              },
              {
                q: "Can I add more collateral after borrowing?",
                a: "Yes! You can top up your collateral anytime to lower your risk of liquidation."
              },
              {
                q: "Is there a minimum or maximum I can borrow?",
                a: "Minimums vary by asset. Your maximum is based on your deposited collateral value."
              },
              {
                q: "Can I withdraw my collateral at any time?",
                a: "Yes, as long as your remaining collateral keeps your loan within a safe ratio."
              }
            ].map((faq, idx) => (
              <details key={idx} className="p-4 hover:bg-gray-50 cursor-pointer">
                <summary className="font-semibold">{faq.q}</summary>
                <p className="mt-2 text-gray-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lending;
