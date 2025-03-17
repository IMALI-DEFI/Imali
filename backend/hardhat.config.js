require("@nomicfoundation/hardhat-toolbox"); // Includes Hardhat plugins for testing, compiling, etc.
require("dotenv").config(); // Load environment variables from .env file
require("@nomicfoundation/hardhat-ethers"); // Integrates ethers.js with Hardhat
require("@openzeppelin/hardhat-upgrades"); // Adds support for upgradeable contracts

module.exports = {
  solidity: {
    version: "0.8.20", // Solidity version
    settings: {
      optimizer: {
        enabled: true, // Enable the Solidity optimizer
        runs: 200,     // Optimize for 200 runs
      },
    },
  },
  networks: {
    // Local Hardhat network for testing
    hardhat: {
      chainId: 31337, // Default chainId for Hardhat network
    },
    // Ethereum Mainnet
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`, // Infura endpoint
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [], // Use private key from .env
    },
    // Ethereum Sepolia Testnet
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`, // Infura endpoint
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [], // Use private key from .env
    },
    // Polygon Mainnet
    polygon: {
      url: "https://polygon-rpc.com/", // Public Polygon RPC endpoint
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [], // Use private key from .env
    },
    // Polygon Amoy Testnet
    amoy: {
      url: `https://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`, // Alchemy endpoint
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [], // Use private key from .env
      gasPrice: 26000000000, // Set a fixed gas price (optional)
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,       // Etherscan API key for Ethereum Mainnet
      sepolia: process.env.ETHERSCAN_API_KEY,       // Etherscan API key for Sepolia Testnet
      polygon: process.env.POLYGONSCAN_API_KEY,     // Polygonscan API key for Polygon Mainnet
      polygonAmoy: process.env.POLYGONSCAN_API_KEY, // Polygonscan API key for Polygon Amoy Testnet
    },
    customChains: [
      {
        network: "polygonAmoy", // Define custom chain for Polygon Amoy
        chainId: 80002,         // Chain ID for Polygon Amoy
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api", // API URL for Polygon Amoy
          browserURL: "https://amoy.polygonscan.com/",    // Browser URL for Polygon Amoy
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",   // Directory for Solidity contracts
    tests: "./test",         // Directory for tests
    cache: "./cache",        // Directory for cache
    artifacts: "./artifacts", // Directory for compiled artifacts
  },
  mocha: {
    timeout: 40000, // Set timeout for Mocha tests (in milliseconds)
  },
};