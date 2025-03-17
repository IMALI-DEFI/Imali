const { ethers } = require("hardhat");

async function main() {
  const provider = new ethers.providers.JsonRpcProvider("https://sepolia.infura.io/v3/2cf9e431ee684f4aa5bd9ef84a5a8f87"); // Replace with your Infura Project ID
  const network = await provider.getNetwork();
  console.log("Connected to network:", network.name);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
