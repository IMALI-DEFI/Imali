import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import NFTAnimation from "../assets/animations/nft-animation.svg";
import getContractInstance from "../getContractInstance";
import { FaInfoCircle, FaQuestionCircle, FaRocket } from "react-icons/fa"; // Removed FaTicket

const NFTMinting = () => {
  const { account, chainId, connectWallet } = useWallet();
  const [isMinting, setIsMinting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const POLYGON_CHAIN_ID = 137;
  const POLYGON_CHAIN_NAME = "Polygon Mainnet";

  useEffect(() => {
    if (chainId && chainId !== POLYGON_CHAIN_ID) {
      setStatus(`Please connect to ${POLYGON_CHAIN_NAME} to mint NFTs.`);
    } else {
      setStatus("");
    }
  }, [chainId]);

  const handleConnectWallet = async () => {
    setLoading(true);
    try {
      await connectWallet();
    } catch (error) {
      setStatus(`Connection Failed: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMintNFT = async () => {
    if (!account) {
      setStatus("Please connect your wallet first.");
      return;
    }

    if (chainId !== POLYGON_CHAIN_ID) {
      setStatus(`Please connect to ${POLYGON_CHAIN_NAME} to mint NFTs.`);
      return;
    }

    setLoading(true);
    try {
      setIsMinting(true);
      setStatus("Minting NFT...");
      const nftContract = await getContractInstance("IMALINFT", POLYGON_CHAIN_ID);

      if (!nftContract) {
        throw new Error("Failed to get contract instance.");
      }

      const tx = await nftContract.mint(account);
      setTxHash(tx.hash);
      setStatus(`Minting successful! Transaction Hash: ${tx.hash}`);
      await tx.wait();
      setIsMinting(false);
    } catch (err) {
      console.error("Minting failed:", err);
      setStatus(`Minting failed: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h1 className="text-3xl font-bold text-center mb-6 text-blue-600">
          IMALI NFTs
        </h1>

        {/* Educational Section */}
        <div className="bg-blue-50 p-6 rounded-lg mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <FaInfoCircle className="mr-2 text-blue-500" />
            What are IMALI NFTs?
          </h2>
          <p className="mb-4">
            IMALI NFTs are your key to the IMALI ecosystem, providing access to
            rewards, unlocking exclusive tiers, and offering opportunities to earn
            through staking, royalties, and yield pools.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-bold mb-2"> Access
              </h3>
              <p>
                NFTs grant access to various features and benefits within the IMALI
                ecosystem.
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-bold mb-2">💰 Earning Potential</h3>
              <p>
                Participate in staking, earn royalties, and access exclusive yield
                pools.
              </p>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-3 flex items-center">
            <FaQuestionCircle className="mr-2 text-blue-500" />
            How to Mint Your NFT
          </h3>
          <ol className="list-decimal list-inside space-y-2 pl-4">
            <li className="font-medium">
              Connect your wallet.
            </li>
            <li className="font-medium">
              Ensure you are connected to the Polygon Network.
            </li>
            <li className="font-medium">
              Click the "Mint NFT" button.
            </li>
            <li className="font-medium">
              Confirm the transaction in your wallet.
            </li>
            <li className="font-medium">
              Receive your IMALI NFT!
            </li>
          </ol>
        </div>

        {/* Minting Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2">
              <img
                src={NFTAnimation}
                alt="NFT Animation"
                className="w-full h-auto max-w-md mx-auto rounded-lg"
              />
            </div>
            <div className="md:w-1/2 space-y-4">
              <h2 className="text-2xl font-semibold">Mint Your IMALI NFT</h2>
              <p className="text-gray-700">
                Mint your IMALI NFT to unlock exclusive benefits and rewards within
                the IMALI ecosystem.
              </p>
              {!account ? (
                <button
                  onClick={handleConnectWallet}
                  disabled={loading}
                  className="bg-green-600 text-white py-3 px-6 rounded font-semibold hover:bg-green-700 transition w-full"
                >
                  {loading ? "Connecting..." : "🔗 Connect Wallet"}
                </button>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    Connected: {account.slice(0, 6)}...{account.slice(-4)}
                  </p>
                  <button
                    onClick={handleMintNFT}
                    disabled={isMinting || loading || chainId !== POLYGON_CHAIN_ID}
                    className="bg-green-600 text-white py-3 px-6 rounded font-semibold hover:bg-green-700 transition w-full flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        Minting...
                      </>
                    ) : (
                      <>
                        <FaRocket className="mr-2" /> Mint NFT
                      </>
                    )}
                  </button>
                </>
              )}

              {status && <p className="mt-4 text-sm text-gray-600">{status}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFTMinting;


