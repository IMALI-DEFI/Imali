import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import { getContractInstance } from '../getContractInstance';
import { FaInfoCircle, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

const Staking = () => {
  const {
    account,
    chainId,
    error,
    isConnecting,
    connectWallet,
    disconnectWallet,
    getSigner
  } = useWallet();

  const [contracts, setContracts] = useState({ staking: null, imaliToken: null, lpToken: null });
  const [initialized, setInitialized] = useState(false);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [balances, setBalances] = useState({
    imaliStaked: '0', imaliRewards: '0', walletImali: '0',
    lpStaked: '0', lpRewards: '0', walletLp: '0'
  });
  const [inputs, setInputs] = useState({ imali: '', lp: '', unstakeImali: '', unstakeLp: '' });
  const [loading, setLoading] = useState(false);
  const [estimates, setEstimates] = useState({ daily: '0', weekly: '0' });

  const initContracts = useCallback(async () => {
    if (!account || !chainId) return;
    try {
      const staking = await getContractInstance('Staking', { chainId });
      const imaliToken = await getContractInstance('Token', { chainId });
      const lpToken = await getContractInstance('LPToken', { chainId });
      setContracts({ staking, imaliToken, lpToken });
      setInitialized(true);
    } catch (err) {
      console.error('Error initializing contracts:', err);
      setStatus({ message: 'Error initializing contracts', type: 'error' });
    }
  }, [account, chainId]);

  const fetchData = useCallback(async () => {
    if (!contracts.staking || !account) return;
    try {
      const signer = await getSigner();
      const [imali, lp, walletImali, walletLp] = await Promise.all([
        contracts.staking.connect(signer).imaliStakers(account),
        contracts.staking.connect(signer).lpStakers(account),
        contracts.imaliToken.connect(signer).balanceOf(account),
        contracts.lpToken.connect(signer).balanceOf(account),
      ]);

      const newBalances = {
        imaliStaked: ethers.formatUnits(imali.amount, 18),
        imaliRewards: ethers.formatUnits(imali.rewards, 18),
        lpStaked: ethers.formatUnits(lp.amount, 18),
        lpRewards: ethers.formatUnits(lp.rewards, 18),
        walletImali: ethers.formatUnits(walletImali, 18),
        walletLp: ethers.formatUnits(walletLp, 18),
      };

      const daily = (parseFloat(newBalances.imaliStaked) * 0.12 + parseFloat(newBalances.lpStaked) * 0.18) / 365;
      setBalances(newBalances);
      setEstimates({ 
        daily: daily.toFixed(4), 
        weekly: (daily * 7).toFixed(4) 
      });
    } catch (err) {
      console.error('Error fetching balances:', err);
      setStatus({ message: 'Error fetching balances', type: 'error' });
    }
  }, [contracts, account, getSigner]);

  useEffect(() => { initContracts(); }, [initContracts]);
  useEffect(() => { if (initialized) fetchData(); }, [initialized, fetchData]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4 text-purple-700">🤔 What is Staking?</h2>
      <p className="text-gray-700 mb-4">
        Staking is a way to earn passive income from your crypto. By locking your IMALI or LP tokens into a secure smart contract, you help power the network — and in return, you earn rewards like interest!
      </p>

      {/* More component logic (UI, stake/unstake, reward claim) goes here */}

      {status.message && (
        <div className={`p-4 mb-6 rounded-lg ${
          status.type === 'error' ? 'bg-red-100 text-red-700' :
          status.type === 'success' ? 'bg-green-100 text-green-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {status.message}
        </div>
      )}
    </div>
  );
};

export default Staking;
