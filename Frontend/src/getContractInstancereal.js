import { BrowserProvider, Contract } from "ethers";
import YieldFarmingABI from './utils/YieldFarmingABI.json';
import StakingABI from './utils/StakingABI.json';
import TokenABI from './utils/TokenABI.json';
import LPTokenABI from './utils/LPTokenABI.json';
import IMALendingABI from './utils/LendingABI.json';

const getContractInstance = async (contractType) => {
  try {
    if (!window.ethereum) {
      throw new Error("❌ MetaMask is not installed!");
    }

    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();
    const chainId = network.chainId.toString();
    const polygonChainId = "137";
    const ethereumChainId = "1";

    console.log(`✅ Connected to network: ${chainId}`);
    console.log(`🔍 Requested Contract Type: ${contractType}`);

    const contractAddresses = {
      Lending: process.env.REACT_APP_LENDING_ETHEREUM || "0x9cde4c3943Ab732a2a4fd2CF4c2Ae51B699FB3E2",
      YieldFarming: process.env.REACT_APP_YIELDFARMING_POLYGON || "0x8d24086Cc38ACE7959Fe8138f38f4Bd983f20809",
      Staking: process.env.REACT_APP_STAKING_POLYGON || "0xaEC2ce7978994b508bA54982dd717723673D047a",
      LPToken: process.env.REACT_APP_LPTOKEN_POLYGON || "0xdd80C2DAB30FcEA038819E874BEeBF43c1DaC052",
      Token: process.env.REACT_APP_TOKEN_POLYGON || "0x15d3f466D34DF102383760CCc70f9F970fceAd09",
    };

    const contractABIs = {
      Lending: IMALendingABI,
      YieldFarming: YieldFarmingABI,
      Staking: StakingABI,
      LPToken: LPTokenABI,
      Token: TokenABI,
    };

    if (!contractAddresses[contractType] || !contractABIs[contractType]) {
      throw new Error(`❌ Missing contract address or ABI for ${contractType}! Check your .env file.`);
    }

    // ✅ NETWORK VALIDATION
    const needsEthereum = contractType === "Lending";
    const needsPolygon = ["YieldFarming", "Staking", "LPToken", "Token"].includes(contractType);

    if (needsEthereum && chainId !== ethereumChainId) {
      if (!sessionStorage.getItem("networkWarningEthereum")) {
        alert(`⚠️ Please switch to Ethereum Mainnet to use ${contractType}.`);
        sessionStorage.setItem("networkWarningEthereum", "true"); // Save the warning status
      }
      throw new Error(`❌ ${contractType} is only available on Ethereum Mainnet.`);
    }

    if (needsPolygon && chainId !== polygonChainId) {
      if (!sessionStorage.getItem("networkWarningPolygon")) {
        alert(`⚠️ Please switch to Polygon (Matic) Network to use ${contractType}.`);
        sessionStorage.setItem("networkWarningPolygon", "true"); // Save the warning status
      }
      throw new Error(`❌ ${contractType} is only available on Polygon.`);
    }

    console.log(`✅ Using contract address: ${contractAddresses[contractType]}`);

    const contract = new Contract(contractAddresses[contractType], contractABIs[contractType], signer);
    console.log(`✅ Contract Instance Created for ${contractType}`);
    return contract;
  } catch (error) {
    console.error("❌ Failed to create contract instance:", error.message);
    return null;
  }
};

export default getContractInstance;

