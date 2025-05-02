import React, { useState, useEffect, useRef, useCallback } from "react";
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
import farmingGuideImage from "../assets/images/farming-guide-visual.png";

const formatAddress = (address) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected";

const YieldFarming = () => {
  const { walletAddress, connectWallet, resetWallet } = useWallet();
  const [farmBalance, setFarmBalance] = useState("0");
  const [earnedRewards, setEarnedRewards] = useState("0");
  const [lpRewardRate, setLPRewardRate] = useState("0");
  const [stakingFee, setStakingFee] = useState(0);
  const [amount, setAmount] = useState("");
  const [apy, setApy] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const stakingContractRef = useRef(null);
  const lpTokenContractRef = useRef(null);

  const initContracts = useCallback(async () => {
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
  }, []);

  const fetchFarmData = useCallback(async () => {
    if (!walletAddress || !stakingContractRef.current || !lpTokenContractRef.current) return;
    try {
      setLoading(true);
      setError(null);

      const stakedLPData = await stakingContractRef.current.lpStakers(walletAddress);
      const stakedLPToken = await lpTokenContractRef.current.balanceOf(
        await stakingContractRef.current.getAddress()
      );
      const rewardRate = await stakingContractRef.current.lpRewardRate();
      const lpFee = await stakingContractRef.current.lpFeePercentage();

      setFarmBalance(ethers.formatUnits(stakedLPToken, 18));
      setEarnedRewards(ethers.formatUnits(stakedLPData.rewards, 18));
      setLPRewardRate(ethers.formatUnits(rewardRate, 18));
      setStakingFee(Number(lpFee));

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
  }, [walletAddress]);

  const fetchUserBalance = useCallback(async () => {
    if (walletAddress && lpTokenContractRef.current) {
      const balance = await lpTokenContractRef.current.balanceOf(walletAddress);
      setFarmBalance(ethers.formatUnits(balance, 18));
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) {
      initContracts().then(() => {
        fetchFarmData();
        fetchUserBalance();
      });
    }
  }, [walletAddress, initContracts, fetchFarmData, fetchUserBalance]);

  const stakeTokensInFarm = async () => {
    if (!stakingContractRef.current || !lpTokenContractRef.current) return;
    try {
      setLoading(true);
      setError(null);
      const amountInWei = ethers.parseUnits(amount, 18);
      const stakingAddress = await stakingContractRef.current.getAddress();
      const allowance = await lpTokenContractRef.current.allowance(walletAddress, stakingAddress);

      if (ethers.toBigInt(allowance) < ethers.toBigInt(amountInWei)) {
        const approveTx = await lpTokenContractRef.current.approve(stakingAddress, amountInWei);
        await approveTx.wait();
        toast.success("LP token approval confirmed!");
      }

      const tx = await stakingContractRef.current.stakeLP(amountInWei);
      await tx.wait();
      toast.success("✅ Tokens staked successfully!");
      fetchFarmData();
    } catch (err) {
      console.error("❌ Staking failed:", err);
      setError(`❌ Staking failed: ${err.message || err.reason || err}`);
    } finally {
      setLoading(false);
    }
  };

  const unstakeTokensInFarm = async () => {
    if (!stakingContractRef.current) return;
    try {
      setLoading(true);
      setError(null);
      const amountInWei = ethers.parseUnits(amount, 18);
      const tx = await stakingContractRef.current.unstakeLP(amountInWei);
      await tx.wait();
      toast.success("✅ Tokens unstaked successfully!");
      fetchFarmData();
    } catch (err) {
      console.error("❌ Unstaking failed:", err);
      setError(`❌ Unstaking failed: ${err.message || err.reason || err}`);
    } finally {
      setLoading(false);
    }
  };

  const claimRewards = async () => {
    if (!stakingContractRef.current) return;
    try {
      setLoading(true);
      setError(null);
      const tx = await stakingContractRef.current.claimRewards();
      await tx.wait();
      toast.success("✅ Rewards claimed successfully!");
      fetchFarmData();
    } catch (err) {
      console.error("❌ Failed to claim rewards:", err);
      setError(`❌ Failed to claim rewards: ${err.message || err.reason}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-gray-50 text-gray-900 py-12">
      <div className="container mx-auto px-4 bg-white shadow-md rounded-lg py-6">
        <img
          src={farmingGuideImage}
          alt="Farming Guide"
          className="mx-auto mb-6 rounded-md w-full max-w-md"
        />
        <Typography variant="h4" align="center" className="mb-4" style={{ color: "#036302" }}>
          💰 Yield Farming
        </Typography>
        <Typography variant="h6" align="center" className="mb-6">
          Earn extra rewards by staking your LP tokens.
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={3}>
            <Paper className="p-6 text-center">
              <Typography variant="h6">Farm Balance</Typography>
              <Typography variant="h4">{farmBalance} Tokens</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper className="p-6 text-center">
              <Typography variant="h6">Earned Rewards</Typography>
              <Typography variant="h4">{earnedRewards} Tokens</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper className="p-6 text-center">
              <Typography variant="h6">APY</Typography>
              <Typography variant="h4">{apy}%</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper className="p-6 text-center">
              <Typography variant="h6">Connected Wallet</Typography>
              <Typography variant="h6">
                {walletAddress ? formatAddress(walletAddress) : "❌ Not connected"}
              </Typography>
              <div className="mt-4 flex flex-col space-y-2">
                {!walletAddress ? (
                  <Button variant="contained" onClick={connectWallet}>Connect Wallet</Button>
                ) : (
                  <>
                    <Button variant="contained" onClick={() => alert("Wallet is already connected")}>Connected</Button>
                    <Button variant="outlined" onClick={resetWallet}>Disconnect Wallet</Button>
                  </>
                )}
              </div>
            </Paper>
          </Grid>
        </Grid>

        <div className="mt-8 text-center">
          <div className="mb-4">
            <TextField
              label="Amount to stake/unstake"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
            />
          </div>
          <div className="space-y-3">
            <Button variant="contained" color="error" onClick={stakeTokensInFarm} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : "Stake in Farm"}
            </Button>
            <Button variant="contained" color="inherit" onClick={unstakeTokensInFarm} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : "Unstake in Farm"}
            </Button>
            <Button variant="contained" color="primary" onClick={claimRewards} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : "Claim Rewards"}
            </Button>
          </div>
        </div>

        <Paper elevation={3} className="mt-10 p-6 bg-gray-100">
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">📝 How to Use Yield Farming</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ol className="list-decimal space-y-2 pl-4">
                <li>Connect your wallet to Polygon network.</li>
                <li>Obtain LP tokens by providing liquidity on a DEX.</li>
                <li>Enter the amount of LP tokens and click "Stake in Farm".</li>
                <li>Unstake your tokens using the "Unstake in Farm" button.</li>
                <li>Click "Claim Rewards" to receive your earnings.</li>
                <li>Note that a staking fee of {stakingFee}% may apply.</li>
              </ol>
              <Typography variant="body2" className="mt-4">
                Each transaction requires confirmation in your wallet.
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Paper>
      </div>
    </section>
  );
};

export default YieldFarming;
