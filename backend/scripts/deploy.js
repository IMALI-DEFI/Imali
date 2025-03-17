const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log(`🚀 Deploying contracts on ${network} with account: ${deployer.address}`);

  // ✅ Define Network-Specific Addresses
  let imaliTokenAddress, feeRecipient;

  if (network === "polygon") {
    imaliTokenAddress = process.env.TOKEN_POLYGON; // IMALI Token on Polygon
    feeRecipient = process.env.FEE_RECIPIENT_POLYGON;
  } else if (network === "amoy") {
    imaliTokenAddress = process.env.TOKEN_AMOY; // IMALI Token on Amoy Testnet
    feeRecipient = process.env.FEE_RECIPIENT_AMOY;
  } else {
    throw new Error("❌ Unsupported network! Please use Polygon or Amoy.");
  }

  if (!imaliTokenAddress || !feeRecipient) {
    throw new Error("❌ Missing environment variables. Please check your .env file.");
  }

  // 🚀 Deploy LP Token
  console.log("🚀 Deploying LP Token...");
  const LPToken = await hre.ethers.getContractFactory("LPToken");
  const lpToken = await LPToken.deploy();
  await lpToken.waitForDeployment();
  const lpTokenAddress = await lpToken.getAddress();
  console.log(`✅ LP Token deployed at: ${lpTokenAddress}`);

  // 🚀 Deploy IMALI Staking Contract
  console.log("🚀 Deploying IMALI Staking Contract...");
  const IMALIStaking = await hre.ethers.getContractFactory("IMALIStaking");
  const stakingContract = await IMALIStaking.deploy(imaliTokenAddress, lpTokenAddress, feeRecipient);
  await stakingContract.waitForDeployment();
  const stakingAddress = await stakingContract.getAddress();
  console.log(`✅ IMALI Staking deployed at: ${stakingAddress}`);

  // ✅ Update .env File for Future Interactions
  console.log("✍️ Updating .env file...");
  const fs = require("fs");
  const envFile = ".env";

  let envData = fs.readFileSync(envFile, "utf-8");
  envData = envData.replace(
    new RegExp(`LPTOKEN_${network.toUpperCase()}=.*`, "g"),
    `LPTOKEN_${network.toUpperCase()}=${lpTokenAddress}`
  );
  envData = envData.replace(
    new RegExp(`STAKING_${network.toUpperCase()}=.*`, "g"),
    `STAKING_${network.toUpperCase()}=${stakingAddress}`
  );

  fs.writeFileSync(envFile, envData);
  console.log("✅ .env file updated!");

  console.log("🎉 Deployment complete!");
}

main().catch((error) => {
  console.error("❌ Deployment Error:", error);
  process.exit(1);
});
