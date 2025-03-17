const { ethers } = require("ethers");
require("dotenv").config();

async function checkBalance() {
  const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
  const WALLET_ADDRESS = process.env.WALLET_ADDRESS;

  // Validate environment variables
  if (!INFURA_PROJECT_ID || !WALLET_ADDRESS) {
    console.error("Missing INFURA_PROJECT_ID or WALLET_ADDRESS in environment variables.");
    return;
  }

  // Use JsonRpcProvider for the Infura URL
  const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`);

  try {
    // Fetch and log the balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    console.log(`Balance of ${WALLET_ADDRESS}: ${ethers.formatEther(balance)} ETH`);
  } catch (error) {
    console.error("Error fetching balance:", error);
  }
}

checkBalance();
