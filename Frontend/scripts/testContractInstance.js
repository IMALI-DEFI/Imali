import { ethers } from 'ethers';
import getContractInstance from '../src/utils/getContractInstance';

const testFetchBalance = async () => {
  try {
    console.log("🚀 Initializing contract...");
    
    // Get contract instance
    const contract = getContractInstance();
    if (!contract) {
      console.error("❌ Contract instance is null.");
      return;
    }

    // Request wallet connection
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const walletAddress = await signer.getAddress();

    console.log("✅ Wallet Address:", walletAddress);

    // Fetch balance from contract
    console.log("🔍 Fetching balance...");
    const fetchedBalance = await contract.balanceOf(walletAddress);
    
    console.log("✅ Balance:", ethers.formatEther(fetchedBalance), "ETH");
  } catch (error) {
    console.error("❌ Error fetching balance:", error);
  }
};

// Call the function when script loads
testFetchBalance();
