import React, { useState } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";
import { Button, TextField, Typography, Paper, CircularProgress } from "@mui/material";

const PresaleSection = () => {
  const { walletAddress } = useWallet();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const participateInPresale = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("❌ Please enter a valid amount.");
      return;
    }
    try {
      setLoading(true);
      const contract = await getContractInstance("Presale");
      const valueToSend = ethers.parseEther(amount);
      const tx = await contract.participate({ value: valueToSend });
      await tx.wait();
      toast.success("✅ Presale participation successful!");
    } catch (err) {
      console.error("❌ Presale participation failed:", err);
      setError(`❌ Transaction failed: ${err.reason || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={2} className="p-4 mb-6">
      <Typography variant="h6" style={{ color: "#9c27b0" }}>Participate in Presale</Typography>
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
        onClick={participateInPresale}
        disabled={loading || !walletAddress}
        fullWidth
        style={{ marginTop: "10px" }}
      >
        {loading ? <CircularProgress size={24} /> : "Participate"}
      </Button>
      {error && (
        <Typography variant="body1" color="error" className="mt-2">
          {error}
        </Typography>
      )}
    </Paper>
  );
};

export default PresaleSection;