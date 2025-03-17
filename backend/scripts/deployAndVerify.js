const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting deployment and verification of IMALILending on Ethereum...");

    // Define constructor arguments for IMALILending
    const constructorArgs = [
        "0x24C2EfDC90286f6fd14FA7B07e4a74f0828548C7", // _stablecoin
    ];

    // Get the contract factory
    const Lending = await ethers.getContractFactory("IMALILending");
    console.log("🚀 Deploying IMALILending contract...");

    // Deploy the contract
    const lendingContract = await Lending.deploy(...constructorArgs);
    await lendingContract.waitForDeployment();
    const contractAddress = await lendingContract.getAddress();
    console.log(`✅ IMALILending deployed at: ${contractAddress}`);

    // Wait for 60 seconds to ensure the deployment is confirmed
    console.log("⏳ Waiting 60 seconds for confirmations...");
    await new Promise((resolve) => setTimeout(resolve, 60000));

    // Verify the contract on Etherscan
    console.log(`🔍 Verifying IMALILending at: ${contractAddress}...`);
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: constructorArgs,
        });
        console.log(`✅ Verified: IMALILending at: ${contractAddress}`);
    } catch (error) {
        console.error(`❌ Failed to verify IMALILending:`, error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });