import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";
import {
  Button,
  CircularProgress,
  TextField,
  Typography,
  Paper,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const IMALIToken = () => {
  const { walletAddress, connectWallet, resetWallet, loading, setLoading } = useWallet();
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState("0");
  const [error, setError] = useState("");

  // Check that the user is on Polygon Mainnet (chainId 137)
  const checkNetwork = useCallback(async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (network.chainId !== 137) {
        setError("❌ Not on Polygon Network. Please switch in MetaMask.");
        return false;
      }
      setError("");
      return true;
    } catch (err) {
      console.error("Error checking network:", err);
      setError("❌ Failed to check network.");
      return false;
    }
  }, []);

  // Fetch IMALI token balance from the token contract.
  const fetchBalance = useCallback(async () => {
    if (!walletAddress) {
      setError("❌ Wallet not connected.");
      return;
    }
    try {
      setError("");
      const contract = await getContractInstance("Token");
      if (!contract) {
        throw new Error("Token contract not initialized.");
      }
      const tokenBalance = await contract.balanceOf(walletAddress);
      setBalance(ethers.formatEther(tokenBalance));
      console.log("✅ Token balance fetched:", ethers.formatEther(tokenBalance));
    } catch (err) {
      console.error("❌ Error fetching token balance:", err);
      setError("❌ Failed to fetch token balance. Ensure you're on the correct network.");
    }
  }, [walletAddress]);

  // Handle token purchase transaction.
  const purchaseTokens = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("❌ Please enter a valid amount.");
      return;
    }
    const isOnPolygon = await checkNetwork();
    if (!isOnPolygon) return;
    try {
      setError("");
      setLoading(true);
      const contract = await getContractInstance("Token");
      if (!contract) {
        setError("❌ Could not get contract instance. Try reconnecting.");
        return;
      }
      const valueToSend = ethers.parseEther(amount);
      console.log("Sending MATIC (in wei):", valueToSend.toString());
      const tx = await contract.buyTokens({ value: valueToSend });
      console.log(`Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait(1);
      console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);
      toast.success("✅ Tokens purchased successfully!");
      fetchBalance();
      setAmount(""); // Reset input
    } catch (err) {
      console.error("❌ Failed to purchase tokens:", err);
      setError(`❌ Transaction failed: ${err.reason || err.message}`);
    } finally {
      setLoading(false);
    }
  }, [amount, checkNetwork, fetchBalance, setLoading]);

  // Fetch balance when walletAddress changes.
  useEffect(() => {
    if (walletAddress) {
      fetchBalance();
    }
  }, [walletAddress, fetchBalance]);

  return (
    <section className="bg-gray-100 min-h-screen py-16 px-6">
      <Paper className="container mx-auto max-w-6xl bg-white shadow-lg p-12 rounded-lg">
        {/* Header */}
        <Typography variant="h4" align="center" className="mb-8" style={{ color: "#036302", fontWeight: "bold" }}>
          💰 Purchase IMALI Tokens
        </Typography>

        {/* Wallet Connection */}
        <Grid container justifyContent="center" spacing={2} className="mb-6">
          <Grid item>
            {!walletAddress ? (
              <Button variant="contained" color="primary" onClick={connectWallet}>
                Connect Wallet
              </Button>
            ) : (
              <>
                <Typography variant="h6" style={{ color: "#036302" }}>
                  Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </Typography>
                <Button variant="outlined" color="error" onClick={() => { setError(""); resetWallet(); }} style={{ marginTop: "10px" }}>
                  Disconnect Wallet
                </Button>
              </>
            )}
          </Grid>
        </Grid>

        {/* Error Display */}
        {error && (
          <Typography variant="body1" align="center" color="error" className="mb-4">
            {error}
          </Typography>
        )}

        {/* Loading Message */}
        {loading && (
          <Typography variant="body1" align="center" className="mb-4">
            Processing transaction...
          </Typography>
        )}

        {/* Token Balance */}
        <Paper elevation={2} className="p-4 mb-6">
          <Typography variant="h6" style={{ color: "#036302" }}>Your IMALI Balance</Typography>
          <Typography variant="h5">{balance} IMALI</Typography>
        </Paper>

        {/* Purchase Form */}
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

        {/* Detailed Instructions */}
        <Paper elevation={3} style={{ padding: "20px", backgroundColor: "#f9f9f9" }}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">📝 How to Purchase IMALI Tokens</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ol style={{ marginLeft: "20px", lineHeight: "1.6" }}>
                <li>
                  <strong>Connect Your Wallet:</strong> Click the "Connect Wallet" button above and ensure your wallet (e.g., MetaMask) is connected.
                </li>
                <li>
                  <strong>Switch to Polygon:</strong> Your wallet must be on the Polygon network. If not, please switch networks in MetaMask.
                </li>
                <li>
                  <strong>Ensure Sufficient MATIC:</strong> Purchase or transfer MATIC to your wallet since you'll use it to buy IMALI tokens.
                </li>
                <li>
                  <strong>Enter Purchase Amount:</strong> Type the amount of MATIC you want to spend in the input field.
                </li>
                <li>
                  <strong>Confirm Transaction:</strong> Click "Buy Tokens" and confirm the transaction in your wallet. After the transaction is confirmed, your IMALI token balance will update.
                </li>
              </ol>
              <Typography variant="body1" style={{ marginTop: "10px" }}>
                Note: Every transaction will require confirmation via your wallet (e.g., MetaMask). Ensure you have enough gas.
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Paper>
      </Paper>
    </section>
  );
};

export default IMALIToken;