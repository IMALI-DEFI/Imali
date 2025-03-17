import { BrowserProvider, Contract } from "ethers";
import YieldFarmingABI from "./utils/YieldFarmingABI.json";
import StakingABI from "./utils/StakingABI.json";
import TokenABI from "./utils/TokenABI.json";
import LPTokenABI from "./utils/LPTokenABI.json";
import IMALendingABI from "./utils/LendingABI.json";

// Warn if required environment variables are missing.
if (
  !process.env.REACT_APP_LENDING_AMOY ||
  !process.env.REACT_APP_LENDING_POLYGON ||
  !process.env.REACT_APP_LENDING_ETHEREUM
) {
  console.warn("⚠️ Warning: Lending contract addresses are not fully set in .env");
}

const getContractInstance = async (contractType) => {
  try {
    if (!window.ethereum) {
      throw new Error("❌ MetaMask is not installed!");
    }

    // Create provider and signer from window.ethereum.
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();
    const chainId = network.chainId.toString();

    console.log(`✅ Connected to network: ${chainId}`);
    console.log(`🔍 Requested Contract Type: ${contractType}`);

    // Define contract addresses per network.
    const contractAddresses = {
      Lending: {
        80002: process.env.REACT_APP_LENDING_AMOY, // Amoy Testnet
        137: process.env.REACT_APP_LENDING_POLYGON, // Polygon Mainnet
        1: process.env.REACT_APP_LENDING_ETHEREUM,   // Ethereum Mainnet
      },
      YieldFarming: {
        80002: process.env.REACT_APP_YIELDFARMING_AMOY,
        137: process.env.REACT_APP_YIELDFARMING_POLYGON,
        1: process.env.REACT_APP_YIELDFARMING_ETHEREUM,
      },
      Staking: {
        80002: process.env.REACT_APP_STAKING_AMOY,
        137: process.env.REACT_APP_STAKING_POLYGON,
        1: process.env.REACT_APP_STAKING_ETHEREUM,
      },
      LPToken: {
        80002: process.env.REACT_APP_LPTOKEN_AMOY,
        137: process.env.REACT_APP_LPTOKEN_POLYGON,
        1: process.env.REACT_APP_LPTOKEN_ETHEREUM,
      },
      Token: {
        80002: process.env.REACT_APP_TOKEN_AMOY,
        137: process.env.REACT_APP_TOKEN_POLYGON,
        1: process.env.REACT_APP_TOKEN_ETHEREUM,
      },
      IMALIToken: {
        80002: process.env.REACT_APP_TOKEN_AMOY,
        137: process.env.REACT_APP_TOKEN_POLYGON,
        1: process.env.REACT_APP_TOKEN_ETHEREUM,
      },
    };

    // Map contract types to their corresponding ABIs.
    const contractABIs = {
      Lending: IMALendingABI,
      YieldFarming: YieldFarmingABI,
      Staking: StakingABI,
      LPToken: LPTokenABI,
      Token: TokenABI,
      IMALIToken: TokenABI,
    };

    if (!contractAddresses[contractType]) {
      throw new Error(`❌ Unknown contract type: ${contractType}`);
    }

    const selectedAddress = contractAddresses[contractType][chainId];
    if (!selectedAddress) {
      throw new Error(`❌ No contract deployed for ${contractType} on chain ${chainId}.`);
    }

    console.log(`✅ Using contract address: ${selectedAddress}`);
    console.log("🔍 ABI Type:", typeof contractABIs[contractType]);
    console.log("🔍 ABI Content:", contractABIs[contractType]);

    // Create and return the contract instance.
    const contract = new Contract(selectedAddress, contractABIs[contractType], signer);
    console.log(`✅ Contract Instance Created for ${contractType} at ${selectedAddress}`);
    return contract;
  } catch (error) {
    console.error("❌ Failed to create contract instance:", error.message);
    return null;
  }
};

export default getContractInstance;
