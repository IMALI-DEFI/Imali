import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import { getContractInstance } from '../getContractInstance';
import { FaInfoCircle, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import stakingBanner from '../assets/images/staking-banner.png';

const Staking = () => {
  const {
    account,
    chainId,
    connectWallet,
    disconnectWallet,
    isConnecting,
    error,
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
      const [imali, lp, walletImali, walletLp] = await Promise.all([
        contracts.staking.imaliStakers(account),
        contracts.staking.lpStakers(account),
        contracts.imaliToken.balanceOf(account),
        contracts.lpToken.balanceOf(account),
      ]);

      const newBalances = {
        imaliStaked: ethers.formatUnits(imali.amount, 18),
        imaliRewards: ethers.formatUnits(imali.rewards, 18),
        lpStaked: ethers.formatUnits(lp.amount, 18),
        lpRewards: ethers.formatUnits(lp.rewards, 18),
        walletImali: ethers.formatUnits(walletImali, 18),
        walletLp: ethers.formatUnits(walletLp, 18),
      };

      const daily = ((parseFloat(newBalances.imaliStaked) * 0.12) + (parseFloat(newBalances.lpStaked) * 0.18)) / 365;
      setBalances(newBalances);
      setEstimates({ daily: daily.toFixed(4), weekly: (daily * 7).toFixed(4) });
    } catch (err) {
      console.error('Error fetching balances:', err);
      setStatus({ message: 'Error fetching balances', type: 'error' });
    }
  }, [contracts, account]);

  useEffect(() => { initContracts(); }, [initContracts]);
  useEffect(() => { if (initialized) fetchData(); }, [initialized, fetchData]);

  const handleStake = async (type) => {
    if (!account || loading) return;
    setLoading(true);
    try {
      const amount = ethers.parseUnits(inputs[type], 18);
      const token = type === 'imali' ? contracts.imaliToken : contracts.lpToken;
      const stakeFn = type === 'imali' ? contracts.staking.stakeIMALI : contracts.staking.stakeLP;

      const allowance = await token.allowance(account, contracts.staking.address);
      if (allowance < amount) await token.approve(contracts.staking.address, amount);
      const tx = await stakeFn(amount, []);
      await tx.wait();
      await fetchData();
      setInputs({ ...inputs, [type]: '' });
    } catch (err) {
      console.error('Stake error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async (type) => {
    if (!account || loading) return;
    setLoading(true);
    try {
      const amount = ethers.parseUnits(inputs[`unstake${type.charAt(0).toUpperCase() + type.slice(1)}`], 18);
      const unstakeFn = type === 'imali' ? contracts.staking.unstakeIMALI : contracts.staking.unstakeLP;
      const tx = await unstakeFn(amount);
      await tx.wait();
      await fetchData();
      setInputs({ ...inputs, [`unstake${type.charAt(0).toUpperCase() + type.slice(1)}`]: '' });
    } catch (err) {
      console.error('Unstake error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!account || loading) return;
    setLoading(true);
    try {
      const tx = await contracts.staking.claimRewards();
      await tx.wait();
      await fetchData();
    } catch (err) {
      console.error('Claim error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <img src={stakingBanner} alt="Staking Guide" className="w-full max-w-lg mx-auto mb-6 rounded" />

      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">📈 Stake & Grow with IMALI</h2>
        <p className="text-gray-700 mb-6">
          Whether you're new to DeFi or a seasoned yield farmer, IMALI staking gives you full control to earn, compound, and multiply rewards using NFTs and lock-in options.
        </p>
        <ul className="list-disc pl-6 mb-6 text-gray-600 space-y-2">
          <li><strong>Beginner Friendly:</strong> Intuitive interface and instant feedback for smooth onboarding.</li>
          <li><strong>Advanced Tools:</strong> APY boosts, NFT multipliers, lock duration, and dynamic rewards tailored for pros.</li>
          <li><strong>Real-Time Insights:</strong> Monitor daily/weekly earnings and view all your balances clearly.</li>
          <li><strong>100% On-Chain:</strong> Secure smart contracts running on Polygon & Ethereum.</li>
        </ul>
        <p className="text-sm text-gray-500">Ready to earn? Start by connecting your wallet and staking your tokens!</p>
      </div>

      {status.message && (
        <div className={`p-4 mb-6 rounded-lg flex items-center ${
          status.type === 'success' ? 'bg-green-100 text-green-800' :
          status.type === 'error' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {status.type === 'success' ? <FaCheckCircle className="mr-2" /> : <FaExclamationTriangle className="mr-2" />}
          {status.message}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
          <h3 className="font-bold mb-2">IMALI</h3>
          <p>Staked: {balances.imaliStaked}</p>
          <p>Rewards: {balances.imaliRewards}</p>
          <p>Wallet: {balances.walletImali}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl">
          <h3 className="font-bold mb-2">LP Tokens</h3>
          <p>Staked: {balances.lpStaked}</p>
          <p>Rewards: {balances.lpRewards}</p>
          <p>Wallet: {balances.walletLp}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block mb-2 font-medium">Stake IMALI</label>
          <div className="flex">
            <input
              type="number"
              className="flex-1 border p-2 rounded-l"
              value={inputs.imali}
              onChange={(e) => setInputs({ ...inputs, imali: e.target.value })}
            />
            <button
              onClick={() => handleStake('imali')}
              disabled={loading}
              className="bg-blue-600 text-white px-4 rounded-r"
            >Stake</button>
          </div>
        </div>
        <div>
          <label className="block mb-2 font-medium">Stake LP Tokens</label>
          <div className="flex">
            <input
              type="number"
              className="flex-1 border p-2 rounded-l"
              value={inputs.lp}
              onChange={(e) => setInputs({ ...inputs, lp: e.target.value })}
            />
            <button
              onClick={() => handleStake('lp')}
              disabled={loading}
              className="bg-purple-600 text-white px-4 rounded-r"
            >Stake</button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block mb-2 font-medium">Unstake IMALI</label>
          <div className="flex">
            <input
              type="number"
              className="flex-1 border p-2 rounded-l"
              value={inputs.unstakeImali}
              onChange={(e) => setInputs({ ...inputs, unstakeImali: e.target.value })}
            />
            <button
              onClick={() => handleUnstake('imali')}
              disabled={loading}
              className="bg-red-600 text-white px-4 rounded-r"
            >Unstake</button>
          </div>
        </div>
        <div>
          <label className="block mb-2 font-medium">Unstake LP Tokens</label>
          <div className="flex">
            <input
              type="number"
              className="flex-1 border p-2 rounded-l"
              value={inputs.unstakeLp}
              onChange={(e) => setInputs({ ...inputs, unstakeLp: e.target.value })}
            />
            <button
              onClick={() => handleUnstake('lp')}
              disabled={loading}
              className="bg-red-600 text-white px-4 rounded-r"
            >Unstake</button>
          </div>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={handleClaimRewards}
          disabled={loading}
          className="bg-green-600 text-white py-2 px-6 rounded-lg"
        >💰 Claim All Rewards</button>
      </div>

      <div className="mt-10 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p><strong>Estimated Daily Rewards:</strong> {estimates.daily} tokens</p>
        <p><strong>Estimated Weekly Rewards:</strong> {estimates.weekly} tokens</p>
      </div>
    </div>
  );
};

export default Staking;
