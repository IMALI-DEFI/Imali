// src/pages/PublicDashboard.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Chart from "chart.js/auto";

/* =====================================================
   CONFIG
===================================================== */

const API_BASE = "https://api.imali-defi.com";

// Main API endpoints
const TRADES_URL = `${API_BASE}/api/trades/recent`;
const DISCOVERIES_URL = `${API_BASE}/api/discoveries`;
const BOT_STATUS_URL = `${API_BASE}/api/bot/status`;
const ANALYTICS_URL = `${API_BASE}/api/analytics/summary`;
const PNL_HISTORY_URL = `${API_BASE}/api/pnl/history`;
const USER_STATS_URL = `${API_BASE}/api/user/stats`;
const LIVE_STATS_URL = `${API_BASE}/api/public/live-stats`;

// Bot Activity History - THIS WILL GET ALL TRADES FROM ALL BOTS!
const BOT_ACTIVITY_HISTORY_URL = `${API_BASE}/api/bot-activity/history`;

// OKX Crypto Spot Bot (working on port 8005)
const OKX_SPOT_BOT_URL = "http://localhost:8005";
const OKX_SPOT_TRADES_URL = `${OKX_SPOT_BOT_URL}/api/trades`;
const OKX_SPOT_STATUS_URL = `${OKX_SPOT_BOT_URL}/status`;

// Alpaca Stock Bot (on port 3001)
const STOCK_BOT_URL = "http://localhost:3001";
const STOCK_BOT_STATUS_URL = `${STOCK_BOT_URL}/status`;
const STOCK_BOT_TRADES_URL = `${STOCK_BOT_URL}/api/trades`;

/* =====================================================
   HELPERS
===================================================== */

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatCurrency(value, digits = 2) {
  return `$${safeNumber(value).toFixed(digits)}`;
}

