// src/pages/PublicDashboard.jsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler
);

const API_BASE = "https://api.imali-defi.com";
const PUBLIC_STATS_URL = `${API_BASE}/api/public/live-stats`;
const NOTABLE_TRADES_URL = `${API_BASE}/api/notable-trades`;

// Cache configuration
const REFRESH_INTERVAL = 60000; // 1 minute refresh

// Safe number formatting functions
function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

function formatCurrency(value) {
  const n = safeNumber(value);
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCurrencySigned(value) {
  const n = safeNumber(value);
  const absValue = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n >= 0 ? "+" : "-"}$${absValue}`;
}

function formatPercent(value) {
  const n = safeNumber(value);
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function formatNumber(value) {
  const n = safeNumber(value);
  return n.toLocaleString();
}

function timeAgo(timestamp) {
  if (!timestamp) return "—";
  try {
    const date = new Date(timestamp);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  } catch {
    return "—";
  }
}

function getRiskColor(risk) {
  const riskLower = (risk || "").toLowerCase();
  if (riskLower.includes("low")) return "text-emerald-600 bg-emerald-50";
  if (riskLower.includes("medium")) return "text-amber-600 bg-amber-50";
  if (riskLower.includes("medium-high")) return "text-orange-600 bg-orange-50";
  if (riskLower.includes("high")) return "text-red-600 bg-red-50";
  return "text-gray-600 bg-gray-50";
}

function getBotIcon(botName) {
  const name = (botName || "").toLowerCase();
  if (name.includes("stock")) return "📈";
  if (name.includes("futures")) return "📊";
  if (name.includes("sniper")) return "🎯";
  if (name.includes("okx")) return "🔷";
  return "🤖";
}

function getBotDisplayName(botName) {
  const name = (botName || "").toLowerCase();
  if (name === "okx") return "OKX Spot";
  if (name === "futures") return "Futures Bot";
  if (name === "stocks") return "Stock Bot";
  if (name === "sniper") return "Sniper Bot";
  return botName || "Bot";
}

// Helper function to build activity series - copied from Home page
function buildActivitySeries(trades = []) {
  if (!trades.length) return [4, 6, 5, 8, 6, 9, 7];

  return trades
    .slice(0, 7)
    .reverse()
    .map((trade, index) => {
      const usd = trade?.pnl_usd ?? trade?.pnl ?? null;
      if (usd !== null && Number.isFinite(Number(usd))) {
        return Math.max(2, Math.min(16, Math.abs(Number(usd)) / 25 + 3));
      }
      return index + 4;
    });
}

// Bot Activity Chart - Simplified version matching Home page
function BotActivityChart({ trades = [], stats }) {
  const series = buildActivitySeries(trades);
  
  const chartData = useMemo(
    () => ({
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          data: series,
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.18)",
          fill: true,
          tension: 0.45,
          pointRadius: 4,
          pointHoverRadius: 5,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#10b981",
          pointBorderWidth: 2,
          borderWidth: 3,
        },
      ],
    }),
    [series]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          backgroundColor: "#111827",
          titleColor: "#ffffff",
          bodyColor: "#d1fae5",
          padding: 10,
        },
      },
      scales: {
        x: {
          display: true,
          grid: { display: false },
          ticks: {
            color: "#9ca3af",
            font: { size: 10 },
          },
        },
        y: {
          display: false,
          grid: { color: "rgba(229,231,235,0.5)" },
        },
      },
    }),
    []
  );

  return <Line data={chartData} options={chartOptions} />;
}

// Stat Mini Card
function StatMiniCard({ title, value, valueClassName = "text-gray-900", subtext }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
      <div className={`text-lg font-bold ${valueClassName}`}>{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">
        {title}
      </div>
      {subtext && <div className="text-[9px] text-gray-400 mt-0.5">{subtext}</div>}
    </div>
  );
}

// Bot Performance Card - Collapsible with Notable Trades from API
function BotPerformanceCard({ bot, stats, notableTrades, onTradeClick }) {
  const [expanded, setExpanded] = useState(true);
  const hasTrades = stats && (stats.total_trades > 0);
  const winRate = safeNumber(stats?.win_rate);
  const totalTrades = safeNumber(stats?.total_trades);
  const wins = safeNumber(stats?.wins);
  const losses = safeNumber(stats?.losses);

  const botNotableTrades = notableTrades?.[bot] || [];

  if (!hasTrades) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getBotIcon(bot)}</span>
            <h3 className="font-bold text-gray-900">{getBotDisplayName(bot)}</h3>
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-bold text-blue-600">{winRate.toFixed(1)}%</div>
              <div className="text-[9px] text-gray-500">Win Rate</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-purple-600">{totalTrades.toLocaleString()}</div>
              <div className="text-[9px] text-gray-500">Trades</div>
            </div>
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50/50">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-600">{wins.toLocaleString()}</div>
              <div className="text-[9px] text-gray-500">Wins</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{losses.toLocaleString()}</div>
              <div className="text-[9px] text-gray-500">Losses</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {botNotableTrades[0] ? formatPercent(botNotableTrades[0].pnl_percent) : "0%"}
              </div>
              <div className="text-[9px] text-gray-500">Best Trade</div>
            </div>
          </div>
          
          {botNotableTrades.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-2">
                <span>🏆</span> Notable Trades (Ranked by Highest % Return)
                <span className="text-[9px] text-gray-400">Top {botNotableTrades.length} winning trades</span>
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {botNotableTrades.map((trade, idx) => (
                  <div
                    key={trade.id || idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 cursor-pointer hover:from-green-100 hover:to-emerald-100 transition-colors border border-green-200"
                    onClick={(e) => { e.stopPropagation(); onTradeClick(trade); }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-gray-900">{trade.symbol}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                          trade.side === "buy" ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
                        }`}>
                          {trade.side?.toUpperCase()}
                        </span>
                        <span className="text-[9px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">#{idx + 1}</span>
                      </div>
                      <div className="text-[9px] text-gray-500 mt-0.5">
                        {timeAgo(trade.created_at)} • Entry: {formatCurrency(trade.price)}
                        {trade.exit_price && ` • Exit: ${formatCurrency(trade.exit_price)}`}
                        {trade.qty && ` • Qty: ${trade.qty}`}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="text-base font-bold text-green-600">{formatPercent(safeNumber(trade.pnl_percent))}</div>
                      <div className="text-[9px] text-gray-500">{formatCurrencySigned(trade.pnl_usd || 0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Trade Row Component - Updated to show quantity and exit price
function TradeRow({ trade, onClick, isNotable = false }) {
  const pnl = safeNumber(trade.pnl_usd);
  const pnlPercent = safeNumber(trade.pnl_percent);
  const side = trade.side || "buy";
  const bot = getBotDisplayName(trade.bot);
  const timestamp = trade.created_at;
  const isOpen = trade.status === "open";
  const exitPrice = trade.exit_price;
  const quantity = trade.qty;
  
  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all hover:shadow-md ${
        isNotable ? "border-2 border-amber-300 bg-amber-50/30" :
        !isOpen && pnl > 0 ? "bg-emerald-50 hover:bg-emerald-100" : 
        !isOpen && pnl < 0 ? "bg-red-50 hover:bg-red-100" : 
        isOpen ? "bg-blue-50 hover:bg-blue-100" : 
        "bg-gray-50 hover:bg-gray-100"
      }`}
      onClick={() => onClick(trade)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          {isNotable && <span className="text-amber-500 text-xs">🏆</span>}
          <span className="font-semibold text-sm text-gray-900">{trade.symbol || "Unknown"}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {side.toUpperCase()}
          </span>
          <span className="text-[9px] text-gray-400">{getBotIcon(bot)} {bot}</span>
          {isOpen && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">OPEN</span>
          )}
        </div>
        <div className="text-[10px] text-gray-400 mt-0.5">
          {timeAgo(timestamp)}
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>Entry: {formatCurrency(trade.price || 0)}</span>
          {!isOpen && exitPrice && (
            <span>Exit: {formatCurrency(exitPrice)}</span>
          )}
          {quantity && quantity > 0 && (
            <span>Qty: {quantity.toFixed(6)}</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        {!isOpen ? (
          <>
            <div className={`font-semibold text-sm ${pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-red-600" : "text-gray-600"}`}>
              {pnl !== 0 ? formatCurrencySigned(pnl) : formatCurrency(trade.price || 0)}
            </div>
            {pnlPercent !== 0 && (
              <div className={`text-[11px] font-medium ${pnlPercent > 0 ? "text-emerald-500" : "text-red-500"}`}>
                {formatPercent(pnlPercent)}
              </div>
            )}
          </>
        ) : (
          <div className="font-semibold text-sm text-blue-600">Open Position</div>
        )}
      </div>
    </div>
  );
}

