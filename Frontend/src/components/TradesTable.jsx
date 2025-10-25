export default function TradesTable({ trades=[] }){
  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="py-2 pr-4">Time</th>
            <th className="py-2 pr-4">Symbol</th>
            <th className="py-2 pr-4">Side</th>
            <th className="py-2 pr-4">Qty</th>
            <th className="py-2 pr-4">Price</th>
            <th className="py-2 pr-4">PnL</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t,i)=>(
            <tr key={i} className="border-t border-slate-100">
              <td className="py-2 pr-4">{new Date(t.time).toLocaleString()}</td>
              <td className="py-2 pr-4">{t.symbol}</td>
              <td className={`py-2 pr-4 ${t.side==='BUY'?'text-emerald-600':'text-rose-600'}`}>{t.side}</td>
              <td className="py-2 pr-4">{t.qty}</td>
              <td className="py-2 pr-4">{t.price}</td>
              <td className={`py-2 pr-4 ${t.pnl>=0?'text-emerald-600':'text-rose-600'}`}>{t.pnl.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
