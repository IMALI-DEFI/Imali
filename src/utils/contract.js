import { ethers } from "ethers";
import contractABI from "./contractABI.json";

const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;

const getContractInstance = () => {
  if (!window.ethereum) {
    console.error("Ethereum object not found. Install MetaMask.");
    return null;
  }

  try {
    // Create a provider using ethers' Web3Provider
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    // Return the contract instance
    return new ethers.Contract(contractAddress, contractABI, signer);
  } catch (error) {
    console.error("Failed to create contract instance:", error);
    return null;
  }
};

export default getContractInstance;
