const { ethers } = require("ethers");
const IMALILendingABI = require("../src/utils/IMALILendingABI.json");

const contractAddress = "YOUR_CONTRACT_ADDRESS";
const provider = new ethers.providers.JsonRpcProvider("YOUR_RPC_URL"); // Replace with correct RPC URL
const contract = new ethers.Contract(contractAddress, IMALILendingABI.abi, provider);

const testBalance = async () => {
  try {
    const walletAddress = "YOUR_WALLET_ADDRESS"; // Replace with actual wallet address
    const balance = await contract.balanceOf(walletAddress);
    console.log(`Balance of ${walletAddress}:`, ethers.utils.formatEther(balance), "Tokens");
  } catch (error) {
    console.error("Error fetching balance in standalone script:", error);
  }
};

testBalance();
