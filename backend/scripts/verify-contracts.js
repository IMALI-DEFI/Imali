const hre = require("hardhat");
require("dotenv").config();

async function main() {
    console.log("🚀 Starting contract verification on Polygon...");

    // ✅ Load contract addresses from .env
    const lpTokenAddress = process.env.LPTOKEN_POLYGON;
    const stakingAddress = process.env.STAKING_POLYGON;
    const imaliTokenAddress = process.env.TOKEN_POLYGON;
    const feeRecipient = process.env.FEE_RECIPIENT_POLYGON;

    if (!lpTokenAddress || !stakingAddress || !imaliTokenAddress || !feeRecipient) {
        throw new Error("❌ Missing contract addresses in .env. Please update your .env file.");
    }

    // ✅ Verify LPToken Contract
    console.log(`🔍 Verifying LPToken at ${lpTokenAddress}...`);
    try {
        await hre.run("verify:verify", {
            address: lpTokenAddress,
            constructorArguments: [], // No constructor arguments for LPToken
        });
        console.log("✅ LPToken verified successfully!");
    } catch (error) {
        console.error("❌ LPToken verification failed:", error);
    }

    // ✅ Verify IMALIStaking Contract
    console.log(`🔍 Verifying IMALIStaking at ${stakingAddress}...`);
    try {
        await hre.run("verify:verify", {
            address: stakingAddress,
            constructorArguments: [
                imaliTokenAddress, // IMALI Token
                lpTokenAddress, // LP Token
                feeRecipient, // Fee Recipient
            ],
        });
        console.log("✅ IMALIStaking verified successfully!");
    } catch (error) {
        console.error("❌ IMALIStaking verification failed:", error);
    }

    console.log("🎉 Contract verification process completed!");
}

// Run the verification script
main().catch((error) => {
    console.error("❌ Verification Error:", error);
    process.exit(1);
});
