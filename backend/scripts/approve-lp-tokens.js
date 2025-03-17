(async () => {
    const { ethers } = require("hardhat");

    // Define contract addresses
    const lpTokenAddress = "0xdAEdb45Fa2534Bac65c8d0eEaE2D1eC743686e78"; // Your LP Token contract address
    const stakingContractAddress = "0x4d6F69643bF63d0a8E683811F138C4Ea7e8F52DF"; // Staking contract address

    // Get signer
    const [deployer] = await ethers.getSigners();

    // Connect to LP Token contract
    const lpToken = await ethers.getContractAt("LPToken", lpTokenAddress, deployer);

    console.log(`🔗 Connected to LP Token Contract at ${lpTokenAddress}`);

    // Approve LP Token for Staking Contract
    console.log("🔓 Approving LP Token for Staking...");
    const approveTx = await lpToken.approve(stakingContractAddress, ethers.parseEther("1000"));
    await approveTx.wait();
    
    console.log("✅ LP Tokens Approved for Staking!");
})();
