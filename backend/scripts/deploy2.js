const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deploying contracts with the account: ${deployer.address}`);

    // ✅ Placeholder Addresses for IMALI (To Be Updated Later)
    const imaliToken = "0x0000000000000000000000000000000000000000"; // Placeholder for IMALI.e
    const imaliPriceFeed = "0x0000000000000000000000000000000000000000"; // Placeholder for IMALI Chainlink Oracle

    // ✅ Correct Ethereum Mainnet Addresses
    const stablecoin = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC (Ethereum Mainnet)
    const ethPriceFeed = "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419"; // Chainlink ETH/USD Oracle
    const maticPriceFeed = "0x327e23A4855b6F663a28c5161541d69Af8973302"; // Chainlink MATIC/USD Oracle

    // ✅ Deploy the Contract with Correct Syntax
    const IMALILending = await hre.ethers.getContractFactory("IMALILending");
    const imaliLending = await IMALILending.deploy(
        imaliToken,
        stablecoin,
        imaliPriceFeed,
        ethPriceFeed,
        maticPriceFeed
    );

    await imaliLending.waitForDeployment(); // ✅ Fix: Properly wait for deployment confirmation

    const deployedAddress = await imaliLending.getAddress(); // ✅ Get contract address after deployment
    console.log(`✅ IMALI Lending deployed to: ${deployedAddress}`);

    // ✅ Verify the contract on Etherscan
    console.log("Waiting for contract to be mined...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 60s for Etherscan indexing

    console.log("Verifying contract on Etherscan...");
    await hre.run("verify:verify", {
        address: deployedAddress,
        constructorArguments: [
            imaliToken,
            stablecoin,
            imaliPriceFeed,
            ethPriceFeed,
            maticPriceFeed
        ],
    });

    console.log("✅ Contract verified successfully!");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

