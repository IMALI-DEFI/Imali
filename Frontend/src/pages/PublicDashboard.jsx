{/* Daily Active Trades Chart */}
<div className="mb-5 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
  <div className="mb-3 flex items-center justify-between">
    <h3 className="flex items-center gap-2 font-bold text-gray-900">
      <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
      Daily Trading Activity
    </h3>
    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
      Last 7 Days
    </span>
  </div>
  <div className="h-64">
    <DailyActiveTradesChart trades={allTrades} />
  </div>
  <p className="text-center text-[9px] text-gray-400 mt-2">Trade count (green) and P&L (purple) by day</p>
</div>