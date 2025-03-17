require("dotenv").config();
const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Using deployer account: ${deployer.address}`);

    // ✅ Fetch LP Token Contract
    const lpTokenAddress = process.env.LPTOKEN_AMOY;
    if (!lpTokenAddress) {
        throw new Error("❌ LP Token address is missing from .env file!");
    }
    const lpToken = await hre.ethers.getContractAt("LPToken", lpTokenAddress);
    console.log(`🔗 Connecting to LP Token Contract at ${lpTokenAddress}`);

    // ✅ Mint LP Tokens
    console.log("🚀 Minting LP Tokens...");
    const mintTx = await lpToken.mint(deployer.address, hre.ethers.parseEther("1000"));
    await mintTx.wait();
    console.log("✅ 1,000 LP Tokens Minted!");

    // ✅ Ensure Staking Contract Address Exists
    const stakingAddress = process.env.STAKING_AMOY;
    if (!stakingAddress) {
        throw new Error("❌ Staking contract address is missing from .env file!");
    }
    console.log(`🔗 Staking Contract Address: ${stakingAddress}`);

    // ✅ Approve LP Token for Staking Contract
    console.log("🔓 Approving LP Token for Staking...");
    const approveTx = await lpToken.approve(stakingAddress, hre.ethers.parseEther("1000"));
    await approveTx.wait();
    console.log("✅ LP Tokens Approved for Staking!");
}

main().catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
});
