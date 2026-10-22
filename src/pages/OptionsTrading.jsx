import React, { useEffect, useState } from "react";
import { apiFetch } from "../context/AuthContext";

export default function OptionsTrading({ embedded = false }) {
  const [capability, setCapability] = useState(null);
  const [underlying, setUnderlying] = useState("AAPL");
  const [contracts, setContracts] = useState([]);
  const [selected, setSelected] = useState("");
  const [qty, setQty] = useState(1);
  const [stopLossPct, setStopLossPct] = useState("");
  const [takeProfitPct, setTakeProfitPct] = useState("");
  const [preview, setPreview] = useState(null);
  const [positions, setPositions] = useState([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const cap = await apiFetch("/api/options/capability");
    const pos = await apiFetch("/api/options/positions");
    setCapability(cap.data || null);
    setPositions(Array.isArray(pos.data) ? pos.data : []);
  }

  useEffect(() => {
    load().catch(function (e) { setMessage(e.message); });
  }, []);

  async function search() {
    setBusy("search");
    setMessage("");
    try {
      const path = "/api/options/contracts?underlying_symbols=" +
        encodeURIComponent(underlying.trim().toUpperCase()) + "&limit=100";
      const result = await apiFetch(path);
      const rows = (result.data && result.data.option_contracts) || [];
      setContracts(rows);
      setSelected(rows.length ? rows[0].symbol : "");
      if (!rows.length) setMessage("No active contracts found.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy("");
    }
  }

  async function makePreview() {
    setBusy("preview");
    setMessage("");
    try {
      const result = await apiFetch("/api/options/preview", {
        method: "POST",
        body: JSON.stringify({ symbol: selected, qty: Number(qty), orderType: "market", stopLossPct: Number(stopLossPct), takeProfitPct: Number(takeProfitPct) })
      });
      setPreview(result.data || null);
      setMessage("Preview created. No order has been sent yet.");
      await load();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy("");
    }
  }

  async function approve() {
    if (!preview || !preview.tradeId) return;
    setBusy("approve");
    setMessage("");
    try {
      const result = await apiFetch("/api/options/approve/" + preview.tradeId, {
        method: "POST",
        body: JSON.stringify({})
      });
      const status = result.data && result.data.order ? result.data.order.status : "submitted";
      setMessage("Order approved and sent to Alpaca. Status: " + status);
      setPreview(null);
      await load();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy("");
    }
  }

  async function reconcile() {
    setBusy("reconcile");
    try {
      await apiFetch("/api/options/reconcile", {
        method: "POST",
        body: JSON.stringify({})
      });
      setMessage("Options orders reconciled with Alpaca.");
      await load();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className={embedded ? "text-white" : "min-h-screen bg-[#050816] text-white px-3 sm:px-4 py-5 sm:py-8"}>
      <div className={embedded ? "space-y-4" : "max-w-5xl mx-auto space-y-5 sm:space-y-6"}>
        <div className={embedded ? "rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4" : ""}>
          <h1 className={embedded ? "text-xl font-black" : "text-2xl sm:text-3xl font-bold"}>Options Trading</h1>
          <p className="text-white/60 mt-1 text-sm">
            Find a contract, review the risk, then approve the entry. IMALI manages the exit.
          </p>
        </div>

        {message ? <div className="rounded-xl border border-white/10 bg-white/5 p-4">{message}</div> : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <div className="text-white/50 text-sm">Account</div>
            <div className="font-semibold mt-2">{capability && capability.paper ? "Alpaca Paper" : "Alpaca Live"}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <div className="text-white/50 text-sm">Options Level</div>
            <div className="font-semibold mt-2">{capability ? capability.optionsTradingLevel : "—"}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <div className="text-white/50 text-sm">Buying Power</div>
            <div className="font-semibold mt-2">
              {capability ? "$" + Number(capability.optionsBuyingPower || 0).toLocaleString() : "—"}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <input
              value={underlying}
              onChange={function (e) { setUnderlying(e.target.value); }}
              className="w-full min-w-0 rounded-xl bg-black/30 border border-white/10 px-4 py-3"
              placeholder="AAPL"
            />
            <button
              onClick={search}
              disabled={busy === "search"}
              className="w-full sm:w-auto rounded-xl bg-emerald-600 px-5 py-3 font-semibold disabled:opacity-50"
            >
              {busy === "search" ? "Finding..." : "Find Contracts"}
            </button>
          </div>

          <select
            value={selected}
            onChange={function (e) { setSelected(e.target.value); }}
            className="w-full rounded-xl bg-[#0b1020] border border-white/10 px-4 py-3"
          >
            <option value="">Choose a contract</option>
            {contracts.map(function (item) {
              return (
                <option key={item.id || item.symbol} value={item.symbol}>
                  {item.symbol + " · " + item.type + " · strike " + item.strike_price + " · " + item.expiration_date}
                </option>
              );
            })}
          </select>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="number"
              min="1"
              max="50"
              value={qty}
              onChange={function (e) { setQty(e.target.value); }}
              className="rounded-xl bg-black/30 border border-white/10 px-4 py-3"
              aria-label="Contracts"
            />
            <input
              type="number"
              min="1"
              max="99"
              value={stopLossPct}
              onChange={function (e) { setStopLossPct(e.target.value); }}
              className="rounded-xl bg-black/30 border border-white/10 px-4 py-3"
              aria-label="Stop loss percent"
              placeholder="Stop loss %"
            />
            <input
              type="number"
              min="1"
              value={takeProfitPct}
              onChange={function (e) { setTakeProfitPct(e.target.value); }}
              className="rounded-xl bg-black/30 border border-white/10 px-4 py-3"
              aria-label="Take profit percent"
              placeholder="Take profit %"
            />
          </div>
          <div className="text-xs text-white/50">
            After you approve the entry, IMALI will automatically monitor the option and send a protective sell if your stop-loss or take-profit level is reached.
          </div>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={makePreview}
              disabled={!selected || Boolean(busy)}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold disabled:opacity-50"
            >
              Preview Buy
            </button>
          </div>
        </div>

        {preview ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
            <h2 className="text-xl font-bold">Approval Required</h2>
            <div>{"Contract: " + ((preview.contract && preview.contract.symbol) || selected)}</div>
            <div>{"Quantity: " + preview.qty}</div>
            <div>{"Estimated premium: $" + Number(preview.estimatedPremium || 0).toFixed(2)}</div>
            <div>{"Maximum entry loss estimate: $" + Number(preview.maxEntryLossEstimate || 0).toFixed(2)}</div>
            <div>{"Automatic stop-loss: " + Number(preview.stopLossPct || 0).toFixed(1) + "%"}</div>
            <div>{"Automatic take-profit: " + Number(preview.takeProfitPct || 0).toFixed(1) + "%"}</div>
            <button
              onClick={approve}
              disabled={busy === "approve"}
              className="w-full rounded-xl bg-amber-500 text-black px-5 py-3 font-bold disabled:opacity-50"
            >
              Approve & Send to Alpaca
            </button>
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h2 className="text-xl font-bold">Options Activity</h2>
            <button onClick={reconcile} className="w-full sm:w-auto rounded-lg bg-white/10 px-4 py-2">Reconcile</button>
          </div>
          <div className="mt-4 space-y-2">
            {positions.length ? positions.map(function (row) {
              return (
                <div key={row.id} className="rounded-xl border border-white/10 p-3 text-sm">
                  <div className="font-semibold">{row.symbol}</div>
                  <div className="text-white/50">
                    {row.side + " · " + row.qty + " · " + row.status + " · " + row.mode}
                  </div>
                </div>
              );
            }) : <div className="text-white/50">No Options activity yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
