const hre = require("hardhat");

async function main() {
    const stakingContractAddress = "0xc01e59f51e2b39451EFbf926beEc4Ddc41168fFA"; // ✅ Update if needed
    const lpTokenAddress = "0x6A60F9401F97949C41926DbFA9c8E08A617c944a"; // ✅ Update if needed

    // ✅ Get Deployer Account
    const [deployer] = await hre.ethers.getSigners();
    console.log(`🚀 Using Deployer Account: ${deployer.address}`);

    // ✅ Connect to LP Token Contract
    const lpToken = await hre.ethers.getContractAt("LPToken", lpTokenAddress);
    
    // ✅ Check LP Token Owner
    const owner = await lpToken.owner();
    console.log(`🔍 LP Token Owner: ${owner}`);
    
    // ✅ Check Allowance
    let allowance = await lpToken.allowance(deployer.address, stakingContractAddress);
    console.log(`🔍 Current Allowance: ${hre.ethers.formatEther(allowance)} LP Tokens`);

    // ✅ Approve If Allowance is Less Than 1000 LP
    if (BigInt(allowance) < hre.ethers.parseEther("1000")) {
        console.log("🔓 Re-approving LP Tokens for Staking...");
        const approveTx = await lpToken.approve(stakingContractAddress, hre.ethers.parseEther("1100"));
        await approveTx.wait();
        console.log("✅ LP Tokens Re-Approved for Staking!");

        // ✅ Verify Allowance After Approval
        allowance = await lpToken.allowance(deployer.address, stakingContractAddress);
        console.log(`🔍 Updated Allowance: ${hre.ethers.formatEther(allowance)} LP Tokens`);
    }

    // ✅ Connect to Staking Contract
    const stakingContract = await hre.ethers.getContractAt("IMALIStaking", stakingContractAddress);

    // ✅ Stake LP Tokens (Using stakeLP Instead of stake)
    console.log("⏳ Staking 1,000 LP Tokens...");
    const stakeTx = await stakingContract.stakeLP(hre.ethers.parseEther("1000"));
    await stakeTx.wait();
    
    console.log("🎉 ✅ Successfully Staked 1,000 LP Tokens!");
}

main().catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
});
