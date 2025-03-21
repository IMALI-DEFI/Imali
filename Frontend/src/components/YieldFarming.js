import React, { useState, useEffect, useRef } from "react";
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

const YieldFarming = () => {
  const { walletAddress, connectWallet, resetWallet, loading, setLoading } = useWallet();
  const [farmBalance, setFarmBalance] = useState("0");
  const [earnedRewards, setEarnedRewards] = useState("0");
  const [apy, setApy] = useState("0");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  // Refs for contract instances
  const stakingContractRef = useRef(null);
  const lpTokenContractRef = useRef(null);

  // Check that the user is on the Polygon network.
  const checkNetwork = async () => {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (network.chainId !== 137) {
        toast.error("⚠️ Please switch to the Polygon network to use yield farming features.");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Network check failed:", error);
      return false;
    }
  };

  // Initialize contract instances
  const initContracts = async () => {
    try {
      stakingContractRef.current = await getContractInstance("Staking");
      lpTokenContractRef.current = await getContractInstance("LPToken");
      if (!stakingContractRef.current || !lpTokenContractRef.current) {
        throw new Error("Contract instances failed to load.");
      }
    } catch (err) {
      console.error("Error initializing contracts:", err);
      setError(`Error initializing contracts: ${err.message || err.reason}`);
    }
  };

  // Fetch yield farming data from contracts
  const fetchFarmData = async () => {
    if (!walletAddress || !stakingContractRef.current || !lpTokenContractRef.current) return;

    try {
      setLoading(true);
      setError("");

      // Fetch LP staker info, LP token balance of staking contract, and reward rate
      const stakedLPData = await stakingContractRef.current.lpStakers(walletAddress);
      const stakedLPToken = await lpTokenContractRef.current.balanceOf(
        await stakingContractRef.current.getAddress()
      );
      const rewardRate = await stakingContractRef.current.lpRewardRate();

      setFarmBalance(ethers.formatUnits(stakedLPToken, 18));
      setEarnedRewards(ethers.formatUnits(stakedLPData.rewards, 18));

      // Calculate APY using a simple model (reward rate * seconds in year / total staked * 100)
      const stakedTotal = parseFloat(ethers.formatUnits(stakedLPToken, 18));
      const rateNum = parseFloat(ethers.formatUnits(rewardRate, 18));
      const secondsInYear = 31536000;
      const apyValue = stakedTotal > 0 ? ((rateNum * secondsInYear) / stakedTotal) * 100 : 0;
      setApy(apyValue.toFixed(2));
    } catch (err) {
      console.error("Error fetching farm data:", err);
      setError(`Error fetching farm data: ${err.message || err.reason}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch LP token balance of the user (for display purposes)
  const fetchUserBalance = async () => {
    if (walletAddress && lpTokenContractRef.current) {
      const balance = await lpTokenContractRef.current.balanceOf(walletAddress);
      setFarmBalance(ethers.formatUnits(balance, 18));
    }
  };

  // Initialize contracts and fetch data on wallet change
  useEffect(() => {
    if (walletAddress) {
      initContracts().then(() => {
        fetchFarmData();
        fetchUserBalance();
      });
    }
  }, [walletAddress]);

  // Handle token approval and staking
  const stakeTokensInFarm = async () => {
    if (!(await checkNetwork())) return;
    if (!walletAddress || !amount) {
      setError("❌ Connect wallet and enter an amount to stake");
      return;
    }
    if (parseFloat(amount) <= 0) {
      setError("❌ Amount to stake must be greater than 0");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const amountInWei = ethers.parseUnits(amount, 18);

      // Get staking contract address to check token allowance
      const stakingAddress = await stakingContractRef.current.getAddress();
      const allowance = await lpTokenContractRef.current.allowance(walletAddress, stakingAddress);

      // If current allowance is insufficient, approve the tokens
      if (ethers.toBigInt(allowance) < ethers.toBigInt(amountInWei)) {
        const approveTx = await lpTokenContractRef.current.approve(stakingAddress, amountInWei);
        await approveTx.wait();
        toast.success("LP token approval confirmed!");
      }

      // Stake the tokens
      const stakeTx = await stakingContractRef.current.stakeLP(amountInWei);
      await stakeTx.wait();
      toast.success(`Successfully staked ${amount} LP tokens!`);
      fetchFarmData();
      fetchUserBalance();
    } catch (err) {
      console.error("Staking error:", err);
      setError(`Staking failed: ${err.message || err.reason}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle unstaking LP tokens
  const unstakeTokensInFarm = async () => {
    if (!(await checkNetwork())) return;
    if (!walletAddress || !amount) {
      setError("❌ Connect wallet and enter an amount to unstake");
      return;
    }
    if (parseFloat(amount) <= 0) {
      setError("❌ Amount to unstake must be greater than 0");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const amountInWei = ethers.parseUnits(amount, 18);

      // Unstake the tokens
      const unstakeTx = await stakingContractRef.current.unstakeLP(amountInWei);
      await unstakeTx.wait();
      toast.success(`Successfully unstaked ${amount} LP tokens!`);
      fetchFarmData();
      fetchUserBalance();
    } catch (err) {
      console.error("Unstaking error:", err);
      setError(`Unstaking failed: ${err.message || err.reason}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle claiming rewards
  const claimRewards = async () => {
    if (!(await checkNetwork())) return;
    if (!walletAddress) {
      setError("❌ Connect wallet to claim rewards");
      return;
    }
    try {
      setLoading(true);
      setError("");

      // Claim rewards
      const claimTx = await stakingContractRef.current.claimRewards();
      await claimTx.wait();
      toast.success("Successfully claimed rewards!");
      fetchFarmData();
    } catch (err) {
      console.error("Claiming rewards error:", err);
      setError(`Claiming rewards failed: ${err.message || err.reason}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* Wallet Connection Info */}
      <Paper elevation={3} style={{ padding: "20px", textAlign: "center", marginBottom: "20px" }}>
        <Typography variant="h6">Wallet Connected: {walletAddress}</Typography>
        <Button variant="outlined" onClick={resetWallet} style={{ marginTop: "10px" }}>
          Disconnect Wallet
        </Button>
      </Paper>

      {/* Header */}
      <Typography variant="h4" align="center" gutterBottom>
        Yield Farming Dashboard
      </Typography>

      {/* How to Use Instructions */}
      <Paper elevation={3} style={{ padding: "20px", marginBottom: "20px" }}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">How to Use Yield Farming</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ol>
              <li>
                <strong>Connect Your Wallet:</strong> Click "Connect Wallet" to connect your wallet. Ensure it is connected to the Polygon Network.
              </li>
              <li>
                <strong>Obtain LP Tokens:</strong> LP tokens are obtained when you provide liquidity on a DEX (e.g., Uniswap) for any token pair. These tokens represent your share in the liquidity pool.
              </li>
              <li>
                <strong>Enter Amount to Stake:</strong> Input the amount of LP tokens you wish to stake.
              </li>
              <li>
                <strong>Click "Stake":</strong> Confirm the staking transaction in your wallet.
              </li>
              <li>
                <strong>Unstake Tokens:</strong> Enter the amount to unstake and click "Unstake". Make sure you have enough staked tokens.
              </li>
              <li>
                <strong>Claim Rewards:</strong> Click "Claim Rewards" to claim your earned rewards.
              </li>
              <li>
                <strong>View Your Data:</strong> Your dashboard will display staked amounts, rewards, and APY.
              </li>
            </ol>
            <Typography variant="body1" style={{ marginTop: "10px" }}>
              Note: Each transaction requires confirmation via your wallet (e.g., MetaMask).
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* Yield Farming Form and Data */}
      <Grid container spacing={3} style={{ marginBottom: "20px" }}>
        {/* Yield Farming Form */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} style={{ padding: "20px" }}>
            <Typography variant="h6" gutterBottom>
              Stake or Unstake Tokens
            </Typography>
            <TextField
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              style={{ marginBottom: "20px" }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={stakeTokensInFarm}
              disabled={loading}
              fullWidth
            >
              {loading ? <CircularProgress size={24} /> : "Stake"}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={unstakeTokensInFarm}
              disabled={loading}
              fullWidth
              style={{ marginTop: "10px" }}
            >
              {loading ? <CircularProgress size={24} /> : "Unstake"}
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={claimRewards}
              disabled={loading}
              fullWidth
              style={{ marginTop: "10px" }}
            >
              {loading ? <CircularProgress size={24} /> : "Claim Rewards"}
            </Button>
            {error && (
              <Typography color="error" style={{ marginTop: "10px" }}>
                {error}
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Yield Farming Data Display */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} style={{ padding: "20px" }}>
            <Typography variant="h6" gutterBottom>
              Your Yield Farming Data
            </Typography>
            <Typography>Staked LP Tokens: {farmBalance}</Typography>
            <Typography>Earned Rewards: {earnedRewards}</Typography>
            <Typography>APY: {apy}%</Typography>
          </Paper>
        </Grid>
      </Grid>
    </div>
  );
};

export default YieldFarming;
