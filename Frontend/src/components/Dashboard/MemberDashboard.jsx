// src/components/Dashboard/MemberDashboard.jsx - WITH TRADING STATE SYNC FIX
// (Same as previous but with these key additions/changes)

// Add this to the fetchLiveStats function to sync open positions:
const fetchLiveStats = useCallback(async () => {
  if (!canUseLiveMode) return;
  try {
    const stats = await BotAPI.getLiveTradingStats?.();
    if (stats) {
      setLiveStats({
        pnl: stats.summary?.total_pnl || stats.pnl || 0,
        winRate: stats.summary?.win_rate || stats.winRate || 0,
        trades: stats.summary?.total_trades || stats.trades || 0,
        wins: stats.summary?.wins || stats.wins || 0,
        losses: stats.summary?.losses || stats.losses || 0,
        openPositions: stats.summary?.open_positions || stats.open_positions || 0,
        dailyPnl: stats.summary?.daily_pnl || stats.daily_pnl || 0,
        dailyTrades: stats.summary?.daily_trades || stats.daily_trades || 0,
      });
    }
  } catch (err) { 
    console.error("Failed to fetch live stats:", err);
  }
}, [canUseLiveMode]);

// Update the live stats state to include these fields:
const [liveStats, setLiveStats] = useState({ 
  pnl: 0, 
  winRate: 0, 
  trades: 0, 
  wins: 0, 
  losses: 0,
  openPositions: 0,
  dailyPnl: 0,
  dailyTrades: 0
});

// Add a warning indicator when bot is running but no trades in the last hour
const [lastTradeTime, setLastTradeTime] = useState(null);

// In fetchLiveTrades, track last trade time:
const fetchLiveTrades = useCallback(async () => {
  if (!canUseLiveMode) return;
  try {
    const response = await BotAPI.getLiveTradeHistory?.(20);
    const trades = response?.trades || response?.data?.trades || [];
    if (trades.length > 0 && trades[0]?.closed_at) {
      setLastTradeTime(new Date(trades[0].closed_at));
    }
    setLiveFeed(
      trades.slice(0, 25).map((t) => {
        const isOpen = t.status === "open";
        const pnl = Number(t.pnl ?? t.pnl_usd ?? 0);
        return {
          id: t.id,
          symbol: t.symbol,
          pnl,
          status: t.status,
          type: isOpen ? "Live Position" : t.label || (pnl >= 0 ? "Take Profit" : "Stop Loss"),
          mode: "live",
          time: new Date(t.closed_at || t.created_at).toLocaleTimeString(),
        };
      })
    );
  } catch (err) {
    console.error("Failed to fetch live trades:", err);
  }
}, [canUseLiveMode]);

// Add bot health indicator in the UI (below the main button):
{/* Bot health indicator */}
{mode === "live" && running && botStatus && (
  <div className="mt-3 text-center">
    {liveStats.openPositions > 0 && (
      <div className="inline-flex items-center gap-2 text-xs text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full">
        <FaChartLine size={12} />
        {liveStats.openPositions} open position{liveStats.openPositions !== 1 ? 's' : ''}
      </div>
    )}
    {liveStats.dailyTrades === 0 && running && (
      <div className="inline-flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-full ml-2">
        <FaInfoCircle size={12} />
        No trades today
      </div>
    )}
  </div>
)}
