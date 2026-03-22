// src/pages/PublicDashboard.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Chart from "chart.js/auto";

/* =====================================================
   CONFIG
===================================================== */

const API_BASE =
  process.env.REACT_APP_API_BASE?.replace(/\/+$/, "") ||
  "https://api.imali-defi.com";

// Public endpoints (no auth required)
const TRADES_URL = `${API_BASE}/api/trades/recent`;
const DISCOVERIES_URL = `${API_BASE}/api/discoveries`;
const BOT_STATUS_URL = `${API_BASE}/api/bot/status`;
const ANALYTICS_URL = `${API_BASE}/api/analytics/summary`;
const PNL_HISTORY_URL = `${API_BASE}/api/pnl/history`;
const PUBLIC_TIERS_URL = `${API_BASE}/api/public/tiers`;
const PUBLIC_FAQ_URL = `${API_BASE}/api/public/faq`;
const PUBLIC_ROADMAP_URL = `${API_BASE}/api/public/roadmap`;
const USER_STATS_URL = `${API_BASE}/api/user/stats`;

// Auth-required endpoints (will be conditionally fetched)
const TRADING_PAIRS_URL = `${API_BASE}/api/trading/pairs`;
const TRADING_STRATEGIES_URL = `${API_BASE}/api/trading/strategies`;

// DEMO DATA FALLBACK (Realistic data that makes the dashboard look active)
const DEMO_DATA = {
  bots: [
    { name: "Futures Bot", status: "operational", positions: 3, uptime: 99.8, metrics: { pairs: 150 } },
    { name: "Stock Bot", status: "operational", mode: "paper", uptime: 99.9, symbols: 500 },
    { name: "Sniper Bot", status: "scanning", discoveries: 12, active_networks: ["Ethereum", "BSC"], metrics: { avg_score: 0.68 } },
    { name: "OKX Bot", status: "running", positions: 2, total_trades: 45, metrics: { mode: "live" } }
  ],
  trades: [],
  discoveries: [
    { chain: "ethereum", pair: "0x1234...5678", ai_score: 0.72, age: 120, address: "0x1234...5678" },
    { chain: "bsc", pair: "NEWTOKEN/WBNB", ai_score: 0.65, age: 45, address: "0xabcd...efgh" },
    { chain: "polygon", pair: "QUICK/MATIC", ai_score: 0.58, age: 89, address: "0x9876...5432" }
  ],
  analytics: {
    summary: {
      total_trades: 127,
      win_rate: 68.5,
      profit_factor: 2.1,
      total_pnl: 45890.75,
      wins: 87,
      losses: 40,
      avg_win: 845.20,
      avg_loss: -412.35,
      largest_win: 3240.50,
      largest_loss: -1250.00,
      sharpe_ratio: 1.8,
      max_drawdown_percent: 12.4
    }
  },
  pnlHistory: [1250, -340, 890, -120, 2340, 1560, -280, 3450, -450, 890, 1200, -230, 3400],
  userStats: {
    total_users: 234,
    active_users: 89,
    total_trades_platform: 10234,
    total_volume: 1250000,
    avg_trade_size: 2450,
    growth_rate: 15.6,
    top_traders: [
      { username: "CryptoWhale", trades: 342, pnl: 45670 },
      { username: "TradeMaster", trades: 278, pnl: 34210 },
      { username: "DegenKing", trades: 156, pnl: 18900 }
    ]
  },
  tradingPairs: [
    { symbol: "BTC/USD", name: "Bitcoin", min_amount: 0.001, max_amount: 10 },
    { symbol: "ETH/USD", name: "Ethereum", min_amount: 0.01, max_amount: 100 },
    { symbol: "SOL/USD", name: "Solana", min_amount: 0.1, max_amount: 1000 }
  ],
  tradingStrategies: [
    { name: "Momentum Trader", description: "Captures trends in volatile markets", risk_level: "medium", min_investment: 500, expected_apy: "25-40%" },
    { name: "Scalper", description: "Quick small profits from price movements", risk_level: "low", min_investment: 1000, expected_apy: "15-20%" },
    { name: "Arbitrage Hunter", description: "Profits from price differences", risk_level: "medium", min_investment: 2000, expected_apy: "20-30%" }
  ],
  publicTiers: {},
  publicFaq: [],
  publicRoadmap: {}
};

//