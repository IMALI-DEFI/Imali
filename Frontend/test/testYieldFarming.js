import { ethers } from "ethers";
import YieldFarmingABI from "../utils/YieldFarmingAMOYABI.json"; // Adjust path if needed

const CONTRACT_ADDRESS = "0x84C6DD6F1510bcB94EeFb15e60dB8Cc9A69C460a";
const WALLET_ADDRESS = "0x49C882829D5834d3f12a84dA54bdcfF9ed088B73"; // Replace with your actual wallet

async function testYieldFarming() {
  try {
    // ✅ Connect to MetaMask
    if (!window.ethereum) {
      throw new Error("❌ MetaMask is not installed!");
    }

    console.log("✅ Connecting to Ethereum provider...");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    console.log("✅ Creating contract instance...");
    const contract = new ethers.Contract(CONTRACT_ADDRESS, YieldFarmingABI, signer);

    // ✅ Fetch contract details
    console.log("📡 Fetching contract data...");

    const totalStaked = await contract.totalStaked();
    const rewardRate = await contract.rewardRate();
    const earnedRewards = await contract.earned(WALLET_ADDRESS);

    // ✅ Display Results
    console.log(`💰 Total Staked: ${ethers.formatUnits(totalStaked, 18)} LP`);
    console.log(`⚡ Reward Rate: ${ethers.formatUnits(rewardRate, 18)} IMALI`);
    console.log(`🎁 Earned Rewards: ${ethers.formatUnits(earnedRewards, 18)} IMALI`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Run the test function
testYieldFarming();