function formatCurrencySigned(value, digits = 2) {
  const n = safeNumber(value);
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toFixed(digits)}`;
}

function formatPercent(value, digits = 2) {
  const n = safeNumber(value);
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

function timeAgo(timestamp) {
  if (!timestamp) return "—";
  try {
    const diffMs = Date.now() - new Date(timestamp).getTime();
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
  if (riskLower.includes("medium-low")) return "text-emerald-500 bg-emerald-50";
  if (riskLower.includes("medium")) return "text-amber-600 bg-amber-50";
  if (riskLower.includes("medium-high")) return "text-orange-600 bg-orange-50";
  if (riskLower.includes("high")) return "text-red-600 bg-red-50";
  return "text-gray-600 bg-gray-50";
}

/* =====================================================
   DATA HOOK - FETCHES ALL TRADES FROM HISTORY
===================================================== */

function useLiveData() {
  const [data, setData] = useState({
    bots: [],
    allTrades: [],        // ALL trades from history
    okxTrades: [],
    stockTrades: [],
    futuresTrades: [],
    sniperTrades: [],
    okxBotStatus: null,
    stockBotStatus: null,
    discoveries: [],
    analytics: { summary: {} },
    pnlHistory: [],
    liveStats: {},
    loading: true,
    error: null,
    lastUpdate: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetchAllData = async () => {
      try {
        console.log("🔄 Fetching all bot data...");
        
        const [
          historyRes,
          okxTradesRes,
          okxStatusRes,
          stockTradesRes,
          stockStatusRes,
          discoveriesRes,
          botsRes,
          analyticsRes,
          pnlHistoryRes,
          liveStatsRes,
        ] = await Promise.allSettled([
          axios.get(BOT_ACTIVITY_HISTORY_URL, { timeout: 8000, params: { days: 365, limit: 5000 } }),
          axios.get(OKX_SPOT_TRADES_URL, { timeout: 8000 }).catch(() => ({ data: [] })),
          axios.get(OKX_SPOT_STATUS_URL, { timeout: 8000 }).catch(() => ({ data: {} })),
          axios.get(STOCK_BOT_TRADES_URL, { timeout: 8000 }).catch(() => ({ data: [] })),
          axios.get(STOCK_BOT_STATUS_URL, { timeout: 8000 }).catch(() => ({ data: {} })),
          axios.get(DISCOVERIES_URL, { timeout: 8000 }),
          axios.get(BOT_STATUS_URL, { timeout: 8000 }),
          axios.get(ANALYTICS_URL, { timeout: 8000 }),
          axios.get(PNL_HISTORY_URL, { timeout: 8000 }),
          axios.get(LIVE_STATS_URL, { timeout: 8000 }),
        ]);

        if (!mounted) return;

        let newData = {
          bots: [],
          allTrades: [],
          okxTrades: [],
          stockTrades: [],
          futuresTrades: [],
          sniperTrades: [],
          okxBotStatus: null,
          stockBotStatus: null,
          discoveries: [],
          analytics: { summary: {} },
          pnlHistory: [],
          liveStats: {},
        };

        // ============================================================
        // PROCESS BOT ACTIVITY HISTORY - THIS HAS ALL TRADES!
        // ============================================================
        if (historyRes.status === "fulfilled" && historyRes.value.data?.trades) {
          const allHistoryTrades = historyRes.value.data.trades;
          console.log("📊 TOTAL TRADES FROM HISTORY:", allHistoryTrades.length);
          
          newData.allTrades = allHistoryTrades;
          
          // Separate by bot type
          newData.okxTrades = allHistoryTrades.filter(t => t.bot === "okx" || t.bot === "spot" || t.source === "okx");
          newData.stockTrades = allHistoryTrades.filter(t => t.bot === "stocks" || t.bot === "stock");
          newData.futuresTrades = allHistoryTrades.filter(t => t.bot === "futures");
          newData.sniperTrades = allHistoryTrades.filter(t => t.bot === "sniper");
          
          console.log("📊 Breakdown:", {
            okx: newData.okxTrades.length,
            stocks: newData.stockTrades.length,
            futures: newData.futuresTrades.length,
            sniper: newData.sniperTrades.length,
          });
          
          // Use history analytics if available
          if (historyRes.value.data?.summary) {
            newData.analytics = { summary: historyRes.value.data.summary };
          }
        } else {
          console.warn("Bot activity history not available");
        }

        // Process OKX direct trades (for real-time updates)
        if (okxTradesRes.status === "fulfilled" && Array.isArray(okxTradesRes.value.data)) {
          // Merge with history trades, but keep history as primary source
          const existingIds = new Set(newData.okxTrades.map(t => t.id));
          const newOkxTrades = okxTradesRes.value.data.filter(t => !existingIds.has(t.id));
          if (newOkxTrades.length > 0) {
            newData.okxTrades = [...newData.okxTrades, ...newOkxTrades];
            newData.allTrades = [...newData.allTrades, ...newOkxTrades];
          }
        }

        // Process Stock bot trades
        if (stockTradesRes.status === "fulfilled" && Array.isArray(stockTradesRes.value.data)) {
          const existingIds = new Set(newData.stockTrades.map(t => t.id));
          const newStockTrades = stockTradesRes.value.data.filter(t => !existingIds.has(t.id));
          if (newStockTrades.length > 0) {
            newData.stockTrades = [...newData.stockTrades, ...newStockTrades];
            newData.allTrades = [...newData.allTrades, ...newStockTrades];
          }
        }

        // Process bot status
        if (okxStatusRes.status === "fulfilled" && okxStatusRes.value.data) {
          newData.okxBotStatus = okxStatusRes.value.data;
        }
        
        if (stockStatusRes.status === "fulfilled" && stockStatusRes.value.data) {
          newData.stockBotStatus = stockStatusRes.value.data;
        }

        // Process discoveries
        if (discoveriesRes.status === "fulfilled") {
          if (discoveriesRes.value.data?.discoveries) {
            newData.discoveries = discoveriesRes.value.data.discoveries;
          } else if (Array.isArray(discoveriesRes.value.data)) {
            newData.discoveries = discoveriesRes.value.data;
          }
        }

        // Process bots
        if (botsRes.status === "fulfilled" && botsRes.value.data?.bots) {
          newData.bots = botsRes.value.data.bots;
        }

        // Process PNL history
        if (pnlHistoryRes.status === "fulfilled" && pnlHistoryRes.value.data?.history) {
          newData.pnlHistory = pnlHistoryRes.value.data.history;
        } else if (historyRes.status === "fulfilled" && historyRes.value.data?.pnl_by_day) {
          newData.pnlHistory = historyRes.value.data.pnl_by_day;
        }

        // Process live stats
        if (liveStatsRes.status === "fulfilled" && liveStatsRes.value.data) {
          newData.liveStats = liveStatsRes.value.data;
        }

        setData({
          ...newData,
          loading: false,
          error: null,
          lastUpdate: new Date(),
        });

        console.log("✅ Data fetch complete. Total trades:", newData.allTrades.length);

      } catch (error) {
        console.error("Data fetch error:", error);
        if (!mounted) return;
        
        setData(prev => ({
          ...prev,
          loading: false,
          error: "Failed to fetch data: " + error.message,
          lastUpdate: new Date(),
        }));
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return data;
}

/* =====================================================
   NOTABLE TRADES COMPONENT
===================================================== */

function NotableTrades({ allTrades, onTradeClick }) {
  // Filter closed trades with non-zero P&L
  const closedTrades = allTrades.filter(trade => {
    const pnl = trade?.pnl_usd || trade?.pnl || 0;
    return (trade?.status !== "open" && pnl !== 0) || (pnl !== 0);
  });

  // Get top 5 winners
  const topWinners = [...closedTrades]
    .sort((a, b) => {
      const pnlA = a?.pnl_usd || a?.pnl || 0;
      const pnlB = b?.pnl_usd || b?.pnl || 0;
      return pnlB - pnlA;
    })
    .slice(0, 5);

  // Get top 5 losers
  const topLosers = [...closedTrades]
    .sort((a, b) => {
      const pnlA = a?.pnl_usd || a?.pnl || 0;
      const pnlB = b?.pnl_usd || b?.pnl || 0;
      return pnlA - pnlB;
    })
    .slice(0, 5);

  if (topWinners.length === 0 && topLosers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl">
        <div className="text-4xl mb-3">🏆</div>
        <p className="text-sm">No notable trades yet</p>
        <p className="text-xs mt-2">Complete some trades to see top performers</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Best Performers */}
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-5 border border-emerald-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🏆</span>
          <h3 className="font-bold text-lg text-gray-900">Best Performers</h3>
          <span className="ml-auto text-xs text-emerald-600 bg-emerald-200 px-2 py-1 rounded-full">
            Top {topWinners.length}
          </span>
        </div>
        
        <div className="space-y-3">
          {topWinners.map((trade, idx) => {
            const pnl = trade?.pnl_usd || trade?.pnl || 0;
            const pnlPercent = trade?.pnl_percentage || trade?.pnl_pct || (pnl / 1000 * 100);
            const symbol = trade?.symbol || "Unknown";
            const side = trade?.side || "buy";
            const bot = trade?.bot || trade?.source || 
              (trade?.symbol?.includes("USDT") ? "OKX" : 
               trade?.symbol?.match(/^[A-Z]+$/) ? "Stocks" : "Other");
            const timestamp = trade?.created_at || trade?.timestamp;
            const price = trade?.price || 0;
            const score = trade?.overall_score || trade?.ai_score || 0;
            const confidence = trade?.confidence || 0;
            
            return (
              <div 
                key={idx} 
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                onClick={() => onTradeClick(trade, bot)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg text-gray-900">{symbol}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {side.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{bot}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">P&L:</span>
                        <span className="ml-1 font-semibold text-emerald-600">
                          +${pnl.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Return:</span>
                        <span className="ml-1 font-semibold text-emerald-600">
                          +{Math.abs(pnlPercent).toFixed(1)}%
                        </span>
                      </div>
                      {score > 0 && (
                        <div>
                          <span className="text-gray-500">AI Score:</span>
                          <span className="ml-1 font-semibold text-indigo-600">
                            {score.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      {timeAgo(timestamp)} • Price: ${price.toFixed(2)}
                      {confidence > 0 && ` • Confidence: ${confidence.toFixed(0)}%`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-600">
                      +${pnl.toFixed(2)}
                    </div>
                    <div className="text-xs text-emerald-500 mt-1">
                      #{idx + 1} Top Trade
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Worst Performers */}
      <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-5 border border-red-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📉</span>
          <h3 className="font-bold text-lg text-gray-900">Worst Performers</h3>
          <span className="ml-auto text-xs text-red-600 bg-red-200 px-2 py-1 rounded-full">
            Top {topLosers.length}
          </span>
        </div>
        
        <div className="space-y-3">
          {topLosers.map((trade, idx) => {
            const pnl = trade?.pnl_usd || trade?.pnl || 0;
            const pnlPercent = trade?.pnl_percentage || trade?.pnl_pct || (pnl / 1000 * 100);
            const symbol = trade?.symbol || "Unknown";
            const side = trade?.side || "buy";
            const bot = trade?.bot || trade?.source ||
              (trade?.symbol?.includes("USDT") ? "OKX" : 
               trade?.symbol?.match(/^[A-Z]+$/) ? "Stocks" : "Other");
            const timestamp = trade?.created_at || trade?.timestamp;
            const price = trade?.price || 0;
            const score = trade?.overall_score || trade?.ai_score || 0;
            const confidence = trade?.confidence || 0;
            
            return (
              <div 
                key={idx} 
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                onClick={() => onTradeClick(trade, bot)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg text-gray-900">{symbol}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {side.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{bot}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">P&L:</span>
                        <span className="ml-1 font-semibold text-red-600">
                          ${pnl.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Return:</span>
                        <span className="ml-1 font-semibold text-red-600">
                          {pnlPercent.toFixed(1)}%
                        </span>
                      </div>
                      {score > 0 && (
                        <div>
                          <span className="text-gray-500">AI Score:</span>
                          <span className="ml-1 font-semibold text-indigo-600">
                            {score.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      {timeAgo(timestamp)} • Price: ${price.toFixed(2)}
                      {confidence > 0 && ` • Confidence: ${confidence.toFixed(0)}%`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600">
                      ${pnl.toFixed(2)}
                    </div>
                    <div className="text-xs text-red-500 mt-1">
                      #{idx + 1} Loss
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   OKX CRYPTO BOT ACTIVITY COMPONENT
===================================================== */

function OKXCryptoBot({ trades, botStatus, onTradeClick }) {
  if (!trades || trades.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">🔷</div>
        <h3 className="font-semibold text-gray-900 mb-2">OKX Crypto Bot</h3>
        <p className="text-sm text-gray-500">No crypto trades yet.</p>
        {botStatus && (
          <div className="mt-3 text-xs text-gray-400">
            <div>Status: {botStatus.status || "Unknown"}</div>
            <div>Mode: {botStatus.mode || "DRY"}</div>
            <div>Positions: {botStatus.positions_count || 0}</div>
          </div>
        )}
      </div>
    );
  }

  const closedTrades = trades.filter(t => t.status === "closed");
  const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const wins = closedTrades.filter(t => t.pnl > 0).length;
  const losses = closedTrades.filter(t => t.pnl < 0).length;
  const winRate = closedTrades.length > 0 ? (wins / closedTrades.length * 100).toFixed(1) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔷</span>
          <h2 className="font-bold text-xl text-gray-900">OKX Crypto Bot</h2>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
            {botStatus?.mode === "DRY" ? "PAPER TRADING" : "LIVE"}
          </span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
            {trades.length} Total Trades
          </span>
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold ${totalPnL >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatCurrencySigned(totalPnL)}
          </div>
          <div className="text-xs text-gray-400">Total P&L</div>
        </div>
      </div>
      
      {botStatus && (
        <div className="grid grid-cols-4 gap-3 mb-4 pb-3 border-b border-gray-100">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{botStatus.symbols_loaded || 0}</div>
            <div className="text-xs text-gray-400">Symbols</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{botStatus.positions_count || 0}</div>
            <div className="text-xs text-gray-400">Positions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{botStatus.total_trades || trades.length}</div>
            <div className="text-xs text-gray-400">Total Trades</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{winRate}%</div>
            <div className="text-xs text-gray-400">Win Rate</div>
          </div>
        </div>
      )}
      
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Recent Trades</h3>
          <span className="text-xs text-gray-400">Click any trade for details</span>
        </div>
        {trades.slice(0, 20).map((trade, i) => {
          const pnl = trade.pnl || 0;
          const pnlPercent = trade.pnl_percentage || 0;
          const isWin = pnl > 0;
          
          return (
            <div 
              key={trade.id || i}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                isWin ? "bg-emerald-50 hover:bg-emerald-100" : pnl < 0 ? "bg-red-50 hover:bg-red-100" : "bg-gray-50 hover:bg-gray-100"
              }`}
              onClick={() => onTradeClick(trade, "OKX Crypto")}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{trade.symbol}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    trade.side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {trade.side?.toUpperCase() || "BUY"}
                  </span>
                  {trade.status === "open" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">OPEN</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Score: {trade.overall_score?.toFixed(1) || trade.ai_score?.toFixed(1) || "N/A"} • Conf: {trade.confidence?.toFixed(0) || "N/A"}%
                </div>
                <div className="text-xs text-gray-400">
                  {timeAgo(trade.created_at || trade.timestamp)} • {formatCurrency(trade.price)} • Qty: {trade.qty?.toFixed(4)}
                </div>
                {trade.entry_reason && (
                  <div className="text-[10px] text-gray-500 mt-1 truncate">
                    {trade.entry_reason}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                {trade.status !== "open" && pnl !== 0 ? (
                  <>
                    <div className={`font-semibold ${isWin ? "text-emerald-600" : "text-red-600"}`}>
                      {formatCurrencySigned(pnl)}
                    </div>
                    <div className={`text-xs ${isWin ? "text-emerald-500" : "text-red-500"}`}>
                      {pnlPercent > 0 ? "+" : ""}{pnlPercent.toFixed(1)}%
                    </div>
                  </>
                ) : trade.status === "open" ? (
                  <div className="font-semibold text-blue-600">Open</div>
                ) : (
                  <div className="font-semibold text-gray-600">{formatCurrency(trade.price)}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =====================================================
   ALL TRADES COMPONENT
===================================================== */

function AllTradesList({ trades, onTradeClick }) {
  if (!trades || trades.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">📊</div>
        <h3 className="font-semibold text-gray-900 mb-2">All Trades</h3>
        <p className="text-sm text-gray-500">No trades found in history.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <h2 className="font-bold text-xl text-gray-900">All Trades History</h2>
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
            {trades.length} Total Trades
          </span>
        </div>
      </div>
      
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Trade List</h3>
          <span className="text-xs text-gray-400">Click any trade for details</span>
        </div>
        {trades.slice(0, 50).map((trade, i) => {
          const pnl = trade.pnl || trade.pnl_usd || 0;
          const pnlPercent = trade.pnl_percentage || trade.pnl_pct || 0;
          const isWin = pnl > 0;
          const bot = trade.bot || trade.source || 
            (trade.symbol?.includes("USDT") ? "OKX" : 
             trade.symbol?.match(/^[A-Z]+$/) ? "Stocks" : "Other");
          
          return (
            <div 
              key={trade.id || i}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                isWin ? "bg-emerald-50 hover:bg-emerald-100" : pnl < 0 ? "bg-red-50 hover:bg-red-100" : "bg-gray-50 hover:bg-gray-100"
              }`}
              onClick={() => onTradeClick(trade, bot)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{trade.symbol || "Unknown"}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    trade.side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {trade.side?.toUpperCase() || "BUY"}
                  </span>
                  <span className="text-[10px] text-gray-400">{bot}</span>
                  {trade.status === "open" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">OPEN</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {timeAgo(trade.created_at || trade.timestamp)} • {formatCurrency(trade.price || 0)} • Qty: {trade.qty?.toFixed(4) || 0}
                </div>
              </div>
              <div className="text-right shrink-0">
                {trade.status !== "open" && pnl !== 0 ? (
                  <>
                    <div className={`font-semibold ${isWin ? "text-emerald-600" : "text-red-600"}`}>
                      {formatCurrencySigned(pnl)}
                    </div>
                    <div className={`text-xs ${isWin ? "text-emerald-500" : "text-red-500"}`}>
                      {pnlPercent > 0 ? "+" : ""}{pnlPercent.toFixed(1)}%
                    </div>
                  </>
                ) : trade.status === "open" ? (
                  <div className="font-semibold text-blue-600">Open</div>
                ) : (
                  <div className="font-semibold text-gray-600">{formatCurrency(trade.price || 0)}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =====================================================
   TRADE DETAIL MODAL
===================================================== */

function TradeDetailModal({ trade, botName, isOpen, onClose }) {
  if (!isOpen || !trade) return null;

  const pnl = trade?.pnl || trade?.pnl_usd || 0;
  const pnlPercent = trade?.pnl_percentage || trade?.pnl_pct || 0;
  const symbol = trade?.symbol || "Unknown";
  const side = trade?.side || "buy";
  const timestamp = trade?.created_at || trade?.timestamp;
  const price = trade?.price || 0;
  const qty = trade?.qty || trade?.quantity || 0;
  const status = trade?.status === "open" ? "Open" : "Closed";
  const score = trade?.overall_score || trade?.ai_score || 0;
  const confidence = trade?.confidence || 0;
  const risk = trade?.risk_level || "medium";
  const entryReason = trade?.entry_reason || trade?.reason || "AI detected opportunity";
  const exitReason = trade?.exit_reason;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Trade Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-2xl font-bold text-gray-900">{symbol}</div>
              <div className="text-sm text-gray-500 mt-1">
                {timeAgo(timestamp)} • {botName || "Bot"}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-red-600" : "text-gray-600"}`}>
                {pnl !== 0 ? formatCurrencySigned(pnl) : formatCurrency(price)}
              </div>
              {pnl !== 0 && (
                <div className={`text-sm ${pnl > 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {Math.abs(pnlPercent).toFixed(1)}% return
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm border-t border-gray-100 pt-3">
            <div>
              <div className="text-gray-500">Side</div>
              <div className={`font-semibold ${side === "buy" ? "text-emerald-600" : "text-red-600"}`}>
                {side.toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Quantity</div>
              <div className="font-semibold">{qty.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-gray-500">Price</div>
              <div className="font-semibold">{formatCurrency(price)}</div>
            </div>
            <div>
              <div className="text-gray-500">Status</div>
              <div className="font-semibold">{status}</div>
            </div>
            {score > 0 && (
              <div>
                <div className="text-gray-500">AI Score</div>
                <div className="font-semibold">{score.toFixed(1)}</div>
              </div>
            )}
            {confidence > 0 && (
              <div>
                <div className="text-gray-500">Confidence</div>
                <div className="font-semibold">{confidence.toFixed(0)}%</div>
              </div>
            )}
            <div className="col-span-2">
              <div className="text-gray-500">Risk Level</div>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getRiskColor(risk)}`}>
                {risk.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🤖</span>
              <span className="font-semibold text-gray-900">AI Analysis</span>
            </div>
            <p className="text-gray-700 text-sm">{entryReason}</p>
            {exitReason && (
              <div className="mt-2 pt-2 border-t border-indigo-200">
                <span className="text-xs text-gray-500">Exit Reason:</span>
                <p className="text-xs text-gray-600 mt-1">{exitReason}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   CHART COMPONENT
===================================================== */

function PerformanceChart({ pnlHistory = [] }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvas.getContext("2d");
    
    const values = pnlHistory.length > 0 ? pnlHistory.map(p => p.pnl || 0) : [];
    const labels = pnlHistory.length > 0 ? pnlHistory.map(p => {
      const date = new Date(p.date);
      return `${date.getMonth()+1}/${date.getDate()}`;
    }) : [];

    if (values.length === 0) {
      chartRef.current = new Chart(ctx, {
        type: "line",
        data: { labels: ["No Data"], datasets: [{ data: [0] }] },
        options: { responsive: true, maintainAspectRatio: false }
      });
      return;
    }

    let cumulative = 0;
    const cumulativeValues = values.map(v => {
      cumulative += v;
      return cumulative;
    });

    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels.slice(-30),
        datasets: [
          {
            label: "Daily P&L",
            data: values.slice(-30),
            backgroundColor: values.slice(-30).map(v => v >= 0 ? "rgba(16,185,129,0.6)" : "rgba(239,68,68,0.6)"),
            borderColor: values.slice(-30).map(v => v >= 0 ? "#10b981" : "#ef4444"),
            borderWidth: 1,
            borderRadius: 4,
            yAxisID: "y",
          },
          {
            label: "Cumulative P&L",
            data: cumulativeValues.slice(-30),
            type: "line",
            borderColor: "#6366f1",
            backgroundColor: "rgba(99,102,241,0.1)",
            borderWidth: 3,
            pointRadius: 3,
            pointBackgroundColor: "#6366f1",
            pointBorderColor: "white",
            pointBorderWidth: 2,
            fill: true,
            tension: 0.3,
            yAxisID: "y1",
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "top", labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (context) => {
                if (context.dataset.label === "Daily P&L") {
                  return `Daily: ${formatCurrencySigned(context.raw)}`;
                } else {
                  return `Cumulative: ${formatCurrencySigned(context.raw)}`;
                }
              }
            }
          }
        },
        scales: {
          y: {
            position: "left",
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { callback: (value) => formatCurrency(value) },
            title: { display: true, text: "Daily P&L", color: "#6b7280" }
          },
          y1: {
            position: "right",
            grid: { display: false },
            ticks: { callback: (value) => formatCurrency(value), color: "#6366f1" },
            title: { display: true, text: "Cumulative P&L", color: "#6366f1" }
          },
          x: { grid: { display: false }, ticks: { color: "#6b7280", maxRotation: 45 } }
        }
      }
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [pnlHistory]);

  return <canvas ref={canvasRef} />;
}

/* =====================================================
   UI COMPONENTS
===================================================== */

function MetricCard({ title, value, icon, subtext, color = "emerald", onClick }) {
  const colorClasses = {
    emerald: "text-emerald-600",
    indigo: "text-indigo-600",
    purple: "text-purple-600",
    amber: "text-amber-600",
    red: "text-red-600",
    blue: "text-blue-600",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-lg transition-all cursor-pointer" onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            {title}
            <span className="text-gray-300 text-[10px]">ⓘ</span>
          </p>
          <p className={`text-xl sm:text-2xl font-bold mt-1 ${colorClasses[color]}`}>{value}</p>
          {subtext && <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div className="text-2xl opacity-60 shrink-0">{icon}</div>
      </div>
    </div>
  );
}

function BotCard({ bot }) {
  const isOnline = bot?.status === "operational" || bot?.status === "scanning" || bot?.status === "running";

  return (
    <div className="border border-gray-200 bg-white rounded-xl p-4 hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">
            {bot?.name?.includes("Futures") && "📊"}
            {bot?.name?.includes("Stock") && "📈"}
            {bot?.name?.includes("Sniper") && "🦄"}
            {bot?.name?.includes("OKX") && "🔷"}
          </span>
          <span className="font-semibold text-sm sm:text-base text-gray-900 truncate">{bot?.name || "Unknown Bot"}</span>
        </div>
        <span className={`text-xs shrink-0 ${isOnline ? "text-emerald-600" : "text-red-600"}`}>
          {isOnline ? "● Online" : "○ Offline"}
        </span>
      </div>
      {isOnline && bot?.metrics && (
        <div className="text-xs space-y-1 text-gray-600">
          {bot.positions !== undefined && <div>Positions: {bot.positions}</div>}
          {bot.symbols !== undefined && <div>Symbols: {bot.symbols}</div>}
          {bot.uptime !== undefined && <div>Uptime: {bot.uptime}%</div>}
        </div>
      )}
    </div>
  );
}

function DiscoveryCard({ discovery }) {
  const score = safeNumber(discovery?.ai_score ?? discovery?.score, 0);
  const chain = discovery?.chain || "ethereum";
  const age = discovery?.age ?? discovery?.age_blocks ?? 0;
  const pair = discovery?.pair || discovery?.address?.slice(0, 10) || "New token";

  let scoreColor = "text-orange-600";
  if (score >= 0.7) scoreColor = "text-emerald-600";
  else if (score >= 0.5) scoreColor = "text-amber-600";

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs hover:shadow-md transition-colors">
      <div className="flex justify-between items-start mb-2 gap-2">
        <span className="font-medium flex items-center gap-1 min-w-0">
          <span className="text-base shrink-0">🦄</span>
          <span className="capitalize text-gray-900 truncate">{chain}</span>
        </span>
        <span className="text-gray-400 text-[10px] shrink-0">{age} blocks</span>
      </div>
      <div className="text-gray-600 font-mono text-[10px] mb-2 truncate">{pair}</div>
      <div className="flex justify-between items-center gap-2">
        <div>
          <span className="text-gray-400">AI Score</span>
          <span className={`ml-2 font-bold ${scoreColor}`}>{score.toFixed(2)}</span>
        </div>
        {score >= 0.7 && (
          <span className="text-[8px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Ready</span>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function PublicDashboard() {
  const data = useLiveData();
  const [clock, setClock] = useState(new Date());
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [selectedBot, setSelectedBot] = useState(null);
  const [showMetricDefinitions, setShowMetricDefinitions] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const allTrades = data.allTrades || [];
  const okxTrades = data.okxTrades || [];
  const stockTrades = data.stockTrades || [];
  const futuresTrades = data.futuresTrades || [];
  const sniperTrades = data.sniperTrades || [];
  const discoveries = data.discoveries || [];
  const bots = data.bots || [];
  const analytics = data.analytics?.summary || {};
  const pnlHistory = data.pnlHistory || [];

  const totalTradesCount = allTrades.length;
  const totalPnL = allTrades.reduce((sum, t) => sum + (t.pnl || t.pnl_usd || 0), 0);
  const wins = allTrades.filter(t => (t.pnl || t.pnl_usd || 0) > 0).length;
  const losses = allTrades.filter(t => (t.pnl || t.pnl_usd || 0) < 0).length;
  const winRate = totalTradesCount > 0 ? (wins / totalTradesCount * 100) : 0;
  
  // Calculate profit factor
  const totalWinAmount = allTrades.filter(t => (t.pnl || t.pnl_usd || 0) > 0).reduce((sum, t) => sum + (t.pnl || t.pnl_usd || 0), 0);
  const totalLossAmount = Math.abs(allTrades.filter(t => (t.pnl || t.pnl_usd || 0) < 0).reduce((sum, t) => sum + (t.pnl || t.pnl_usd || 0), 0));
  const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : 0;

  const cumulativePnl = pnlHistory.length > 0 ? pnlHistory[pnlHistory.length - 1]?.cumulative_pnl || totalPnL : totalPnL;
  const initialBalance = 10000;
  const totalReturnPercent = cumulativePnl / initialBalance * 100;

  if (data.loading && !data.lastUpdate) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading live dashboard...</p>
          <p className="text-xs text-gray-400 mt-2">Fetching all historical trades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">
                IMALI
              </Link>
              <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700">LIVE</span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">
                {totalTradesCount} Total Trades
              </span>
            </div>
            <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span>Real-time data</span>
              </div>
              <div>Last update: {data.lastUpdate ? timeAgo(data.lastUpdate) : "—"}</div>
              <div>{clock.toLocaleTimeString()}</div>
              <Link to="/signup" className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-semibold text-white transition-all">
                Join the Journey →
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {data.error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-amber-600 text-sm">⚠️ {data.error}</p>
          </div>
        )}

        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">
            Live Trading Dashboard
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto text-sm sm:text-base">
            Complete trading history from all bots • {totalTradesCount} total trades tracked
          </p>
        </div>

        {/* Performance Chart */}
        <div className="mb-8 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-xl text-gray-900">Performance History</h2>
              <p className="text-xs text-gray-400 mt-1">Daily P&L (bars) and Cumulative Performance (line)</p>
            </div>
            <button 
              onClick={() => setShowMetricDefinitions(true)}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full transition-colors"
            >
              📊 Understanding these metrics
            </button>
          </div>
          <div className="h-96">
            <PerformanceChart pnlHistory={pnlHistory} />
          </div>
          <div className="mt-3 text-center text-[10px] text-gray-400">
            Bars show daily profit/loss • Line shows cumulative performance
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg text-gray-800">Key Performance Metrics</h2>
            <button 
              onClick={() => setShowMetricDefinitions(true)}
              className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>ⓘ</span> What do these mean?
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <MetricCard 
              title="Win Rate" 
              value={`${winRate.toFixed(1)}%`} 
              icon="📈" 
              color="emerald"
              subtext={`${wins}W / ${losses}L`}
              onClick={() => setShowMetricDefinitions(true)}
            />
            <MetricCard 
              title="Total Trades" 
              value={totalTradesCount} 
              icon="🔄" 
              color="purple"
              onClick={() => setShowMetricDefinitions(true)}
            />
            <MetricCard 
              title="Profit Factor" 
              value={profitFactor.toFixed(2)} 
              icon="💰" 
              color="blue"
              onClick={() => setShowMetricDefinitions(true)}
            />
            <MetricCard 
              title="Total P&L" 
              value={formatCurrencySigned(totalPnL)} 
              icon="💵" 
              color={totalPnL >= 0 ? "emerald" : "red"}
              onClick={() => setShowMetricDefinitions(true)}
            />
            <MetricCard 
              title="Total Return" 
              value={`${totalReturnPercent >= 0 ? "+" : ""}${totalReturnPercent.toFixed(1)}%`} 
              icon="📈" 
              color={totalReturnPercent >= 0 ? "emerald" : "red"}
              subtext={`Cumulative: ${formatCurrencySigned(cumulativePnl)}`}
              onClick={() => setShowMetricDefinitions(true)}
            />
          </div>
        </div>

        {/* Secondary Metrics - Bot Breakdown */}
        <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard 
            title="OKX Trades" 
            value={okxTrades.length} 
            icon="🔷" 
            color="purple"
            onClick={() => setShowMetricDefinitions(true)}
          />
          <MetricCard 
            title="Stock Trades" 
            value={stockTrades.length} 
            icon="📈" 
            color="blue"
            onClick={() => setShowMetricDefinitions(true)}
          />
          <MetricCard 
            title="Futures Trades" 
            value={futuresTrades.length} 
            icon="📊" 
            color="amber"
            onClick={() => setShowMetricDefinitions(true)}
          />
          <MetricCard 
            title="Sniper Trades" 
            value={sniperTrades.length} 
            icon="🎯" 
            color="red"
            onClick={() => setShowMetricDefinitions(true)}
          />
        </div>

        {/* NOTABLE TRADES SECTION */}
        <div className="mb-8">
          <h2 className="font-bold text-xl mb-3 flex items-center gap-2 text-gray-900">
            <span>🏆</span>
            Most Notable Trades
            <span className="text-xs font-normal text-gray-400 ml-2">
              Top winners and losers from all time
            </span>
          </h2>
          <NotableTrades 
            allTrades={allTrades}
            onTradeClick={(trade, bot) => {
              setSelectedTrade(trade);
              setSelectedBot(bot);
            }}
          />
        </div>

        {/* OKX CRYPTO BOT ACTIVITY */}
        <div className="mb-8">
          <OKXCryptoBot 
            trades={okxTrades} 
            botStatus={data.okxBotStatus}
            onTradeClick={(trade, bot) => {
              setSelectedTrade(trade);
              setSelectedBot(bot);
            }}
          />
        </div>

        {/* ALL TRADES HISTORY */}
        <div className="mb-8">
          <AllTradesList 
            trades={allTrades}
            onTradeClick={(trade, bot) => {
              setSelectedTrade(trade);
              setSelectedBot(bot);
            }}
          />
        </div>

        {/* DEX Discoveries */}
        <div className="mb-8">
          <h2 className="font-semibold text-lg mb-3 text-gray-800">🦄 DEX Discoveries</h2>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {discoveries.length > 0 ? (
              discoveries.map((d, i) => <DiscoveryCard key={d.id || i} discovery={d} />)
            ) : (
              <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl">
                <div className="text-2xl mb-2">🔍</div>
                <p className="text-sm">Scanning for new tokens...</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 border-t border-gray-200 pt-6">
          <p>
            Complete trading history • OKX Crypto • Alpaca Stocks • Futures • Sniper
            <br />
            <Link to="/" className="text-indigo-600 hover:underline">Home</Link>
            {" • "}
            <Link to="/pricing" className="text-indigo-600 hover:underline">Pricing</Link>
            {" • "}
            <Link to="/referrals" className="text-amber-600 hover:underline">Referrals</Link>
          </p>
        </div>
      </main>

      {/* Metric Definitions Modal */}
      <MetricDefinitions 
        isOpen={showMetricDefinitions} 
        onClose={() => setShowMetricDefinitions(false)} 
      />

      {/* Trade Detail Modal */}
      <TradeDetailModal
        trade={selectedTrade}
        botName={selectedBot}
        isOpen={selectedTrade !== null}
        onClose={() => {
          setSelectedTrade(null);
          setSelectedBot(null);
        }}
      />
    </div>
  );
}