const { ethers } = require("ethers");
require("dotenv").config();

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const walletAddress = process.env.WALLET_ADDRESS;
const imaliTokenAddress = process.env.IMALITOKEN_ADDRESS;

if (!walletAddress || !imaliTokenAddress) {
    console.error("❌ Missing WALLET_ADDRESS or IMALITOKEN_ADDRESS in .env");
    process.exit(1);
}

const imaliToken = new ethers.Contract(
    imaliTokenAddress,
    ["function balanceOf(address) view returns (uint256)"],
    provider
);

async function checkIMALI() {
    try {
        console.log(`🔍 Checking IMALI balance for: ${walletAddress}`);
        const balance = await imaliToken.balanceOf(walletAddress);
        console.log(`✅ IMALI Balance: ${ethers.formatEther(balance)} IMALI`);
    } catch (error) {
        console.error("❌ Error fetching IMALI balance:", error.message);
    }
}

checkIMALI();
