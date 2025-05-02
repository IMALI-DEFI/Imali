import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import { getContractInstance } from '../getContractInstance';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import stakingBanner from '../assets/images/staking-banner.png';

const Staking = () => {
  const { account, chainId, connectWallet, disconnectWallet, isConnecting, error } = useWallet();

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
        imaliStaked: ethers.formatUnits(imali[0], 18),
        imaliRewards: ethers.formatUnits(imali[2], 18),
        lpStaked: ethers.formatUnits(lp[0], 18),
        lpRewards: ethers.formatUnits(lp[2], 18),
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

  const handleAction = async (type, action) => {
    if (!account || loading) return;
    setLoading(true);
    try {
      const key = action === 'stake' ? type : `unstake${type.charAt(0).toUpperCase() + type.slice(1)}`;
      const amount = ethers.parseUnits(inputs[key], 18);
      const token = type === 'imali' ? contracts.imaliToken : contracts.lpToken;
      const contractFn = type === 'imali'
        ? action === 'stake' ? contracts.staking.stakeIMALI : contracts.staking.unstakeIMALI
        : action === 'stake' ? contracts.staking.stakeLP : contracts.staking.unstakeLP;

      if (action === 'stake') {
        const allowance = await token.allowance(account, contracts.staking.address);
        if (allowance < amount) {
          const approveTx = await token.approve(contracts.staking.address, amount);
          await approveTx.wait();
        }
      }

      const tx = await contractFn(amount);
      await tx.wait();
      await fetchData();
      setInputs({ ...inputs, [key]: '' });
    } catch (err) {
      console.error(`${action} error:`, err);
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

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {['imali', 'lp'].map((type) => (
          <div key={type} className="bg-white border p-4 rounded shadow">
            <h3 className="font-semibold mb-2 uppercase">{type} Token</h3>
            <p>Staked: {type === 'imali' ? balances.imaliStaked : balances.lpStaked}</p>
            <p>Rewards: {type === 'imali' ? balances.imaliRewards : balances.lpRewards}</p>
            <p>Wallet: {type === 'imali' ? balances.walletImali : balances.walletLp}</p>
            <div className="flex mt-4 space-x-2">
              <input
                type="number"
                value={inputs[type]}
                onChange={(e) => setInputs({ ...inputs, [type]: e.target.value })}
                placeholder="Amount"
                className="flex-1 border p-2 rounded"
              />
              <button
                onClick={() => handleAction(type, 'stake')}
                className="bg-blue-600 text-white px-4 py-2 rounded"
                disabled={loading}
              >Stake</button>
            </div>
            <div className="flex mt-2 space-x-2">
              <input
                type="number"
                value={inputs[`unstake${type.charAt(0).toUpperCase() + type.slice(1)}`]}
                onChange={(e) => setInputs({ ...inputs, [`unstake${type.charAt(0).toUpperCase() + type.slice(1)}`]: e.target.value })}
                placeholder="Amount"
                className="flex-1 border p-2 rounded"
              />
              <button
                onClick={() => handleAction(type, 'unstake')}
                className="bg-red-600 text-white px-4 py-2 rounded"
                disabled={loading}
              >Unstake</button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mb-6">
        <button
          onClick={handleClaimRewards}
          className="bg-green-600 text-white py-2 px-6 rounded"
          disabled={loading}
        >💰 Claim All Rewards</button>
      </div>

      <div className="bg-yellow-50 p-4 border rounded text-center">
        <p><strong>Estimated Daily Rewards:</strong> {estimates.daily} tokens</p>
        <p><strong>Estimated Weekly Rewards:</strong> {estimates.weekly} tokens</p>
      </div>
    </div>
  );
};

export default Staking;
