const { ethers } = require("hardhat");

async function main() {
  const wallet = new ethers.Wallet("2b9792c8040fef501e196f47f87d85984ce61e79688f9c897c6d1aab9ae3cbab"); // Replace with your private key
  console.log("Address:", wallet.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
