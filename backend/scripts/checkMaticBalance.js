const { ethers } = require("ethers");
require("dotenv").config();

// Connect to Polygon RPC
const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);

async function checkMaticBalance() {
    try {
        if (!process.env.WALLET_ADDRESS) {
            throw new Error("WALLET_ADDRESS is not defined in .env file");
        }
        
        // Fetch MATIC balance
        const balance = await provider.getBalance(process.env.WALLET_ADDRESS);
        console.log(`MATIC Balance: ${ethers.formatEther(balance)} MATIC`);
    } catch (error) {
        console.error("❌ Error fetching MATIC balance:", error.message);
    }
}

checkMaticBalance();