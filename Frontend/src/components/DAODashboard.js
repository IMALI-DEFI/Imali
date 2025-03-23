import React, { useState } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";
import { Button, TextField, Typography, Paper, CircularProgress } from "@mui/material";

const DAODashboard = () => {
  const { walletAddress } = useWallet();
  const [proposal, setProposal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const createProposal = async () => {
    if (!proposal) {
      setError("❌ Please enter a proposal.");
      return;
    }
    try {
      setLoading(true);
      const contract = await getContractInstance("DAO");
      const tx = await contract.propose(proposal);
      await tx.wait();
      toast.success("✅ Proposal created successfully!");
    } catch (err) {
      console.error("❌ Proposal creation failed:", err);
      setError(`❌ Transaction failed: ${err.reason || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={2} className="p-4 mb-6">
      <Typography variant="h6" style={{ color: "#9c27b0" }}>DAO Dashboard</Typography>
      <TextField
        label="Enter your proposal"
        value={proposal}
        onChange={(e) => setProposal(e.target.value)}
        fullWidth
        margin="normal"
      />
      <Button
        variant="contained"
        color="secondary"
        onClick={createProposal}
        disabled={loading || !walletAddress}
        fullWidth
        style={{ marginTop: "10px" }}
      >
        {loading ? <CircularProgress size={24} /> : "Create Proposal"}
      </Button>
      {error && (
        <Typography variant="body1" color="error" className="mt-2">
          {error}
        </Typography>
      )}
    </Paper>
  );
};

export default DAODashboard;