require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log(`🔹 Deploying on POLYGON network`);
    console.log("🔹 Wallet Address:", deployer.address);

    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Deployer Balance:", ethers.formatUnits(balance, 18), "POLYGON");

    // Deploy IMALIToken
    console.log("🚀 Deploying IMALIToken...");
    const IMALIToken = await ethers.getContractFactory("IMALIToken");
    const imaliToken = await IMALIToken.deploy(deployer.address);
    await imaliToken.waitForDeployment();
    console.log(`✅ IMALIToken deployed at: ${imaliToken.target}`);

    // Deploy LPToken
    console.log("🚀 Deploying LPToken...");
    const LPToken = await ethers.getContractFactory("LPToken");
    const lpToken = await LPToken.deploy();
    await lpToken.waitForDeployment();
    console.log(`✅ LPToken deployed at: ${lpToken.target}`);

    // Deploy IMALIYieldFarming (Fix: Add feeRecipient address)
    console.log("🚀 Deploying IMALIYieldFarming...");
    const IMALIYieldFarming = await ethers.getContractFactory("IMALIYieldFarming");

    // Define a fee recipient address (set to deployer or another wallet)
    const feeRecipient = deployer.address; // ✅ Update this with your intended fee recipient

    const imaliYieldFarming = await IMALIYieldFarming.deploy(
        imaliToken.target, 
        lpToken.target, 
        feeRecipient
    );

    await imaliYieldFarming.waitForDeployment();
    console.log(`✅ IMALIYieldFarming deployed at: ${imaliYieldFarming.target}`);
}

main().catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
});
