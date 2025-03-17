import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";
import {
    Button, CircularProgress, TextField, Select, MenuItem, Typography, Paper, Grid, Accordion, AccordionSummary, AccordionDetails 
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// Helper: Truncate wallet address for display.
const formatAddress = (address) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected";

// YieldFarming component
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

  // Refs for contract instances
  const stakingContractRef = useRef(null);
  const lpTokenContractRef = useRef(null);

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
    if (!walletAddress || !stakingContractRef.current || !lpTokenContractRef.current)
      return;

    try {
      setLoading(true);
      setError(null);

      // Fetch LP staker info, LP token balance of staking contract, reward rate and fee.
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

      // Calculate APY using a simple model (reward rate * seconds in year / total staked * 100)
      const stakedTotal = parseFloat(ethers.formatUnits(stakedLPToken, 18));
      const rateNum = parseFloat(ethers.formatUnits(rewardRate, 18));
      const secondsInYear = 31536000;
      const apyValue = stakedTotal > 0 ? ((rateNum * secondsInYear) / stakedTotal) * 100 : 0;
      setApy(apyValue.toFixed(2));

      console.log("✅ Farm data fetched successfully.");
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
      // Use ethers.formatUnits to convert from wei to a human-readable format.
      setFarmBalance(ethers.formatUnits(balance, 18));
    }
  };

  // Initialize contracts and fetch data on wallet change.
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
    if (!stakingContractRef.current || !lpTokenContractRef.current) return;
    try {
      setLoading(true);
      setError(null);
      const amountInWei = ethers.parseUnits(amount, 18);

      // Get staking contract address to check token allowance.
      const stakingAddress = await stakingContractRef.current.getAddress();
      const allowance = await lpTokenContractRef.current.allowance(walletAddress, stakingAddress);

      // If current allowance is insufficient, approve the tokens.
      if (ethers.toBigInt(allowance) < ethers.toBigInt(amountInWei)) {
        console.log("Approving LP tokens...");
        const approveTx = await lpTokenContractRef.current.approve(stakingAddress, amountInWei);
        await approveTx.wait();
        toast.success("LP token approval confirmed!");
      }

      console.log(`Staking ${amount} LP tokens...`);
      const tx = await stakingContractRef.current.stakeLP(amountInWei);
      await tx.wait();
      alert("✅ Tokens staked successfully!");
      fetchFarmData();
    } catch (err) {
      console.error("❌ Staking failed:", err);
      setError(`❌ Staking failed: ${err.message || err.reason || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle unstaking LP tokens.
  const unstakeTokensInFarm = async () => {
    if (!stakingContractRef.current) return;
    try {
      setLoading(true);
      setError(null);
      const amountInWei = ethers.parseUnits(amount, 18);
      console.log(`Unstaking ${amount} LP tokens...`);
      const tx = await stakingContractRef.current.unstakeLP(amountInWei);
      await tx.wait();
      alert("✅ Tokens unstaked successfully!");
      fetchFarmData();
    } catch (err) {
      console.error("❌ Unstaking failed:", err);
      setError(`❌ Unstaking failed: ${err.message || err.reason || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle claiming rewards.
  const claimRewards = async () => {
    if (!stakingContractRef.current) return;
    try {
      setLoading(true);
      setError(null);
      console.log("Claiming rewards...");
      const tx = await stakingContractRef.current.claimRewards();
      await tx.wait();
      alert("✅ Rewards claimed successfully!");
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
        <Typography variant="h4" align="center" className="mb-4" style={{ color: "#036302" }}>
          💰 Yield Farming
        </Typography>
        <Typography variant="h6" align="center" className="mb-6">
          Earn extra rewards by staking your LP tokens.
        </Typography>

        <Grid container spacing={4}>
          {/* Farm Data */}
          <Grid item xs={12} md={3}>
            <Paper className="p-6 text-center">
              <Typography variant="h6" className="mb-2" style={{ color: "#036302" }}>
                Farm Balance
              </Typography>
              <Typography variant="h4" style={{ color: "#036302" }}>
                {farmBalance} Tokens
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper className="p-6 text-center">
              <Typography variant="h6" className="mb-2" style={{ color: "#3f51b5" }}>
                Earned Rewards
              </Typography>
              <Typography variant="h4" style={{ color: "#3f51b5" }}>
                {earnedRewards} Tokens
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper className="p-6 text-center">
              <Typography variant="h6" className="mb-2" style={{ color: "#9c27b0" }}>
                APY (Annual Yield)
              </Typography>
              <Typography variant="h4" style={{ color: "#9c27b0" }}>
                {apy}%
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper className="p-6 text-center">
              <Typography variant="h6" className="mb-2" style={{ color: "#036302" }}>
                Connected Wallet
              </Typography>
              <Typography variant="h6">
                {walletAddress ? formatAddress(walletAddress) : "❌ Not connected"}
              </Typography>
              <div className="mt-4 flex flex-col space-y-2">
                {!walletAddress ? (
                  <Button variant="contained" color="primary" onClick={connectWallet}>
                    Connect Wallet
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => alert("Wallet is already connected")}
                    >
                      Connected
                    </Button>
                    <Button variant="outlined" onClick={resetWallet}>
                      Disconnect Wallet
                    </Button>
                  </>
                )}
              </div>
            </Paper>
          </Grid>
        </Grid>

        {/* Stake and Claim Section */}
        <div className="mt-8 flex flex-col items-center justify-center text-center">
          <div className="p-6 border border-gray-300 rounded-md w-auto mb-4">
            <TextField
              label="Enter amount to stake/unstake"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              style={{ marginBottom: "20px" }}
            />
          </div>
          <div className="flex flex-col items-center space-y-2">
            <Button
              onClick={stakeTokensInFarm}
              variant="contained"
              color="error"
              disabled={loading}
              style={{ width: "200px" }}
            >
              {loading ? <CircularProgress size={24} /> : "Stake in Farm"}
            </Button>
            <Button
              onClick={unstakeTokensInFarm}
              variant="contained"
              color="inherit"
              disabled={loading}
              style={{ width: "200px" }}
            >
              {loading ? <CircularProgress size={24} /> : "Unstake in Farm"}
            </Button>
            <Button
              onClick={claimRewards}
              variant="contained"
              color="primary"
              disabled={loading}
              style={{ width: "200px" }}
            >
              {loading ? <CircularProgress size={24} /> : "Claim Rewards"}
            </Button>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <Paper elevation={3} style={{ marginTop: "40px", padding: "20px", backgroundColor: "#f9f9f9" }}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">📝 How to Use Yield Farming</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ol style={{ marginLeft: "20px", lineHeight: "1.6" }}>
                <li>
                  <strong>Connect Your Wallet:</strong> Use the "Connect Wallet" button above to link your MetaMask wallet.
                </li>
                <li>
                  <strong>Select Network:</strong> Ensure your wallet is connected to the Polygon network for yield farming.
                </li>
                <li>
                  <strong>Obtain LP Tokens:</strong> LP tokens are received when you provide liquidity on a decentralized exchange (e.g., Uniswap or SushiSwap) for any token pair. They represent your share in the liquidity pool.
                </li>
                <li>
                  <strong>Stake LP Tokens:</strong> Enter the amount of LP tokens you wish to stake, then click "Stake in Farm". Confirm the transaction in your wallet.
                </li>
                <li>
                  <strong>Unstake Tokens:</strong> To retrieve your staked tokens, enter the amount and click "Unstake in Farm". Confirm the transaction.
                </li>
                <li>
                  <strong>Claim Rewards:</strong> Once your rewards have accumulated, click "Claim Rewards" to receive them.
                </li>
                <li>
                  <strong>Fees:</strong> A staking fee (as defined by the contract) and gas fees will be applied to each transaction.
                </li>
              </ol>
              <Typography variant="body1" style={{ marginTop: "10px" }}>
                Note: Each transaction requires confirmation in your wallet (e.g., MetaMask).
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Paper>
      </div>
    </section>
  );
};

export default YieldFarming;
