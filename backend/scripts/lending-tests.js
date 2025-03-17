const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IMALILending Tests", function () {
    let imaliToken, stablecoin, lending, imaliPriceFeed, ethPriceFeed, maticPriceFeed;
    let owner, user;

    before(async () => {
        [owner, user] = await ethers.getSigners();

        // Deploy IMALI Token
        const IMALI = await ethers.getContractFactory("IMALIToken");
        imaliToken = await IMALI.deploy();
        await imaliToken.deployed();
        console.log("✅ IMALI Token deployed at:", imaliToken.address);

        // Deploy Mock Stablecoin (USDC/DAI)
        const Stablecoin = await ethers.getContractFactory("MockStablecoin");
        stablecoin = await Stablecoin.deploy();
        await stablecoin.deployed();
        console.log("✅ Stablecoin deployed at:", stablecoin.address);

        // Deploy Mock Price Feeds
        const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
        imaliPriceFeed = await MockPriceFeed.deploy(50000000000); // 50 USDC
        ethPriceFeed = await MockPriceFeed.deploy(2000000000000); // 2000 USDC
        maticPriceFeed = await MockPriceFeed.deploy(100000000000); // 1 USDC
        await imaliPriceFeed.deployed();
        await ethPriceFeed.deployed();
        await maticPriceFeed.deployed();
        console.log("✅ IMALI Price Feed deployed at:", imaliPriceFeed.address);
        console.log("✅ ETH Price Feed deployed at:", ethPriceFeed.address);
        console.log("✅ MATIC Price Feed deployed at:", maticPriceFeed.address);

        // 🛑 Log the arguments before deployment
        console.log("🚀 Deploying IMALILending with:");
        console.log("IMALI Address:", imaliToken.address);
        console.log("Stablecoin Address:", stablecoin.address);
        console.log("IMALI PriceFeed Address:", imaliPriceFeed.address);
        console.log("ETH PriceFeed Address:", ethPriceFeed.address);
        console.log("MATIC PriceFeed Address:", maticPriceFeed.address);

        // Deploy Lending Contract with Constructor Arguments
        const Lending = await ethers.getContractFactory("IMALILending");
        lending = await Lending.deploy(
            imaliToken.address,
            stablecoin.address,
            imaliPriceFeed.address,
            ethPriceFeed.address,
            maticPriceFeed.address
        );
        await lending.deployed();
        console.log("✅ IMALILending deployed at:", lending.address);
    });

    it("Should allow lending tokens by the owner", async () => {
        expect(await lending.imaliToken()).to.equal(imaliToken.address);
        expect(await lending.stablecoin()).to.equal(stablecoin.address);
    });
});
