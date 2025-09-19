// src/components/AdminPanel.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getContractInstance } from "../getContractInstance";
import { useWallet } from "../context/WalletContext";
import TxActionButton from "./TxActionButton";
import { TreasuryAPI, FeesAPI, CexAPI, StocksAPI } from "../utils/adminApi"; // ensure file exists

const TABS = ["Treasury", "Fees", "CEX Funding", "Stocks", "Users"];

export default function AdminPanel() {
  const { account, provider } = useWallet();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(TABS[0]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!account) { if (mounted) { setError("Connect your wallet to continue."); setChecking(false); } return; }

        let onChainOwner = null;
        try {
          const token = await getContractInstance("Token");
          if (token && typeof token.owner === "function") {
            onChainOwner = (await token.owner()).toLowerCase();
          }
        } catch {}

        const envOwner = (process.env.REACT_APP_OWNER_ADDRESS || "").toLowerCase();
        const current = account.toLowerCase();
        const allowed = (!!onChainOwner && current === onChainOwner) || (!!envOwner && current === envOwner);

        if (mounted) { setIsOwner(!!allowed); setChecking(false); }
      } catch (e) {
        if (mounted) { setError(e?.message || "Owner check failed."); setChecking(false); }
      }
    })();
    return () => { mounted = false; };
  }, [account]);

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Verifying owner access…</h2>
          <p className="text-white/70">Checking contract ownership and wallet.</p>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-900 text-white px-6">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-extrabold mb-2">403 — Owner Only</h2>
          <p className="text-white/70 mb-6">{error || "This area is restricted to the project owner."}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate("/")} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold">Go Home</button>
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 via-yellow-300 to-pink-300 bg-clip-text text-transparent mb-6">
          Admin Panel
        </h1>

        <div className="flex gap-2 mb-6">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 rounded-xl border ${tab === t ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === "Treasury" && <TreasurySection provider={provider} />}
        {tab === "Fees" && <FeesSection />}
        {tab === "CEX Funding" && <CexSection />}
        {tab === "Stocks" && <StocksSection />}
        {tab === "Users" && <UsersSection />}
      </div>
    </div>
  );
}

function TreasurySection({ provider }) {
  const [bbToken, setBbToken] = useState("");
  const [bbUsd, setBbUsd] = useState("");
  const [liqA, setLiqA] = useState("");
  const [liqB, setLiqB] = useState("");
  const [amtA, setAmtA] = useState("");
  const [amtB, setAmtB] = useState("");

  const runBuybackOnChain = async () => {
    if (!provider) throw new Error("No provider");
    const treasury = await getContractInstance("Treasury", provider.getSigner());
    const amount = Math.floor(Number(bbUsd || 0) * 1e6); // 6d USD
    const tx = await treasury.buyback(bbToken, amount);
    await tx.wait();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-xl font-bold mb-2">Buyback</h3>
        <div className="space-y-3">
          <input placeholder="Token address (DEX)" value={bbToken} onChange={e=>setBbToken(e.target.value)} className="w-full p-3 rounded-xl bg-black/30 border border-white/10" />
          <input placeholder="Amount (USD, optional)" value={bbUsd} onChange={e=>setBbUsd(e.target.value)} className="w-full p-3 rounded-xl bg-black/30 border border-white/10" />
          <div className="flex gap-3 flex-wrap">
            <TxActionButton className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => TreasuryAPI.runBuyback({ token: bbToken, amountUsd: Number(bbUsd) || undefined })}>
              Run Buyback (API)
            </TxActionButton>
            <TxActionButton className="bg-indigo-600 hover:bg-indigo-700" onClick={runBuybackOnChain}>
              Run Buyback (On-chain)
            </TxActionButton>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-xl font-bold mb-2">Add Liquidity</h3>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Token A" value={liqA} onChange={e=>setLiqA(e.target.value)} className="w-full p-3 rounded-xl bg-black/30 border border-white/10 col-span-2" />
          <input placeholder="Amount A" value={amtA} onChange={e=>setAmtA(e.target.value)} className="w-full p-3 rounded-xl bg-black/30 border border-white/10" />
          <input placeholder="Amount B" value={amtB} onChange={e=>setAmtB(e.target.value)} className="w-full p-3 rounded-xl bg-black/30 border border-white/10" />
        </div>
        <div className="mt-3">
          <TxActionButton className="bg-purple-600 hover:bg-purple-700"
            onClick={() => TreasuryAPI.addLiquidity({ tokenA: liqA, tokenB: liqB || "WETH", amountA: amtA, amountB: amtB })}>
            Add Liquidity (API)
          </TxActionButton>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:col-span-2">
        <h3 className="text-xl font-bold mb-2">Distribute Fees</h3>
        <p className="text-white/70 mb-3">Route accumulated protocol fees to recipients.</p>
        <TxActionButton className="bg-amber-600 hover:bg-amber-700" onClick={() => TreasuryAPI.distributeFees()}>
          Distribute Fees
        </TxActionButton>
      </div>
    </div>
  );
}

