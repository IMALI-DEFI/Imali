const { ethers } = require("hardhat");

async function main() {
  // Deploy the IMALI Token
  const IMALIToken = await ethers.getContractFactory("IMALIToken");
  const token = await IMALIToken.deploy();
  await token.deployed();
  console.log("IMALIToken deployed to:", token.address);

  // Deploy the IMALI Lending contract
  const IMALILending = await ethers.getContractFactory("IMALILending");
  const lending = await IMALILending.deploy(token.address);
  await lending.deployed();
  console.log("IMALILending deployed to:", lending.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
