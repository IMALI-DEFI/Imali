// IMALIToken.js
import React, { useState, useEffect, useCallback } from "react";
import { ethers, Contract } from "ethers";
import { toast } from "react-toastify";
import { useWallet } from "../context/WalletContext";
import { getContractInstance } from "../getContractInstance";
import {
  Button,
  CircularProgress,
  TextField,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const POLYGON_MAINNET = 137;
const BASE_MAINNET = 8453;

const chainIcons = {
  [POLYGON_MAINNET]: "🟣 Polygon",
  [BASE_MAINNET]: "🔵 Base",
};

const IMALIToken = () => {
  const {
    account,
    connectWallet,
    disconnectWallet,
    isConnecting,
    error,
    loading,
    setLoading,
  } = useWallet();
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState("0");
  const [status, setStatus] = useState("");
  const [tokenPriceUSD, setTokenPriceUSD] = useState(null);
  const [activeChainId, setActiveChainId] = useState(null);

  const RATE = 100; // 100 tokens per MATIC

  const switchNetwork = async (chainId) => {
    if (!window.ethereum?.request) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (e) {
      console.error("Network switch error:", e);
    }
  };

  const checkNetwork = useCallback(async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      setActiveChainId(network.chainId);
      if (network.chainId !== POLYGON_MAINNET) {
        setStatus("❌ Not on Polygon Network. Please switch in MetaMask.");
        return false;
      }
      return true;
    } catch (err) {
      console.error("Error checking network:", err);
      setStatus("❌ Failed to check network.");
      return false;
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!account) return;
    try {
      const contract = await getContractInstance("Token");
      const tokenBalance = await contract.balanceOf(account);
      setBalance(ethers.formatEther(tokenBalance));
    } catch (err) {
      console.error("Error fetching token balance:", err);
      setStatus("❌ Failed to fetch token balance.");
    }
  }, [account]);

  const fetchTokenPrice = useCallback(async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const chainlink = new Contract(
        "0xab594600376ec9fd91f8e885dadf0ce036862de0", // MATIC/USD
        ["function latestAnswer() view returns (int256)"],
        provider
      );
      const price = await chainlink.latestAnswer();
      const usd = (1 / RATE) * (Number(price) / 1e8);
      setTokenPriceUSD(usd);
    } catch (err) {
      console.error("Failed to fetch price:", err);
    }
  }, []);

  const purchaseTokens = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setStatus("❌ Please enter a valid amount.");
      return;
    }
    const isOnPolygon = await checkNetwork();
    if (!isOnPolygon) return;
    try {
      setLoading(true);
      const contract = await getContractInstance("Token");
      const valueToSend = ethers.parseEther(amount);
      const tx = await contract.buyTokens({ value: valueToSend });
      await tx.wait(1);
      toast.success("✅ Tokens purchased successfully!");
      fetchBalance();
      setAmount("");
    } catch (err) {
      console.error("Failed to purchase tokens:", err);
      setStatus(`❌ Transaction failed: ${err.reason || err.message}`);
    } finally {
      setLoading(false);
    }
  }, [amount, checkNetwork, fetchBalance, setLoading]);

  useEffect(() => {
    if (account) {
      fetchBalance();
      fetchTokenPrice();
      checkNetwork();
    }
  }, [account, fetchBalance, fetchTokenPrice, checkNetwork]);

  if (!account) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">🔗 Connect Your Wallet</h2>
        <p className="text-gray-600 mb-4">
          To purchase IMALI tokens, please connect your wallet.
        </p>
        <Button
          onClick={connectWallet}
          variant="contained"
          color="primary"
          disabled={isConnecting}
        >
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
        {error && <Typography color="error" className="mt-2">{error}</Typography>}
      </div>
    );
  }

  return (
    <section className="bg-gray-100 min-h-screen py-16 px-6">
      <Paper className="container mx-auto max-w-6xl bg-white shadow-lg p-12 rounded-lg">
        <div className="bg-gray-100 p-4 rounded-lg text-sm mb-6 flex flex-col sm:flex-row justify-between items-center">
          <div>
            ✅ Connected: <span className="font-mono text-green-700">{account.slice(0, 6)}...{account.slice(-4)}</span>
          </div>
          <div>
            🔗 Network: {chainIcons[activeChainId] || "🌐 Unknown"}
          </div>
          <Button onClick={disconnectWallet} variant="outlined" color="error">
            Disconnect Wallet
          </Button>
        </div>

        <div className="flex gap-2 mb-6">
          <Button variant="outlined" onClick={() => switchNetwork(POLYGON_MAINNET)}>Switch to Polygon</Button>
          <Button variant="outlined" onClick={() => switchNetwork(BASE_MAINNET)}>Switch to Base</Button>
        </div>

        <Typography variant="h4" align="center" className="mb-8" style={{ color: "#036302", fontWeight: "bold" }}>
          💰 Purchase IMALI Tokens
        </Typography>

        {tokenPriceUSD && (
          <Typography align="center" className="mb-4">
            💱 1 IMALI ≈ ${tokenPriceUSD.toFixed(4)} USD
          </Typography>
        )}

        {status && <Typography align="center" color="error" className="mb-4">{status}</Typography>}
        {loading && <Typography align="center" className="mb-4">Processing transaction...</Typography>}

        <Paper elevation={2} className="p-4 mb-6">
          <Typography variant="h6" style={{ color: "#036302" }}>Your IMALI Balance</Typography>
          <Typography variant="h5">{balance} IMALI</Typography>
        </Paper>

        <Paper elevation={2} className="p-4 mb-6">
          <Typography variant="h6" style={{ color: "#9c27b0" }}>Buy IMALI Tokens</Typography>
          <TextField
            label="Enter amount in MATIC"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
            margin="normal"
            inputProps={{ step: "0.01", min: "0" }}
          />
          <Button
            variant="contained"
            color="secondary"
            onClick={purchaseTokens}
            disabled={loading}
            fullWidth
            style={{ marginTop: "10px" }}
          >
            {loading ? <CircularProgress size={24} /> : "Buy Tokens"}
          </Button>
        </Paper>

        <Paper elevation={3} style={{ padding: "20px", backgroundColor: "#f9f9f9" }}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">📝 How to Purchase IMALI Tokens</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ol style={{ marginLeft: "20px", lineHeight: "1.6" }}>
                <li><strong>Connect Your Wallet:</strong> Click the "Connect Wallet" button above.</li>
                <li><strong>Switch to Polygon:</strong> Ensure your wallet is set to the Polygon network.</li>
                <li><strong>Get MATIC:</strong> Make sure your wallet has enough MATIC to spend.</li>
                <li><strong>Enter Amount:</strong> Input how much MATIC you'd like to use.</li>
                <li><strong>Confirm Transaction:</strong> Click "Buy Tokens" and confirm in your wallet.</li>
              </ol>
              <Typography variant="body1" style={{ marginTop: "10px" }}>
                Note: Every transaction requires wallet confirmation and sufficient gas fees.
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Paper>
      </Paper>
    </section>
  );
};

export default IMALIToken;
