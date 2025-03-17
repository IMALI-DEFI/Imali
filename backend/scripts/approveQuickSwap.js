const { ethers } = require("ethers");
require("dotenv").config();

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

async function approveQuickSwap() {
    try {
        // Convert addresses to checksum format
        const UNISWAP_ROUTER = ethers.getAddress(process.env.UNISWAP_ROUTER);
        const IMALI_TOKEN = ethers.getAddress(process.env.IMALITOKEN_ADDRESS);

        const imaliToken = new ethers.Contract(
            IMALI_TOKEN,
            ["function approve(address spender, uint256 amount) public returns (bool)"],
            wallet
        );

        console.log("⏳ Approving QuickSwap Router to spend IMALI tokens...");

        const tx = await imaliToken.approve(UNISWAP_ROUTER, ethers.MaxUint256);
        await tx.wait();

        console.log("✅ Approved!");

    } catch (error) {
        console.error("❌ Error approving QuickSwap:", error.message);
    }
}

approveQuickSwap();
