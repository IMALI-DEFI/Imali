import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../../context/WalletContext';
import { getContractInstance } from '../../getContractInstance';
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
        imaliStaked: ethers.utils.formatUnits(imali[0], 18),
        imaliRewards: ethers.utils.formatUnits(imali[2], 18),
        lpStaked: ethers.utils.formatUnits(lp[0], 18),
        lpRewards: ethers.utils.formatUnits(lp[2], 18),
        walletImali: ethers.utils.formatUnits(walletImali, 18),
        walletLp: ethers.utils.formatUnits(walletLp, 18),
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
      const amount = ethers.utils.parseUnits(inputs[key], 18);
      const token = type === 'imali' ? contracts.imaliToken : contracts.lpToken;
      const contractFn = type === 'imali'
        ? action === 'stake' ? contracts.staking.stakeIMALI : contracts.staking.unstakeIMALI
        : action === 'stake' ? contracts.staking.stakeLP : contracts.staking.unstakeLP;

      if (action === 'stake') {
        const allowance = await token.allowance(account, contracts.staking.address);
        if (allowance.lt(amount)) {
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
      setStatus({ 
        message: err.reason || err.message || `${action} failed`, 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!account || loading || !contracts.staking) return;
    setLoading(true);
    try {
      const tx = await contracts.staking.claimRewards();
      await tx.wait();
      await fetchData();
      setStatus({ message: 'Rewards claimed successfully!', type: 'success' });
    } catch (err) {
      console.error('Claim error:', err);
      setStatus({ 
        message: err.reason || err.message || 'Claim failed', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <img src={stakingBanner} alt="Staking Guide" className="w-full max-w-lg mx-auto mb-6 rounded-xl shadow-lg" />

      {status.message && (
        <div className={`mb-6 p-4 rounded-lg ${
          status.type === 'error' ? 'bg-red-100 border-red-300 text-red-800' : 
          status.type === 'success' ? 'bg-green-100 border-green-300 text-green-800' :
          'bg-blue-100 border-blue-300 text-blue-800'
        } border`}>
          <div className="flex items-center">
            {status.type === 'error' ? (
              <FaExclamationTriangle className="mr-2" />
            ) : status.type === 'success' ? (
              <FaCheckCircle className="mr-2" />
            ) : null}
            {status.message}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {['imali', 'lp'].map((type) => (
          <div key={type} className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 p-6 rounded-xl shadow-lg">
            <h3 className="font-bold text-xl mb-4 uppercase text-white">
              {type.toUpperCase()} Token Staking
            </h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Staked:</span>
                <span className="font-bold text-white">
                  {type === 'imali' ? balances.imaliStaked : balances.lpStaked}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Pending Rewards:</span>
                <span className="font-bold text-green-400">
                  {type === 'imali' ? balances.imaliRewards : balances.lpRewards}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Wallet Balance:</span>
                <span className="font-bold text-blue-400">
                  {type === 'imali' ? balances.walletImali : balances.walletLp}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Stake Amount</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={inputs[type]}
                    onChange={(e) => setInputs({ ...inputs, [type]: e.target.value })}
                    placeholder="0.00"
                    className="flex-1 bg-gray-800 border border-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => handleAction(type, 'stake')}
                    className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading || !inputs[type] || parseFloat(inputs[type]) <= 0}
                  >
                    {loading ? 'Processing...' : 'Stake'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Unstake Amount</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={inputs[`unstake${type.charAt(0).toUpperCase() + type.slice(1)}`]}
                    onChange={(e) => setInputs({ ...inputs, [`unstake${type.charAt(0).toUpperCase() + type.slice(1)}`]: e.target.value })}
                    placeholder="0.00"
                    className="flex-1 bg-gray-800 border border-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => handleAction(type, 'unstake')}
                    className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading || !inputs[`unstake${type.charAt(0).toUpperCase() + type.slice(1)}`] || parseFloat(inputs[`unstake${type.charAt(0).toUpperCase() + type.slice(1)}`]) <= 0}
                  >
                    {loading ? 'Processing...' : 'Unstake'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mb-8">
        <button
          onClick={handleClaimRewards}
          className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white py-4 px-12 rounded-xl font-bold text-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || (!parseFloat(balances.imaliRewards) && !parseFloat(balances.lpRewards))}
        >
          {loading ? 'Claiming...' : '💰 Claim All Rewards'}
        </button>
      </div>

      <div className="bg-gradient-to-r from-amber-500 to-yellow-500 p-6 rounded-2xl border border-amber-300 text-center shadow-lg">
        <h3 className="font-bold text-xl mb-4 text-gray-900">Reward Estimates</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-black/30 p-4 rounded-xl">
            <p className="text-sm text-gray-800 font-semibold">Estimated Daily Rewards</p>
            <p className="text-2xl font-bold text-white mt-2">{estimates.daily} tokens</p>
          </div>
          <div className="bg-black/30 p-4 rounded-xl">
            <p className="text-sm text-gray-800 font-semibold">Estimated Weekly Rewards</p>
            <p className="text-2xl font-bold text-white mt-2">{estimates.weekly} tokens</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Staking;
