const { ethers, JsonRpcProvider } = require("ethers");
require("dotenv").config(); // Load .env file

async function checkBalance() {
  const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
  const WALLET_ADDRESS = process.env.WALLET_ADDRESS;

  if (!INFURA_PROJECT_ID || !WALLET_ADDRESS) {
    console.error("❌ Missing INFURA_PROJECT_ID or WALLET_ADDRESS in environment variables.");
    return;
  }

  try {
    // ✅ Fix: Use `new JsonRpcProvider` for ethers.js v6
    const provider = new JsonRpcProvider(`https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`);

    // ✅ Fetch wallet balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    console.log(`✅ Balance of ${WALLET_ADDRESS}: ${ethers.formatEther(balance)} ETH`);
  } catch (error) {
    console.error("❌ Error fetching balance:", error);
  }
}

// Run the script
checkBalance();