// Trade Detail Modal - Updated to show quantity and exit price
function TradeDetailModal({ trade, isOpen, onClose }) {
  if (!isOpen || !trade) return null;

  const pnl = safeNumber(trade.pnl_usd);
  const pnlPercent = safeNumber(trade.pnl_percent);
  const symbol = trade.symbol || "Unknown";
  const side = trade.side || "buy";
  const bot = getBotDisplayName(trade.bot);
  const timestamp = trade.created_at;
  const entryPrice = safeNumber(trade.price);
  const exitPrice = trade.exit_price ? safeNumber(trade.exit_price) : null;
  const qty = safeNumber(trade.qty);
  const status = trade.status === "open" ? "Open" : "Closed";
  const risk = trade.risk_level || "medium";
  const entryReason = trade.entry_reason || "AI detected favorable market conditions";

  // Calculate price change percentage if exit price exists
  const priceChangePercent = exitPrice ? ((exitPrice - entryPrice) / entryPrice) * 100 : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 p-3 flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-900">Trade Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xl font-bold text-gray-900">{symbol}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {side.toUpperCase()}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${status === "Closed" ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-600"}`}>
                  {status}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {timeAgo(timestamp)} • {bot}
              </div>
            </div>
            {pnl !== 0 && (
              <div className="text-right">
                <div className={`text-xl font-bold ${pnl > 0 ? "text-green-600" : pnl < 0 ? "text-red-600" : "text-gray-600"}`}>
                  {formatCurrencySigned(pnl)}
                </div>
                {pnlPercent !== 0 && (
                  <div className={`text-xs font-semibold ${pnlPercent > 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatPercent(pnlPercent)} return
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs border-t border-gray-100 pt-3">
            <div>
              <div className="text-gray-500">Quantity</div>
              <div className="font-semibold">{qty > 0 ? qty.toFixed(6) : "—"}</div>
            </div>
            <div>
              <div className="text-gray-500">Entry Price</div>
              <div className="font-semibold">{formatCurrency(entryPrice)}</div>
            </div>
            {status === "Closed" && exitPrice && (
              <>
                <div>
                  <div className="text-gray-500">Exit Price</div>
                  <div className="font-semibold">{formatCurrency(exitPrice)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Price Change</div>
                  <div className={`font-semibold ${priceChangePercent > 0 ? "text-green-600" : priceChangePercent < 0 ? "text-red-600" : "text-gray-600"}`}>
                    {formatPercent(priceChangePercent)}
                  </div>
                </div>
              </>
            )}
            {status === "Closed" && !exitPrice && (
              <div className="col-span-2">
                <div className="text-gray-500">Exit Price</div>
                <div className="font-semibold text-gray-400">Not recorded</div>
              </div>
            )}
            {status === "Open" && (
              <div className="col-span-2">
                <div className="text-gray-500">Current Status</div>
                <div className="font-semibold text-blue-600">Active Position</div>
              </div>
            )}
            <div>
              <div className="text-gray-500">Risk Level</div>
              <div className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${getRiskColor(risk)}`}>
                {risk.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-lg">🤖</span>
              <span className="font-semibold text-sm text-gray-900">AI Analysis</span>
            </div>
            <p className="text-xs text-gray-700">{entryReason}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicDashboard() {
  const [data, setData] = useState({
    trades: [],
    summary: {},
    botStats: {},
    notableTrades: {},
    loading: true,
    error: null,
    lastUpdate: null
  });
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [sortRecentTrades, setSortRecentTrades] = useState("recent");
  
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const MIN_FETCH_INTERVAL = 60000;

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) {
      console.log("⏭️ Fetch already in progress, skipping...");
      return;
    }
    
    const now = Date.now();
    if (now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL && data.lastUpdate) {
      console.log("⏭️ Rate limited - last fetch was", Math.round((now - lastFetchTimeRef.current) / 1000), "seconds ago");
      return;
    }
    
    isFetchingRef.current = true;
    
    try {
      console.log("🔄 Fetching public dashboard data...");
      lastFetchTimeRef.current = now;
      
      const [statsResponse, notableResponse] = await Promise.all([
        axios.get(PUBLIC_STATS_URL, { timeout: 15000 }),
        axios.get(NOTABLE_TRADES_URL, { timeout: 15000, params: { limit: 10 } })
      ]);

      if (statsResponse.data && statsResponse.data.success) {
        const apiData = statsResponse.data.data;
        
        // Comprehensive trade data mapping to ensure all fields are captured
        const trades = (apiData.recent_trades || []).map(trade => {
          // Log raw trade data for debugging
          console.log("Raw trade data:", {
            id: trade.id,
            symbol: trade.symbol,
            qty: trade.qty,
            exit_price: trade.exit_price,
            price: trade.price,
            status: trade.status
          });
          
          return {
            ...trade,
            // Map quantity from various possible field names
            qty: trade.qty || trade.quantity || trade.amount || 0,
            // Map exit price from various possible field names
            exit_price: trade.exit_price || trade.exitPrice || trade.exit_price_usd || trade.close_price || null,
            // Map entry price
            price: trade.price || trade.entry_price || trade.entryPrice || 0,
            // Ensure status is consistent
            status: trade.status || (trade.exit_price ? "closed" : "open"),
            // Ensure side is consistent
            side: trade.side || (trade.type === "buy" ? "buy" : "sell"),
            // Ensure P&L fields
            pnl_usd: trade.pnl_usd || trade.pnl || trade.profit_loss || 0,
            pnl_percent: trade.pnl_percent || trade.return_percent || 0,
          };
        });
        
        const summary = apiData.summary || {};
        
        console.log(`📊 Total trades from API: ${summary.total_trades || trades.length}`);
        console.log(`📊 Trades with quantity: ${trades.filter(t => t.qty > 0).length}`);
        console.log(`📊 Trades with exit prices: ${trades.filter(t => t.exit_price).length}`);
        
        const botStats = {};
        const mainBots = ["okx", "futures", "stocks", "sniper"];
        
        (apiData.bots || []).forEach(bot => {
          if (!mainBots.includes(bot.name)) return;
          const totalTrades = safeNumber(bot.total_trades);
          if (totalTrades === 0) return;
          
          const wins = safeNumber(bot.wins);
          const losses = safeNumber(bot.losses);
          const closedTrades = wins + losses;
          
          botStats[bot.name] = {
            total_trades: totalTrades,
            wins: wins,
            losses: losses,
            win_rate: closedTrades > 0 ? (wins / closedTrades) * 100 : 0,
            best_return: 0,
          };
        });
        
        let notableTrades = {};
        if (notableResponse.data && notableResponse.data.success) {
          notableTrades = notableResponse.data.data;
          console.log("🏆 Notable trades loaded:", Object.keys(notableTrades).length, "bots");
        }
        
        console.log("✅ Dashboard data loaded:", {
          totalTrades: summary.total_trades,
          tradesCount: trades.length,
          bots: Object.keys(botStats).length,
          notableBots: Object.keys(notableTrades).length,
          tradesWithExitPrices: trades.filter(t => t.exit_price).length,
          tradesWithQuantity: trades.filter(t => t.qty > 0).length
        });
        
        setData({
          trades: trades,
          summary: summary,
          botStats: botStats,
          notableTrades: notableTrades,
          loading: false,
          error: null,
          lastUpdate: new Date()
        });
      } else {
        setData(prev => ({ ...prev, loading: false, error: "No data received from server" }));
      }
      
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      setData(prev => ({ 
        ...prev, 
        error: error.response?.data?.message || error.message || "Failed to fetch trading data" 
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [data.lastUpdate]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const allTrades = data.trades || [];
  const botStats = data.botStats || {};
  const notableTrades = data.notableTrades || {};

  const totalTrades = safeNumber(data.summary.total_trades || allTrades.length);
  const wins = safeNumber(data.summary.wins);
  const losses = safeNumber(data.summary.losses);
  const winRate = safeNumber(data.summary.win_rate) || (wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0);

  const activeBots = Object.keys(botStats).length;

  const sortedRecentTrades = useMemo(() => {
    return [...allTrades].sort((a, b) => {
      if (sortRecentTrades === "pnl") {
        return safeNumber(b.pnl_usd) - safeNumber(a.pnl_usd);
      }
      if (sortRecentTrades === "percent") {
        const aPercent = Math.abs(safeNumber(a.pnl_percent));
        const bPercent = Math.abs(safeNumber(b.pnl_percent));
        return bPercent - aPercent;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [allTrades, sortRecentTrades]);

  const filteredTrades = useMemo(() => {
    if (activeTab === "open") return sortedRecentTrades.filter(t => t.status === "open");
    if (activeTab === "closed") return sortedRecentTrades.filter(t => t.status === "closed");
    return sortedRecentTrades;
  }, [activeTab, sortedRecentTrades]);

  const tabs = [
    { id: "all", label: "All", count: allTrades.length },
    { id: "open", label: "Open", count: allTrades.filter(t => t.status === "open").length },
    { id: "closed", label: "Closed", count: allTrades.filter(t => t.status === "closed").length },
  ];

  const bots = ["okx", "futures", "stocks", "sniper"].filter(bot => botStats[bot]?.total_trades > 0);

  if (data.loading && !data.lastUpdate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading Trading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Link to="/" className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">
                IMALI
              </Link>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">LIVE</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <span>{formatNumber(totalTrades)} trades tracked</span>
              <span>•</span>
              <span>Live updates every 60s</span>
              <span>•</span>
              <span>{activeBots} active bots</span>
              <Link to="/signup" className="px-2 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-medium">
                Join
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 py-4">
        {data.error && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-amber-600 text-xs">⚠️ {data.error}</p>
          </div>
        )}

        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold mb-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
            Trading in Public
          </h1>
          <p className="text-gray-500 text-xs">{formatNumber(totalTrades)} total trades • {activeBots} active bots • Real-time updates</p>
        </div>

        {/* Bot Activity Chart - Replaced with Home page style chart */}
        <div className="mb-5 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-gray-900">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
              Bot Activity
            </h3>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Last 7 Days
            </span>
          </div>
          <div className="h-80">
            <BotActivityChart trades={allTrades} />
          </div>
          <p className="text-center text-[9px] text-gray-400 mt-2">Weekly trading activity based on recent trades</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <StatMiniCard
            title="Total Trades"
            value={formatNumber(totalTrades)}
            valueClassName="text-purple-600"
          />
          <StatMiniCard
            title="Win Rate"
            value={`${winRate.toFixed(1)}%`}
            valueClassName="text-emerald-600"
            subtext={`${formatNumber(wins)}W / ${formatNumber(losses)}L`}
          />
        </div>

        {/* Bot Performance Section - Collapsible with Notable Trades */}
        <div className="mb-5">
          <h2 className="font-bold text-base mb-2 flex items-center gap-2 text-gray-900">
            <span>🏆</span>
            Notable Trades by Bot
            <span className="text-[10px] font-normal text-gray-400 ml-1">
              Ranked by highest percentage return - Click to collapse
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {bots.map((bot) => (
              <BotPerformanceCard
                key={bot}
                bot={bot}
                stats={botStats[bot]}
                notableTrades={notableTrades}
                onTradeClick={setSelectedTrade}
              />
            ))}
          </div>
        </div>

        {/* Recent Trades Section */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="border-b border-gray-200 p-3 bg-gray-50">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-gray-900">Recent Trades</h2>
                <div className="flex gap-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                        activeTab === tab.id
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500">Sort by:</span>
                <select
                  value={sortRecentTrades}
                  onChange={(e) => setSortRecentTrades(e.target.value)}
                  className="text-[10px] border border-gray-300 rounded-md px-2 py-0.5 bg-white"
                >
                  <option value="recent">Most Recent</option>
                  <option value="percent">Highest % Return</option>
                  <option value="pnl">Highest $ P&L</option>
                </select>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {filteredTrades.length > 0 ? (
              filteredTrades.map((trade, idx) => (
                <TradeRow key={trade.id || idx} trade={trade} onClick={setSelectedTrade} />
              ))
            ) : (
              <div className="p-8 text-center text-gray-400">
                <p className="text-sm">No trades found</p>
              </div>
            )}
          </div>
        </div>

        <div className="text-center text-[9px] text-gray-400 mt-4 pb-4">
          Last updated: {data.lastUpdate?.toLocaleTimeString() || "—"} • Data refreshes every 60 seconds
        </div>
      </main>

      {/* Modal */}
      <TradeDetailModal
        trade={selectedTrade}
        isOpen={!!selectedTrade}
        onClose={() => setSelectedTrade(null)}
      />
    </div>
  );
}