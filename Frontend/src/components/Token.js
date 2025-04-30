import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";
import { toast } from "react-toastify";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  Chip,
  Divider
} from "@mui/material";
import {
  FaWallet,
  FaExchangeAlt,
  FaCoins,
  FaChartLine,
  FaImage,
  FaCheckCircle
} from "react-icons/fa";

const TokenPage = () => {
  const { account, connectWallet, isConnecting } = useWallet();
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState("0");
  const [nftBalance, setNftBalance] = useState(0);
  const [loading, setLoading] = useState({
    purchase: false,
    nft: false,
    balance: false
  });
  const [selectedTier, setSelectedTier] = useState(null);
  const [networkCorrect, setNetworkCorrect] = useState(false);

  // NFT Tiers - Adjust based on your token economics
  const nftTiers = [
    {
      id: 1,
      name: "Bronze",
      minAmount: "1000",
      image: "/nfts/bronze.png",
      benefits: ["Early access", "Basic rewards"]
    },
    {
      id: 2,
      name: "Silver",
      minAmount: "5000",
      image: "/nfts/silver.png",
      benefits: ["Higher APY", "VIP support"]
    },
    {
      id: 3,
      name: "Gold",
      minAmount: "10000",
      image: "/nfts/gold.png",
      benefits: ["Governance rights", "Exclusive events"]
    }
  ];

  // Check network (Polygon Mainnet)
  const checkNetwork = async () => {
    if (!window.ethereum) return false;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const isCorrect = network.chainId === 137; // Polygon Mainnet
      setNetworkCorrect(isCorrect);
      return isCorrect;
    } catch (err) {
      console.error("Network check failed:", err);
      return false;
    }
  };

  // Fetch token and NFT balances
  const fetchBalances = async () => {
    if (!account) return;
    try {
      setLoading(prev => ({ ...prev, balance: true }));
      
      // Token balance
      const tokenContract = await getContractInstance("Token");
      const tokenBal = await tokenContract.balanceOf(account);
      setBalance(ethers.formatEther(tokenBal));
      
      // NFT balance
      const nftContract = await getContractInstance("NFT");
      const nftBal = await nftContract.balanceOf(account);
      setNftBalance(Number(nftBal));
      
    } catch (err) {
      console.error("Balance fetch error:", err);
      toast.error("Failed to load balances");
    } finally {
      setLoading(prev => ({ ...prev, balance: false }));
    }
  };

  // Handle token purchase
  const handlePurchase = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    const isCorrectNetwork = await checkNetwork();
    if (!isCorrectNetwork) {
      toast.error("Please switch to Polygon Network");
      return;
    }

    try {
      setLoading(prev => ({ ...prev, purchase: true }));
      const contract = await getContractInstance("Token");
      const tx = await contract.buyTokens({
        value: ethers.parseEther(amount)
      });
      await tx.wait();
      toast.success("Tokens purchased successfully!");
      fetchBalances();
      setAmount("");
    } catch (err) {
      console.error("Purchase failed:", err);
      toast.error(err.reason || "Purchase failed");
    } finally {
      setLoading(prev => ({ ...prev, purchase: false }));
    }
  };

  // Handle NFT minting
  const mintNFT = async () => {
    if (!selectedTier) {
      toast.error("Please select an NFT tier");
      return;
    }
    
    try {
      setLoading(prev => ({ ...prev, nft: true }));
      const contract = await getContractInstance("NFT");
      const tx = await contract.mint(account, selectedTier.id);
      await tx.wait();
      toast.success(`${nftTiers.find(t => t.id === selectedTier).name} NFT minted!`);
      fetchBalances();
      setSelectedTier(null);
    } catch (err) {
      console.error("NFT mint failed:", err);
      toast.error(err.reason || "NFT mint failed");
    } finally {
      setLoading(prev => ({ ...prev, nft: false }));
    }
  };

  // Check balances when account changes
  useEffect(() => {
    checkNetwork();
    if (account) {
      fetchBalances();
    }
  }, [account]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Hero Section */}
      <Box textAlign="center" mb={6}>
        <Typography variant="h3" component="h1" gutterBottom>
          <Box component="span" color="primary.main">IMALI</Box> TOKEN
        </Typography>
        <Typography variant="h5" color="text.secondary">
          Join the future of DeFi on Polygon
        </Typography>
      </Box>

      {/* Wallet Connection */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12} md={8}>
              {!account ? (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<FaWallet />}
                  onClick={connectWallet}
                  disabled={isConnecting}
                  fullWidth
                >
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </Button>
              ) : (
                <Box>
                  <Typography variant="body1">
                    Connected: {`${account.slice(0, 6)}...${account.slice(-4)}`}
                  </Typography>
                  <Chip 
                    label={networkCorrect ? "Polygon Network" : "Wrong Network"} 
                    color={networkCorrect ? "success" : "error"} 
                    size="small" 
                    sx={{ mt: 1 }}
                  />
                </Box>
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Your IMALI Balance
                </Typography>
                <Typography variant="h6">
                  {loading.balance ? <CircularProgress size={24} /> : `${balance} IMALI`}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Purchase Section */}
      <Grid container spacing={4}>
        {/* Token Purchase */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                <FaCoins style={{ marginRight: 8 }} />
                Buy IMALI Tokens
              </Typography>
              
              <Stepper activeStep={account ? 1 : 0} alternativeLabel sx={{ mb: 3 }}>
                <Step>
                  <StepLabel>Connect Wallet</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Buy Tokens</StepLabel>
                </Step>
              </Stepper>

              <TextField
                label="Amount in MATIC"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                fullWidth
                margin="normal"
                inputProps={{ min: "0.01", step: "0.01" }}
              />
              
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handlePurchase}
                disabled={!account || loading.purchase}
                startIcon={loading.purchase ? <CircularProgress size={20} /> : <FaExchangeAlt />}
                sx={{ mt: 2 }}
              >
                {loading.purchase ? "Processing..." : "Buy Tokens"}
              </Button>

              <Divider sx={{ my: 3 }} />

              <Typography variant="body2" color="text.secondary">
                <strong>How to buy:</strong>
              </Typography>
              <ol style={{ paddingLeft: 20, marginTop: 8 }}>
                <li>Connect your wallet (MetaMask recommended)</li>
                <li>Ensure you're on Polygon Network</li>
                <li>Enter MATIC amount (1 MATIC = 100 IMALI)</li>
                <li>Confirm transaction in your wallet</li>
              </ol>
            </CardContent>
          </Card>
        </Grid>

        {/* NFT Minting */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                <FaImage style={{ marginRight: 8 }} />
                Exclusive NFT Collection
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Mint limited edition NFTs with special benefits
              </Typography>

              <Grid container spacing={2} sx={{ mt: 2 }}>
                {nftTiers.map(tier => (
                  <Grid item xs={12} sm={4} key={tier.id}>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        cursor: "pointer",
                        borderColor: selectedTier?.id === tier.id ? "primary.main" : "",
                        backgroundColor: selectedTier?.id === tier.id ? "primary.light" : ""
                      }}
                      onClick={() => setSelectedTier(tier)}
                    >
                      <Box textAlign="center">
                        <img 
                          src={tier.image} 
                          alt={tier.name} 
                          style={{ width: 60, height: 60, margin: "0 auto 8px" }} 
                        />
                        <Typography variant="subtitle1">{tier.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Min: {tier.minAmount} IMALI
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {selectedTier && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Benefits:</strong>
                  </Typography>
                  <ul style={{ paddingLeft: 20, marginTop: 4 }}>
                    {selectedTier.benefits.map((benefit, i) => (
                      <li key={i}>{benefit}</li>
                    ))}
                  </ul>
                </Box>
              )}

              <Button
                variant="contained"
                color="secondary"
                size="large"
                fullWidth
                onClick={mintNFT}
                disabled={!selectedTier || loading.nft || nftBalance > 0}
                startIcon={loading.nft ? <CircularProgress size={20} /> : <FaCheckCircle />}
                sx={{ mt: 3 }}
              >
                {nftBalance > 0 ? "Already Minted" : 
                 loading.nft ? "Minting..." : "Mint NFT"}
              </Button>

              <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                Note: You can only mint one NFT per wallet
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* FAQ Section */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" gutterBottom>
          Frequently Asked Questions
        </Typography>
        
        <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            How do I get MATIC for transactions?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You can buy MATIC on exchanges like Binance or Coinbase and withdraw to your Polygon wallet.
            Alternatively, use a fiat on-ramp like Transak or MoonPay directly in MetaMask.
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            When will I receive my NFT?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            NFTs are minted immediately after transaction confirmation. You can view it in your wallet's
            NFT section or on marketplaces like OpenSea.
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            What are the benefits of holding IMALI tokens?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            IMALI tokens give you access to platform governance, staking rewards, fee discounts,
            and exclusive features in the IMALI DeFi ecosystem.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default TokenPage;
