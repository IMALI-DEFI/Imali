import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import LendingABI from "./abis/IMALILending.json";
import TokenABI from "./abis/IMALIToken.json";

const lendingAddress = "YOUR_LENDING_CONTRACT_ADDRESS";
const tokenAddress = "YOUR_TOKEN_CONTRACT_ADDRESS";

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [lendingContract, setLendingContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [balance, setBalance] = useState("0");

  useEffect(() => {
    const init = async () => {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const lending = new ethers.Contract(lendingAddress, LendingABI, signer);
      const token = new ethers.Contract(tokenAddress, TokenABI, signer);

      const account = await signer.getAddress();
      const balance = await provider.getBalance(account);

      setProvider(provider);
      setLendingContract(lending);
      setTokenContract(token);
      setAccount(account);
      setBalance(ethers.utils.formatEther(balance));
    };
    init();
  }, []);

  const depositCollateral = async (amount) => {
    const tx = await lendingContract.depositCollateral({
      value: ethers.utils.parseEther(amount),
    });
    await tx.wait();
    alert("Collateral deposited!");
  };

  return (
    <div>
      <h1>IMALI: DeFi Lending</h1>
      <p>Account: {account}</p>
      <p>Balance: {balance} ETH</p>
      <button onClick={() => depositCollateral("0.1")}>
        Deposit 0.1 ETH as Collateral
      </button>
    </div>
  );
}

export default App;
