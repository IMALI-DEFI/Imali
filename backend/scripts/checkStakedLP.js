const { ethers } = require("ethers");
require("dotenv").config();

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const lpToken = new ethers.Contract(
    process.env.LP_TOKEN_ADDRESS,
    ["function balanceOf(address) view returns (uint256)"],
    provider
);

async function checkStakedLP() {
    try {
        const contractAddress = process.env.YIELD_FARM_CONTRACT;
        const balance = await lpToken.balanceOf(contractAddress);
        console.log(`LP Tokens Staked in Contract: ${ethers.formatEther(balance)} LP`);
    } catch (error) {
        console.error("❌ Error checking staked LP balance:", error.message);
    }
}

checkStakedLP();
