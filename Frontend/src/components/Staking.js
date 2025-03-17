import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";
import {
  Button,
  CircularProgress,
  TextField,
  Select,
  MenuItem,
  Typography,
  Paper,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const Staking = () => {
  const { walletAddress, connectWallet, resetWallet, loading, setLoading } = useWallet();
  const web3ModalRef = useRef();

  // Contract instances
  const [stakingContract, setStakingContract] = useState(null);
  const [lpTokenContract, setLpTokenContract] = useState(null);
  const [imaliTokenContract, setImaliTokenContract] = useState(null);

  // Staking and reward data
  const [stakingData, setStakingData] = useState({
    stakedLP: "0",
    stakedIMALI: "0",
    totalStakedLP: "0",
    totalStakedIMALI: "0",
    rewardBalance: "0",
    apy: "0",
  });
  // User token balances
  const [lpBalance, setLpBalance] = useState("0");
  const [imaliBalance, setImaliBalance] = useState("0");

  // Form states for staking actions
  const [stakeType, setStakeType] = useState("LP"); // Options: "LP" or "IMALI"
  const [amountToStake, setAmountToStake] = useState("");
  const [unstakeType, setUnstakeType] = useState("LP");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [error, setError] = useState("");

  // State for asset prices (for display purposes)
  const [assetPrices, setAssetPrices] = useState({});

  // Mapping of asset symbols to token addresses (ensure these are the correct token addresses)
  const tokenAddresses = {
    ETH: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419",
    USDC: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
    DAI: "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9",
    WBTC: "0xdeb288F737066589598e9214E782fa5A8eD689e8",
    LUSD: "0x9dfc79Aaeb5bb0f96C6e9402671981CdFc424052",
    MATIC: "0x327e23A4855b6F663a28c5161541d69Af8973302",
    LINK: "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c",
    AAVE: "0x547a514d5e3769680Ce22B2361c10Ea13619e8a9",
    UNI: "0x553303d460EE0afB37EdFf9bE42922D8FF63220e",
  };

  // Assets to display on the page
  const assets = [
    { name: "ETH", symbol: "ETH", icon: <Typography variant="h6">Ξ</Typography> },
    { name: "USDC", symbol: "USDC", icon: <Typography variant="h6">$</Typography> },
    { name: "DAI", symbol: "DAI", icon: <Typography variant="h6">$</Typography> },
    { name: "WBTC", symbol: "WBTC", icon: <Typography variant="h6">₿</Typography> },
    { name: "LUSD", symbol: "LUSD", icon: <Typography variant="h6">$</Typography> },
    { name: "MATIC", symbol: "MATIC", icon: <Typography variant="h6">M</Typography> },
    { name: "LINK", symbol: "LINK", icon: <Typography variant="h6">L</Typography> },
    { name: "AAVE", symbol: "AAVE", icon: <Typography variant="h6">A</Typography> },
    { name: "UNI", symbol: "UNI", icon: <Typography variant="h6">U</Typography> },
  ];

  // Check that the user is on a supported network (Ethereum or Polygon).
  const checkNetwork = async () => {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const supportedNetworks = { 1: "Ethereum", 137: "Polygon" };
      if (!supportedNetworks[network.chainId]) {
        if (!sessionStorage.getItem("networkWarning")) {
          alert(`⚠️ Please switch to Ethereum or Polygon to use staking features.`);
          sessionStorage.setItem("networkWarning", "true");
        }
      }
    } catch (error) {
      console.error("Network check failed:", error);
    }
  };

  // Fetch asset prices from Chainlink price feeds.
  const fetchAssetPrices = async () => {
    try {
      const ethereumProvider = new ethers.JsonRpcProvider(process.env.REACT_APP_INFURA_ETHEREUM);
      const polygonProvider = new ethers.JsonRpcProvider(process.env.REACT_APP_INFURA_POLYGON);
      let prices = {};
      for (let symbol in tokenAddresses) {
        const provider = symbol === "MATIC" ? polygonProvider : ethereumProvider;
        const priceFeedABI = [
          "function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)",
        ];
        const priceFeed = new ethers.Contract(tokenAddresses[symbol], priceFeedABI, provider);
        try {
          const roundData = await priceFeed.latestRoundData();
          if (!roundData || roundData.length < 2) {
            console.error(`Invalid price data for ${symbol}`);
            continue;
          }
          const price = roundData[1];
          if (price && price.toString() !== "0") {
            prices[symbol] = ethers.formatUnits(price, 8);
          } else {
            console.warn(`Price for ${symbol} unavailable.`);
          }
        } catch (error) {
          console.warn(`Failed to fetch price for ${symbol}: ${error.message}`);
        }
      }
      setAssetPrices(prices);
    } catch (error) {
      console.error("Error fetching asset prices:", error);
    }
  };

  // Fetch staking data (staked amounts, rewards, APY) from the staking contract.
  const fetchStakingData = async () => {
    if (!stakingContract || !lpTokenContract || !imaliTokenContract || !walletAddress) {
      console.warn("Contracts not initialized yet.");
      return;
    }
    try {
      setLoading(true);
      console.log("Fetching staking data...");
      const [lpStakerData, imaliStakerData, totalStakedLP, totalStakedIMALI, rewardRate] = await Promise.all([
        stakingContract.lpStakers(walletAddress),
        stakingContract.imaliStakers(walletAddress),
        lpTokenContract.balanceOf(await stakingContract.getAddress()),
        imaliTokenContract.balanceOf(await stakingContract.getAddress()),
        stakingContract.lpRewardRate(),
      ]);
      const stakedTotal = parseFloat(ethers.formatUnits(totalStakedLP, 18));
      const rate = parseFloat(ethers.formatUnits(rewardRate, 18));
      const apyValue = stakedTotal > 0 ? ((rate * 365) / stakedTotal) * 100 : 0;
      setStakingData({
        stakedLP: ethers.formatUnits(lpStakerData.amount, 18),
        stakedIMALI: ethers.formatUnits(imaliStakerData.amount, 18),
        totalStakedLP: ethers.formatUnits(totalStakedLP, 18),
        totalStakedIMALI: ethers.formatUnits(totalStakedIMALI, 18),
        rewardBalance: ethers.formatUnits(lpStakerData.rewards + imaliStakerData.rewards, 18),
        apy: apyValue.toFixed(2),
      });
    } catch (error) {
      console.error("Error fetching staking data:", error);
      setError(`Error fetching staking data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch token balances for the user.
  const fetchBalances = async () => {
    if (walletAddress && lpTokenContract && imaliTokenContract) {
      const lpBal = await lpTokenContract.balanceOf(walletAddress);
      const imaliBal = await imaliTokenContract.balanceOf(walletAddress);
      setLpBalance(ethers.formatUnits(lpBal, 18));
      setImaliBalance(ethers.formatUnits(imaliBal, 18));
    }
  };

  // Initialize contracts (staking, LP token, IMALI token).
  const initializeContracts = async () => {
    if (!walletAddress) {
      setError("❌ Wallet not connected");
      return;
    }
    try {
      setLoading(true);
      console.log("Initializing contracts...");
      const staking = await getContractInstance("Staking");
      const lpToken = await getContractInstance("LPToken");
      const imaliToken = await getContractInstance("IMALIToken");
      if (!staking || !lpToken || !imaliToken) {
        throw new Error("Contract initialization failed");
      }
      setStakingContract(staking);
      setLpTokenContract(lpToken);
      setImaliTokenContract(imaliToken);
    } catch (error) {
      console.error("Error initializing contracts:", error);
      setError(error.message || "Contract initialization error");
    } finally {
      setLoading(false);
    }
  };

  // Helper: Set stake amount based on a percentage of available balance.
  const handlePercentageStake = (percentage) => {
    const balance = stakeType === "LP" ? lpBalance : imaliBalance;
    setAmountToStake((parseFloat(balance) * percentage).toString());
  };

  // Handle staking tokens.
  const handleStake = async () => {
    if (!walletAddress || !amountToStake) {
      setError("❌ Connect wallet and enter an amount to stake");
      return;
    }
    if (parseFloat(amountToStake) <= 0) {
      setError("❌ Amount to stake must be greater than 0");
      return;
    }
    try {
      setLoading(true);
      const tokenContract = stakeType === "LP" ? lpTokenContract : imaliTokenContract;
      const stakeFunction = stakeType === "LP" ? "stakeLP" : "stakeIMALI";
      const stakingAddress = await stakingContract.getAddress();
      const amountInWei = ethers.parseUnits(amountToStake, 18);
      const allowance = await tokenContract.allowance(walletAddress, stakingAddress);
      if (ethers.toBigInt(allowance) < ethers.toBigInt(amountInWei)) {
        console.log("Approving tokens...");
        const approveTx = await tokenContract.approve(stakingAddress, amountInWei);
        await approveTx.wait();
        toast.success("Token approval confirmed!");
      }
      console.log("Staking tokens...");
      const stakeTx = await stakingContract[stakeFunction](amountInWei);
      await stakeTx.wait();
      toast.success(`Successfully staked ${amountToStake} ${stakeType} tokens!`);
      fetchStakingData();
      fetchBalances();
    } catch (error) {
      console.error("Staking error:", error);
      setError(error.reason || error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle withdrawing staked tokens.
  const handleWithdraw = async () => {
    if (!stakingContract) {
      setError("Contracts not initialized.");
      return;
    }
    if (!walletAddress || !unstakeAmount) {
      setError("❌ Connect wallet and enter an amount to withdraw");
      return;
    }
    if (parseFloat(unstakeAmount) <= 0) {
      setError("❌ Amount to withdraw must be greater than 0");
      return;
    }
    const balance = unstakeType === "LP" ? stakingData.stakedLP : stakingData.stakedIMALI;
    if (parseFloat(unstakeAmount) > parseFloat(balance)) {
      setError("❌ Insufficient staked balance");
      return;
    }
    try {
      setLoading(true);
      const unstakeFunction = unstakeType === "LP" ? "unstakeLP" : "unstakeIMALI";
      const amountInWei = ethers.parseUnits(unstakeAmount, 18);
      console.log("Unstaking tokens...");
      const unstakeTx = await stakingContract[unstakeFunction](amountInWei);
      await unstakeTx.wait();
      toast.success(`Successfully unstaked ${unstakeAmount} ${unstakeType} tokens!`);
      fetchStakingData();
      fetchBalances();
    } catch (error) {
      console.error("Unstaking error:", error);
      setError(error.reason || error.message);
    } finally {
      setLoading(false);
    }
  };

  // Initialize contracts and fetch data on wallet change.
  useEffect(() => {
    if (walletAddress) {
      initializeContracts().then(() => {
        fetchStakingData();
        fetchBalances();
      });
    }
  }, [walletAddress]);

  if (!walletAddress) {
    return (
      <Paper elevation={3} style={{ padding: "20px", textAlign: "center" }}>
        <Typography variant="h6">
          Please connect your wallet to access the Staking Dashboard.
        </Typography>
        <Button variant="contained" color="primary" onClick={connectWallet} style={{ marginTop: "10px" }}>
          Connect Wallet
        </Button>
      </Paper>
    );
  }

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
        Staking Dashboard
      </Typography>

      {/* How to Use Instructions */}
      <Paper elevation={3} style={{ padding: "20px", marginBottom: "20px" }}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">How to Stake & Yield Farm with IMANI</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ol>
              <li>
                <strong>Connect Your Wallet:</strong> Click "Connect Wallet" to connect your wallet.
              </li>
              <li>
                <strong>Network Check:</strong> Ensure your wallet is on Ethereum (for IMALI tokens) or Polygon (for LP tokens and yield farming).
              </li>
              <li>
                <strong>Obtain LP Tokens:</strong> LP tokens are obtained when you provide liquidity on a DEX (e.g., Uniswap) for any token pair. These tokens represent your share in the liquidity pool.
              </li>
              <li>
                <strong>Select Token Type:</strong> Use the dropdown to choose whether to stake LP tokens or IMALI tokens.
              </li>
              <li>
                <strong>Enter Amount to Stake:</strong> Input the amount you wish to stake or use the percentage buttons (25%, 50%, 100%).
              </li>
              <li>
                <strong>Click "Stake":</strong> Confirm the staking transaction in your wallet.
              </li>
              <li>
                <strong>Withdraw Your Stake:</strong> Enter the amount to withdraw and click "Withdraw". Make sure you have enough staked tokens.
              </li>
              <li>
                <strong>View Your Data:</strong> Your dashboard will display staked amounts, rewards, APY, and your current token balance.
              </li>
              <li>
                <strong>Yield Farming:</strong> For additional rewards, visit the Yield Farming dashboard.
              </li>
            </ol>
            <Typography variant="body1" style={{ marginTop: "10px" }}>
              Note: Each transaction requires confirmation via your wallet (e.g., MetaMask).
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* Staking Form and Data */}
      <Grid container spacing={3} style={{ marginBottom: "20px" }}>
        {/* Staking Form */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} style={{ padding: "20px" }}>
            <Typography variant="h6" gutterBottom>
              Stake Tokens
            </Typography>
            <Select
              value={stakeType}
              onChange={(e) => setStakeType(e.target.value)}
              fullWidth
              style={{ marginBottom: "20px" }}
            >
              <MenuItem value="LP">LP Tokens</MenuItem>
              <MenuItem value="IMALI">IMALI Tokens</MenuItem>
            </Select>
            <TextField
              label="Amount to Stake"
              type="number"
              value={amountToStake}
              onChange={(e) => setAmountToStake(e.target.value)}
              fullWidth
              style={{ marginBottom: "20px" }}
            />
            <Grid container spacing={1} style={{ marginBottom: "20px" }}>
              <Grid item>
                <Button variant="outlined" onClick={() => handlePercentageStake(0.25)}>
                  25%
                </Button>
              </Grid>
              <Grid item>
                <Button variant="outlined" onClick={() => handlePercentageStake(0.5)}>
                  50%
                </Button>
              </Grid>
              <Grid item>
                <Button variant="outlined" onClick={() => handlePercentageStake(1)}>
                  100%
                </Button>
              </Grid>
            </Grid>
            <Button
              variant="contained"
              color="primary"
              onClick={handleStake}
              disabled={loading}
              fullWidth
            >
              {loading ? <CircularProgress size={24} /> : "Stake"}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleWithdraw}
              disabled={loading}
              fullWidth
              style={{ marginTop: "10px" }}
            >
              {loading ? <CircularProgress size={24} /> : "Withdraw"}
            </Button>
            {error && (
              <Typography color="error" style={{ marginTop: "10px" }}>
                {error}
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Staking Data Display */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} style={{ padding: "20px" }}>
            <Typography variant="h6" gutterBottom>
              Your Staking Data
            </Typography>
            <Typography>Staked LP: {stakingData.stakedLP}</Typography>
            <Typography>Staked IMALI: {stakingData.stakedIMALI}</Typography>
            <Typography>Total Rewards: {stakingData.rewardBalance}</Typography>
            <Typography>APY: {stakingData.apy}%</Typography>
            <Typography>
              Your {stakeType} Balance: {stakeType === "LP" ? lpBalance : imaliBalance}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </div>
  );
};

export default Staking;
