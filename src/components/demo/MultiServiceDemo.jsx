import React, { useEffect, useState } from "react";

const MARKETS = {
  Spot: { symbols:["BTC/USD","ETH/USD","SOL/USD"], prices:[62000,3200,145], label:"Spot crypto", desc:"Buy and sell crypto in a simulated spot account." },
  DEX: { symbols:["ETH/USDC","UNI/USDC","LINK/USDC"], prices:[3200,8.4,14.2], label:"Decentralized exchange", desc:"Preview swaps, slippage and gas without connecting a wallet." },
  Stocks: { symbols:["AAPL","NVDA","SPY"], prices:[230,175,620], label:"Equities", desc:"Practice stock orders with simulated shares." },
  Futures: { symbols:["BTC-PERP","ETH-PERP","ES"], prices:[62000,3200,6200], label:"Perpetual / index futures", desc:"Preview leveraged positions and margin." },
  Options: { symbols:["SPY CALL","SPY PUT","AAPL CALL"], prices:[6.8,5.2,3.4], label:"Options contracts", desc:"Simulated long options premium; no real contract execution." }
};
const initialBalance = 10000;
const asMoney = (x)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(x);
export default function MultiServiceDemo({preview=false}) {
 const [market,setMarket]=useState("Spot");
 const [strategy,setStrategy]=useState("Balanced");
 const [risk,setRisk]=useState("Medium");
 const [investment,setInvestment]=useState("10000");
 const [symbol,setSymbol]=useState("BTC/USD");
 const [qty,setQty]=useState("0.01");
 const [side,setSide]=useState("Buy");
 const [orderType,setOrderType]=useState("Market");
 const [limit,setLimit]=useState("");
 const [leverage,setLeverage]=useState(2);
 const [slippage,setSlippage]=useState(0.5);
 const [balance,setBalance]=useState(initialBalance);
 const [positions,setPositions]=useState([]);
 const [fills,setFills]=useState([]);
 const [message,setMessage]=useState("Choose a service and place a simulated order.");
 const [ticks,setTicks]=useState(0);
 const [playing,setPlaying]=useState(true);
 const [tour,setTour]=useState(-1);
 const [history,setHistory]=useState(Array.from({length:32},(_,i)=>100+0.9*Math.sin(i*.5)+i*.08));
 const steps=[
  ["Choose a market","Select Spot, DEX, Stocks, Futures, or Options. Each tab has its own example instruments and controls."],
  ["Set your preferences","Strategy, risk, and investment amount are beginner-friendly choices. In this simulator they illustrate settings; no live bot is affected."],
  ["Watch simulated prices","The moving chart uses generated prices, not actual market data. Pause or resume the simulation whenever you like."],
  ["Place a paper trade","Choose an instrument and amount, then press Buy. Your cash, open position and unrealized profit or loss update. Sell to close a spot position."],
  ["Review your results","Open positions and sample order history appear below. The full demo has additional detail. No real money or account connection is used."]
 ];
 useEffect(()=>{setSymbol(MARKETS[market].symbols[0]);setLimit("");setQty("0.01");},[market]);
 useEffect(()=>{if(!playing)return;const t=setInterval(()=>{
  setTicks(x=>x+1);
  setHistory(h=>[...h.slice(-39),Math.max(85,Math.min(115,h[h.length-1]+(Math.random()-.49)*1.2))]);
 },1200);return ()=>clearInterval(t)},[playing]);
 const definition=MARKETS[market];
 const priceOf=(m,s)=>{const d=MARKETS[m],i=d.symbols.indexOf(s);return d.prices[Math.max(0,i)]*(history[history.length-1]/100)*(1+0.004*Math.sin(ticks*.2+i*3));};
 const price=priceOf(market,symbol);
 const multiplier=market==="Options"?100:1;
 const quantity=Number(qty);
 const total=quantity*price*multiplier;
 const exposure=positions.reduce((n,p)=>n+p.qty*priceOf(p.market,p.symbol)*(p.market==="Options"?100:1)*p.direction,0);
 const floating=positions.reduce((n,p)=>n+(priceOf(p.market,p.symbol)-p.entry)*p.qty*(p.market==="Options"?100:1)*p.direction,0);
 const nav=balance+positions.reduce((n,p)=>n+p.reserved+((priceOf(p.market,p.symbol)-p.entry)*p.qty*(p.market==="Options"?100:1)*p.direction),0);
 function trade(e){
  e.preventDefault();
  const q=Number(qty),l=Number(limit);
  if(!Number.isFinite(q)||q<=0||q>10000){setMessage("Enter a quantity above zero and no more than 10,000.");return;}
  if(orderType==="Limit"&&(!Number.isFinite(l)||l<=0)){setMessage("Enter a valid positive limit price.");return;}
  if(orderType==="Limit"&&((side==="Buy"&&l<price)||(side==="Sell"&&l>price))){setMessage("Your limit price is not yet executable. Choose Market for an immediate paper fill.");return;}
  const direction=side==="Buy"?1:-1;
  if(market!=="Futures"&&market!=="Options"&&side==="Sell"){
   const owned=positions.filter(p=>p.market===market&&p.symbol===symbol&&p.direction===1).reduce((n,p)=>n+p.qty,0);
   if(owned<q){setMessage("Insufficient simulated holdings to sell. Buy first.");return;}
   let remaining=q,credit=0;
   setPositions(prev=>prev.flatMap(p=>{if(p.market!==market||p.symbol!==symbol||p.direction!==1||remaining<=0)return [p];const n=Math.min(remaining,p.qty);remaining-=n;credit+=n*price*(market==="Options"?100:1);return p.qty>n?[{...p,qty:p.qty-n,reserved:p.reserved*(p.qty-n)/p.qty}]:[];}));
   setBalance(b=>b+credit);
  } else {
   const required=market==="Futures"?total/leverage:total;
   if(required>Number(investment)){setMessage("This order exceeds your selected demo investment limit.");return;}
   if(required>balance){setMessage("Not enough paper cash or margin for this order.");return;}
   setBalance(b=>b-required);
   setPositions(prev=>[...prev,{id:Date.now()+Math.random(),market,symbol,entry:price,qty:q,direction,reserved:required}]);
  }
  setFills(prev=>[{id:Date.now()+Math.random(),market,symbol,side,qty:q,price},...prev].slice(0,12));
  setMessage(`Simulated ${side.toLowerCase()} filled: ${q} ${symbol} at ${asMoney(price)}. No real order was sent.`);
 }
 function reset(){setBalance(initialBalance);setPositions([]);setFills([]);setTicks(0);setMessage("Paper account reset to $10,000.");}
 return <section aria-label="Interactive paper trading demo" className="w-full rounded-3xl border border-white/15 bg-slate-900 p-4 text-white sm:p-6">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><div className="text-xs font-bold uppercase tracking-widest text-emerald-300">IMALI interactive simulator</div><h2 className="mt-1 text-xl font-black sm:text-2xl">Explore every trading service</h2><p className="mt-1 text-sm text-slate-300">Paper trades only • No sign-in, wallet, or deposit</p></div>
   <div className="flex flex-wrap gap-2">
    <button type="button" onClick={()=>setTour(0)} className="rounded-xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-200 hover:bg-white/10">Start guided tour</button>
    <button type="button" onClick={()=>setPlaying(v=>!v)} className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold hover:bg-white/10">{playing?"Pause prices":"Resume prices"}</button>
    <button type="button" onClick={reset} className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold hover:bg-white/10">Reset demo</button>
   </div>
  </div>
  {tour>=0&&<div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-900/40 p-4" role="region" aria-label="Guided demo tour">
   <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Guided tour · Step {tour+1} of {steps.length}</p>
   <h3 className="mt-2 text-lg font-bold">{steps[tour][0]}</h3>
   <p className="mt-1 text-sm text-slate-200">{steps[tour][1]}</p>
   <div className="mt-3 flex flex-wrap gap-2">
    <button type="button" disabled={tour===0} onClick={()=>setTour(n=>Math.max(0,n-1))} className="rounded-lg border border-white/30 px-4 py-2 disabled:opacity-40">Previous</button>
    <button type="button" onClick={()=>setTour(n=>n===steps.length-1?-1:n+1)} className="rounded-lg bg-emerald-400 px-4 py-2 font-semibold text-slate-950">{tour===steps.length-1?"Finish tour":"Next step"}</button>
    <button type="button" onClick={()=>setTour(-1)} className="rounded-lg border border-white/30 px-4 py-2">Close</button>
   </div>
  </div>}
  <div role="tablist" aria-label="Trading service" className="mt-5 flex flex-wrap gap-2">
   {Object.keys(MARKETS).map(m=><button type="button" key={m} role="tab" aria-selected={m===market} onClick={()=>setMarket(m)} className={`rounded-xl border px-4 py-3 text-sm font-bold ${m===market?"border-emerald-400 bg-emerald-400 text-slate-950":"border-white/20 bg-white/5 text-white"}`}>{m}</button>)}
  </div>
  <div className="mt-5 grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-3">
   <label className="text-sm">Strategy<select value={strategy} onChange={e=>setStrategy(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-800 p-3 text-base">{["Conservative","Balanced","Growth","Aggressive"].map(v=><option key={v}>{v}</option>)}</select></label>
   <label className="text-sm">Risk preference<select value={risk} onChange={e=>setRisk(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-800 p-3 text-base">{["Low","Medium","High"].map(v=><option key={v}>{v}</option>)}</select></label>
   <label className="text-sm">Paper investment limit ($)<input type="number" min="1" max="10000" value={investment} onChange={e=>setInvestment(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-800 p-3 text-base" /></label>
   <p className="text-xs text-slate-300 sm:col-span-3">These beginner preferences are for illustration only; they do not change a real trading bot.</p>
  </div>
  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
   {[["Cash",balance],["Portfolio value",nav],["Unrealized P/L",floating],["Open positions",positions.length]].map(([label,value])=><div key={label} className="rounded-xl bg-white/5 p-3"><p className="text-xs text-slate-300">{label}</p><p className="mt-1 text-lg font-bold">{typeof value==="number"&&label!=="Open positions"?asMoney(value):value}</p></div>)}
  </div>
  <div className="mt-5 grid gap-4 lg:grid-cols-2">
   <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
    <h3 className="font-bold">{definition.label}</h3><p className="mt-1 text-sm text-slate-300">{definition.desc}</p>
    <div className="mt-4 flex items-end justify-between gap-2"><label className="text-sm" htmlFor={preview?"prev-symbol":"full-symbol"}>Instrument</label><strong className="text-lg text-emerald-300">{asMoney(price)}</strong></div>
    <select id={preview?"prev-symbol":"full-symbol"} value={symbol} onChange={e=>setSymbol(e.target.value)} className="mt-2 w-full rounded-xl border border-white/20 bg-slate-800 p-3 text-base">{definition.symbols.map(s=><option key={s}>{s}</option>)}</select>
    <div className="mt-4 rounded-xl border border-white/10 p-3">
     <div className="flex flex-wrap items-center justify-between gap-1 text-sm text-slate-300"><span>{playing?"● Updating every 1.2 seconds":"Paused"} · simulated price history</span><span>Generated prices, not live quotes</span></div>
     <svg className="mt-2 h-24 w-full" viewBox="0 0 300 90" role="img" aria-label="Illustrative price trend">
      <polyline points={history.map((v,i)=>`${i*300/(history.length-1)},${45-(v-100)*5}`).join(" ")} stroke="#6ee7b7" strokeWidth="3" fill="none" strokeLinejoin="round"/>
     </svg>
    </div>
   </div>
   <form onSubmit={trade} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
    <h3 className="font-bold">Order controls</h3>
    <div className="mt-3 grid grid-cols-2 gap-2">{["Buy","Sell"].map(v=><button type="button" key={v} onClick={()=>setSide(v)} className={`rounded-xl border px-4 py-3 font-bold ${side===v?"border-emerald-400 bg-emerald-400 text-slate-950":"border-white/20"}`}>{v}</button>)}</div>
    <label className="mt-3 block text-sm">Order type<select value={orderType} onChange={e=>setOrderType(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-800 p-3 text-base"><option>Market</option><option>Limit</option></select></label>
    {orderType==="Limit"&&<label className="mt-3 block text-sm">Limit price ($)<input type="number" min="0.01" step="any" value={limit} onChange={e=>setLimit(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-800 p-3 text-base"/></label>}
    <label className="mt-3 block text-sm">Quantity {market==="Options"?"(contracts)":""}<input type="number" min="0.0001" step="any" value={qty} onChange={e=>setQty(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-800 p-3 text-base"/></label>
    {market==="Futures"&&<label className="mt-3 block text-sm">Leverage: {leverage}×<input className="mt-2 w-full" type="range" min="1" max="10" value={leverage} onChange={e=>setLeverage(Number(e.target.value))}/></label>}
    {market==="DEX"&&<label className="mt-3 block text-sm">Slippage tolerance: {slippage}%<input className="mt-2 w-full" type="range" min=".1" max="3" step=".1" value={slippage} onChange={e=>setSlippage(Number(e.target.value))}/></label>}
    {market==="Options"&&<p className="mt-3 text-xs text-slate-300">Long calls/puts only • 100 shares per contract • premium shown per share.</p>}
    <p className="mt-3 text-sm text-slate-300">Estimated notional: {Number.isFinite(total)&&total>=0?asMoney(total):"—"} {market==="Futures"?` • margin ${asMoney(total/leverage)}`:""}</p>
    <button type="submit" className="mt-4 w-full rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950 hover:bg-emerald-300">Place simulated {side.toLowerCase()}</button>
   </form>
  </div>
  <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">{message}</p>
  <div className="mt-5 grid gap-4 lg:grid-cols-2"><div><h3 className="font-bold">Open positions</h3><div className="mt-2 space-y-2">{positions.length?positions.slice(-8).map(p=><p className="rounded-lg bg-white/5 p-3 text-sm" key={p.id}>{p.market} · {p.symbol} · {p.direction===1?"Long":"Short"} {p.qty} · P/L {asMoney((priceOf(p.market,p.symbol)-p.entry)*p.qty*(p.market==="Options"?100:1)*p.direction)}</p>):<p className="text-sm text-slate-400">No open paper positions.</p>}</div></div><div><h3 className="font-bold">Simulated trade history</h3><div className="mt-2 space-y-2">{fills.length?fills.slice(0,8).map(t=><p className="rounded-lg bg-white/5 p-3 text-sm" key={t.id}>{t.market} · {t.side} {t.qty} {t.symbol} @ {asMoney(t.price)}</p>):<p className="text-sm text-slate-400">Your sample trades appear here.</p>}</div></div></div>
 </section>;
}
