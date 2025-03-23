import React, { useState } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";
import { Button, Typography, Paper, CircularProgress } from "@mui/material";

const NFTMinting = () => {
  const { walletAddress } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const mintNFT = async () => {
    try {
      setLoading(true);
      const contract = await getContractInstance("NFT");
      const tx = await contract.mint(walletAddress);
      await tx.wait();
      toast.success("✅ NFT minted successfully!");
    } catch (err) {
      console.error("❌ NFT minting failed:", err);
      setError(`❌ Transaction failed: ${err.reason || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={2} className="p-4 mb-6">
      <Typography variant="h6" style={{ color: "#9c27b0" }}>Mint Your NFT</Typography>
      <Button
        variant="contained"
        color="secondary"
        onClick={mintNFT}
        disabled={loading || !walletAddress}
        fullWidth
        style={{ marginTop: "10px" }}
      >
        {loading ? <CircularProgress size={24} /> : "Mint NFT"}
      </Button>
      {error && (
        <Typography variant="body1" color="error" className="mt-2">
          {error}
        </Typography>
      )}
    </Paper>
  );
};

export default NFTMinting;