const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IMALI Lending Tests", function () {
    let imaliToken, staking, yieldFarm, owner, user;

    before(async () => {
        [owner, user] = await ethers.getSigners();

        // 🚀 Deploy IMALI Token
        const IMALI = await ethers.getContractFactory("IMALIToken");
        imaliToken = await IMALI.deploy(owner.address);
        await imaliToken.waitForDeployment();
        console.log(`✅ IMALI Token deployed at: ${await imaliToken.getAddress()}`);

        // 🚀 Deploy Staking Contract (Pass IMALI token and fee recipient)
        const Staking = await ethers.getContractFactory("IMALIStaking");
        staking = await Staking.deploy(await imaliToken.getAddress(), owner.address);  // ✅ Fix: Pass two arguments
        await staking.waitForDeployment();
        console.log(`✅ Staking contract deployed at: ${await staking.getAddress()}`);

        // 🚀 Deploy Yield Farming Contract (Pass IMALI and Staking contract)
        const YieldFarm = await ethers.getContractFactory("IMALIYieldFarming"); // ✅ Corrected name

        yieldFarm = await YieldFarm.deploy(
            await imaliToken.getAddress(),
            await staking.getAddress(),
            await owner.getAddress()  // ✅ Ensure you pass the required fee recipient
        );
        await yieldFarm.waitForDeployment();
        console.log(`✅ Yield Farming contract deployed at: ${await yieldFarm.getAddress()}`);
        


        // 🚀 Transfer IMALI tokens to staking contract for rewards
        // 🚀 Mint More IMALI Tokens First (before transferring)
        await imaliToken.connect(owner).mint(owner.address, ethers.parseEther("50000"));  // ✅ Mint extra tokens
        await imaliToken.connect(owner).mint(user.address, ethers.parseEther("5000"));    // ✅ Mint tokens to user

        // 🚀 Transfer IMALI tokens to staking contract for rewards
        await imaliToken.connect(owner).transfer(await staking.getAddress(), ethers.parseEther("20000"));  // ✅ Increased transfer amount

        console.log("✅ Transferred 10,000 IMALI to Staking Contract.");
    });

    it("User should be able to stake IMALI tokens", async () => {
        await imaliToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("500"));
        await staking.connect(user).stake(ethers.parseEther("500"));  // ✅ Use correct function name

        
        const userBalance = await staking.stakedAmount(user.address);  // ✅ Use correct mapping name

        expect(userBalance).to.equal(ethers.parseEther("475"));  // ✅ Adjust expected balance after 5% fee

    });
});
