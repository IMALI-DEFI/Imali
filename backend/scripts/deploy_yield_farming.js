const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`🚀 Deploying with account: ${deployer.address}`);

  const imaliTokenAddress = "0x15d3f466D34DF102383760CCc70f9F970fceAd09";  // Existing IMALI Token
  const lpTokenAddress = "0xdd80C2DAB30FcEA038819E874BEeBF43c1DaC052";  // Existing LP Token
  const feeRecipient = "0x49C882829D5834d3f12a84dA54bdcfF9ed088B73"; // Fee recipient

  const IMALIYieldFarming = await hre.ethers.getContractFactory("IMALIYieldFarming");
  const yieldFarming = await IMALIYieldFarming.deploy(imaliTokenAddress, lpTokenAddress, feeRecipient);

  await yieldFarming.waitForDeployment();
  console.log(`✅ IMALIYieldFarming deployed at: ${yieldFarming.target}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