function FeesSection() {
  const [bps, setBps] = useState("");
  const [recipient, setRecipient] = useState("");
  const [sweepToken, setSweepToken] = useState("");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-xl font-bold mb-2">Set Fee BPS</h3>
        <div className="flex gap-3">
          <input placeholder="BPS (e.g., 300 = 3%)" value={bps} onChange={e=>setBps(e.target.value)} className="flex-1 p-3 rounded-xl bg-black/30 border border-white/10" />
          <TxActionButton className="bg-indigo-600 hover:bg-indigo-700" onClick={() => FeesAPI.setFeeBps({ bps: Number(bps) })}>Save</TxActionButton>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-xl font-bold mb-2">Set Fee Recipient</h3>
        <div className="flex gap-3">
          <input placeholder="0xRecipient" value={recipient} onChange={e=>setRecipient(e.target.value)} className="flex-1 p-3 rounded-xl bg-black/30 border border-white/10" />
          <TxActionButton className="bg-indigo-600 hover:bg-indigo-700" onClick={() => FeesAPI.setRecipient({ recipient })}>Save</TxActionButton>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:col-span-2">
        <h3 className="text-xl font-bold mb-2">Sweep Tokens</h3>
        <div className="flex gap-3">
          <input placeholder="Token (optional — native if blank)" value={sweepToken} onChange={e=>setSweepToken(e.target.value)} className="flex-1 p-3 rounded-xl bg-black/30 border border-white/10" />
          <TxActionButton className="bg-amber-600 hover:bg-amber-700" onClick={() => FeesAPI.sweep({ token: sweepToken || undefined })}>Sweep</TxActionButton>
        </div>
      </div>
    </div>
  );
}

function CexSection() {
  const [asset, setAsset] = useState("USDT");
  const [chain, setChain] = useState("POLYGON");
  const [dest, setDest] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-xl font-bold mb-2">Create CEX Funding Request</h3>
      <p className="text-white/70 mb-4">Creates a request for ops to sign/execute offline (multi-approval supported).</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input value={asset} onChange={e=>setAsset(e.target.value)} placeholder="Asset (USDT)" className="p-3 rounded-xl bg-black/30 border border-white/10" />
        <input value={chain} onChange={e=>setChain(e.target.value)} placeholder="Chain (POLYGON)" className="p-3 rounded-xl bg-black/30 border border-white/10" />
        <input value={dest} onChange={e=>setDest(e.target.value)} placeholder="Destination address" className="p-3 rounded-xl bg-black/30 border border-white/10 md:col-span-2" />
        <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Amount" className="p-3 rounded-xl bg-black/30 border border-white/10" />
        <input value={memo} onChange={e=>setMemo(e.target.value)} placeholder="Memo (optional)" className="p-3 rounded-xl bg-black/30 border border-white/10" />
      </div>
      <div className="mt-3">
        <TxActionButton className="bg-emerald-600 hover:bg-emerald-700" onClick={() => CexAPI.requestFunding({ asset, chain, dest, amount, memo: memo || undefined })}>
          Submit Request
        </TxActionButton>
      </div>
      <p className="text-xs text-amber-300 mt-3">Never handle CEX withdrawal secrets in the browser.</p>
    </div>
  );
}

function StocksSection() {
  const [risk, setRisk] = useState({ accountRiskPct: "", maxPositionPct: "", stopLossPct: "", takeProfitPct: "" });
  const [status, setStatus] = useState({ running: false, positions: 0 });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await StocksAPI.getStatus();
        setStatus(data);
      } catch {}
    })();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-xl font-bold mb-2">Bot Control</h3>
        <div className="flex gap-3 flex-wrap">
          <TxActionButton className="bg-amber-600 hover:bg-amber-700" onClick={() => StocksAPI.pause()}>Pause</TxActionButton>
          <TxActionButton className="bg-emerald-600 hover:bg-emerald-700" onClick={() => StocksAPI.resume()}>Resume</TxActionButton>
          <TxActionButton className="bg-rose-600 hover:bg-rose-700" onClick={() => StocksAPI.flatAll()}>Emergency: Flat All</TxActionButton>
        </div>
        <div className="mt-3 text-sm text-white/70">Status: {status.running ? "Running" : "Paused"} · Open positions: {status.positions}</div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-xl font-bold mb-2">Risk Parameters</h3>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Account Risk %" value={risk.accountRiskPct} onChange={e=>setRisk(r=>({...r, accountRiskPct:e.target.value}))} className="p-3 rounded-xl bg-black/30 border border-white/10" />
          <input placeholder="Max Pos %" value={risk.maxPositionPct} onChange={e=>setRisk(r=>({...r, maxPositionPct:e.target.value}))} className="p-3 rounded-xl bg-black/30 border border-white/10" />
          <input placeholder="Stop Loss %" value={risk.stopLossPct} onChange={e=>setRisk(r=>({...r, stopLossPct:e.target.value}))} className="p-3 rounded-xl bg-black/30 border border-white/10" />
          <input placeholder="Take Profit %" value={risk.takeProfitPct} onChange={e=>setRisk(r=>({...r, takeProfitPct:e.target.value}))} className="p-3 rounded-xl bg-black/30 border border-white/10" />
        </div>
        <div className="mt-3">
          <TxActionButton className="bg-indigo-600 hover:bg-indigo-700" onClick={() => StocksAPI.updateRisk({
            accountRiskPct: num(risk.accountRiskPct),
            maxPositionPct: num(risk.maxPositionPct),
            stopLossPct: num(risk.stopLossPct),
            takeProfitPct: num(risk.takeProfitPct),
          })}>Save Risk</TxActionButton>
        </div>
      </div>
    </div>
  );
}

function UsersSection() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-xl font-bold mb-2">Users</h3>
      <p className="text-white/70 mb-4">Adjust tiers, manage refunds, and airdrops.</p>
      <div className="flex gap-3 flex-wrap">
        <TxActionButton className="bg-purple-600 hover:bg-purple-700" onClick={() => Promise.resolve()}>Airdrop IMALI</TxActionButton>
        <TxActionButton className="bg-amber-600 hover:bg-amber-700" onClick={() => Promise.resolve()}>Update Tier</TxActionButton>
      </div>
    </div>
  );
}

function num(v){ const n=Number(v); return Number.isFinite(n)?n:undefined; }