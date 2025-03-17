const { ethers } = require("ethers");
require("dotenv").config();

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const yieldFarm = new ethers.Contract(
    process.env.YIELD_FARM_CONTRACT, 
    ["function stakedLpTokens(address) public view returns (uint256)"],
    provider
);

async function checkMyStakedLP() {
    try {
        const balance = await yieldFarm.stakedLpTokens(process.env.WALLET_ADDRESS);
        console.log(`Your Staked LP Tokens: ${ethers.formatEther(balance)} LP`);
    } catch (error) {
        console.error("❌ Error checking your staked LP:", error.message);
    }
}

checkMyStakedLP();
