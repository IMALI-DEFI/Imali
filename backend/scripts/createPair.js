require("dotenv").config();
const { ethers } = require("ethers");
const IUniswapV2FactoryABI = require("@uniswap/v2-core/build/IUniswapV2Factory.json").abi;

// ✅ Load environment variables
const {
  INFURA_PROJECT_ID,
  DEPLOYER_PRIVATE_KEY,
  IMALITOKEN_ADDRESS,
  MATIC_ADDRESS,
  UNISWAP_FACTORY
} = process.env;

// ✅ Check for missing variables before running the script
if (!INFURA_PROJECT_ID || !DEPLOYER_PRIVATE_KEY || !IMALITOKEN_ADDRESS || !MATIC_ADDRESS || !UNISWAP_FACTORY) {
  console.error("🚨 Missing required environment variables! Check your .env file.");
  console.error({
    INFURA_PROJECT_ID,
    DEPLOYER_PRIVATE_KEY: DEPLOYER_PRIVATE_KEY ? "✅ Loaded" : "❌ MISSING",
    IMALITOKEN_ADDRESS,
    MATIC_ADDRESS,
    UNISWAP_FACTORY
  });
  process.exit(1);
}

async function createPair() {
  try {
    const provider = new ethers.JsonRpcProvider(`https://polygon-mainnet.infura.io/v3/${INFURA_PROJECT_ID}`);
    const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
    const factory = new ethers.Contract(UNISWAP_FACTORY, IUniswapV2FactoryABI, wallet);

    console.log("🔍 Checking for existing IMALI-MATIC pair...");
    let lpAddress = await factory.getPair(IMALITOKEN_ADDRESS, MATIC_ADDRESS);

    if (lpAddress !== ethers.ZeroAddress) {
      console.log(`✅ LP Token already exists: ${lpAddress}`);
      return;
    }

    console.log("⏳ Creating IMALI-MATIC pair...");
    const tx = await factory.createPair(IMALITOKEN_ADDRESS, MATIC_ADDRESS);
    await tx.wait();

    lpAddress = await factory.getPair(IMALITOKEN_ADDRESS, MATIC_ADDRESS);
    console.log(`✅ Pair created! LP Token Address: ${lpAddress}`);
  } catch (error) {
    console.error("❌ Error creating pair:", error);
  }
}

// ✅ Run script
createPair();
