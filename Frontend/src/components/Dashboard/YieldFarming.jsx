// src/components/Dashboard/YieldFarming.jsx
import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet, getContractInstance } from "../../getContractInstance";

export default function YieldFarming() {
  const { account, provider } = useWallet();
  const [stakingContract, setStakingContract] = useState(null);
  const [farmBalance, setFarmBalance] = useState("0");
  const [earnedRewards, setEarnedRewards] = useState("0");
  const [apy, setApy] = useState("0");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState({ message: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [lpBalance, setLpBalance] = useState("0");

  const initContract = useCallback(async () => {
    if (!provider) return;
    try {
      // Uses your Staking contract’s LP functions
      const contract = await getContractInstance("Staking", provider);
      setStakingContract(contract);
    } catch (error) {
      console.error("YieldFarming init error:", error);
      setStatus({ message: "Failed to initialize contract", type: "error" });
    }
  }, [provider]);

  const fetchFarmData = useCallback(async () => {
    if (!stakingContract || !account) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const stakedLPData = await stakingContract.connect(signer).lpStakers(account).catch(() => ({ rewards: 0n }));
      setEarnedRewards(ethers.formatUnits(stakedLPData.rewards || 0n, 18));

      const lpTokenAddress = await stakingContract.lpToken();
      const erc20Abi = ["function balanceOf(address) view returns (uint256)"];
      const lpToken = new ethers.Contract(lpTokenAddress, erc20Abi, signer);

      const [stakedLPToken, userLpBalance, rewardRate] = await Promise.all([
        lpToken.balanceOf(await stakingContract.getAddress()),
        lpToken.balanceOf(account),
        stakingContract.lpRewardRate().catch(() => 0n),
      ]);

      setFarmBalance(ethers.formatUnits(stakedLPToken || 0n, 18));
      setLpBalance(ethers.formatUnits(userLpBalance || 0n, 18));

      const stakedTotal = parseFloat(ethers.formatUnits(stakedLPToken || 0n, 18));
      const rateNum = parseFloat(ethers.formatUnits(rewardRate || 0n, 18));
      const apyValue = stakedTotal > 0 ? ((rateNum * 31536000) / stakedTotal) * 100 : 0;
      setApy(apyValue.toFixed(2));
    } catch (error) {
      console.error("YieldFarming fetch error:", error);
      setStatus({ message: "Failed to fetch farm data", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [stakingContract, account, provider]);

  useEffect(() => { initContract(); }, [initContract]);
  useEffect(() => { fetchFarmData(); }, [fetchFarmData]);

  const handleStakeLP = async () => {
    if (!stakingContract || !amount) { setStatus({ message: "Enter amount", type: "error" }); return; }
    const amountInWei = ethers.parseUnits(amount, 18);
    if (Number(amount) > Number(lpBalance)) { setStatus({ message: "Insufficient LP balance", type: "error" }); return; }
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const lpTokenAddress = await stakingContract.lpToken();
      const erc20Abi = [
        "function allowance(address,address) view returns (uint256)",
        "function approve(address,uint256) returns (bool)"
      ];
      const lpToken = new ethers.Contract(lpTokenAddress, erc20Abi, signer);
      const stakingAddr = await stakingContract.getAddress();
      const allowance = await lpToken.allowance(account, stakingAddr);
      if (allowance < amountInWei) {
        setStatus({ message: "Approving LP...", type: "info" });
        await (await lpToken.approve(stakingAddr, amountInWei)).wait();
      }
      setStatus({ message: "Staking...", type: "info" });
      await (await stakingContract.connect(signer).stakeLP(amountInWei)).wait();
      setStatus({ message: "LP Staked!", type: "success" });
      setAmount(""); await fetchFarmData();
    } catch (e) { setStatus({ message: e?.reason || e?.message || "Stake failed", type: "error" }); }
    finally { setLoading(false); }
  };

  const handleUnstakeLP = async () => {
    if (!stakingContract || !amount) { setStatus({ message: "Enter amount", type: "error" }); return; }
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      await (await stakingContract.connect(signer).unstakeLP(ethers.parseUnits(amount, 18))).wait();
      setStatus({ message: "Unstaked!", type: "success" });
      setAmount(""); await fetchFarmData();
    } catch (e) { setStatus({ message: e?.reason || e?.message || "Unstake failed", type: "error" }); }
    finally { setLoading(false); }
  };

  const handleClaimRewards = async () => {
    if (!stakingContract) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      await (await stakingContract.connect(signer).claimRewards()).wait();
      setStatus({ message: "Rewards claimed!", type: "success" });
      await fetchFarmData();
    } catch (e) { setStatus({ message: e?.reason || e?.message || "Claim failed", type: "error" }); }
    finally { setLoading(false); }
  };

  // No per-component Connect UI — we rely on the header connect.
  if (!account) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm">
        Connect your wallet from the header to start farming.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-600/30 to-emerald-500/20 p-4">
        <div className="text-sm opacity-80">Yield Farming</div>
        <div className="text-2xl font-extrabold tracking-tight">Stake LP • Earn IMALI</div>
        <div className="text-xs opacity-80 mt-1">Gamified visuals. Real rewards.</div>
      </div>

      <div className="grid md:grid-cols-4 gap-3 mb-4">
        <Stat label="Pool APY" value={`${apy}%`} />
        <Stat label="Pool LP" value={farmBalance} />
        <Stat label="My Rewards" value={`${earnedRewards} IMALI`} />
        <Stat label="My LP Balance" value={`${lpBalance} LP`} />
      </div>

      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="grow">
            <label className="block text-xs text-white/70 mb-1">LP Amount</label>
            <input type="number" min="0" step="0.0001" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-black/40 border border-white/15 rounded px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <Action onClick={handleStakeLP}   disabled={loading || !amount}>Stake LP</Action>
            <Action onClick={handleUnstakeLP} disabled={loading || !amount} kind="secondary">Unstake LP</Action>
            <Action onClick={handleClaimRewards} disabled={loading} kind="ghost">Claim</Action>
          </div>
        </div>
        {!!status.message && (
          <div className={`mt-3 text-xs ${status.type === "error" ? "text-rose-300" : status.type === "success" ? "text-emerald-300" : "text-yellow-300"}`}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-lg font-extrabold">{value}</div>
    </div>
  );
}
function Action({ children, onClick, disabled, kind="primary" }) {
  const styles = {
    primary: "bg-emerald-600/80 hover:bg-emerald-600 border-emerald-400/40",
    secondary: "bg-indigo-600/70 hover:bg-indigo-600 border-indigo-400/40",
    ghost: "bg-black/30 hover:bg-black/40 border-white/20",
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-4 py-2 rounded-lg border ${styles[kind]} disabled:opacity-50 disabled:pointer-events-none`}>
      {children}
    </button>
  );
}
