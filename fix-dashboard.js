const fs = require('fs');
const path = require('path');

// 1. Fix BotAPI.js - add methods
const botApiPath = 'src/utils/BotAPI.js';
let botApiContent = fs.readFileSync(botApiPath, 'utf8');

// Check if methods already exist
if (!botApiContent.includes('getMarketCandles')) {
  // Add methods before the export
  const methodsToAdd = `
// ─── MARKET DATA ─────────────────────────────────────
static async getMarketCandles({
  exchange = "okx",
  symbol = "BTC-USDT",
  timeframe = "1m",
  limit = 100,
} = {}) {
  const params = new URLSearchParams({
    exchange,
    symbol,
    timeframe,
    limit: String(limit),
  });

  return this.request(\`/api/market/candles?\${params.toString()}\`, {
    method: "GET",
    auth: true,
  });
}

static async getMarketAnalysis({
  exchange = "okx",
  symbol = "BTC-USDT",
  strategy = "ai_weighted",
  timeframe = "5m",
} = {}) {
  const params = new URLSearchParams({
    exchange,
    symbol,
    strategy,
    timeframe,
  });

  return this.request(\`/api/trading/analysis?\${params.toString()}\`, {
    method: "GET",
    auth: true,
  });
}

static async getReferralStats() {
  return this.request("/api/referrals/stats", {
    method: "GET",
    auth: true,
  });
}

static async captureMarketingLead(payload) {
  return this.request("/api/marketing/leads", {
    method: "POST",
    auth: false,
    body: payload,
  });
}

`;

  // Insert before the export section
  botApiContent = botApiContent.replace(
    /\/\/ ─── EXPORT ─────────────────────────────────────────/,
    methodsToAdd + '\n// ─── EXPORT ─────────────────────────────────────────'
  );

  // Also add to the export object
  botApiContent = botApiContent.replace(
    /(getGlobalTrades,)/,
    `$1\n  getMarketCandles,\n  getMarketAnalysis,\n  getReferralStats,\n  captureMarketingLead,`
  );

  fs.writeFileSync(botApiPath, botApiContent);
  console.log('✅ BotAPI.js updated');
} else {
  console.log('ℹ️ BotAPI.js already has the methods');
}

// 2. Fix MemberDashboard.jsx
const dashboardPath = 'src/components/Dashboard/MemberDashboard.jsx';
let content = fs.readFileSync(dashboardPath, 'utf8');

// 2a. Fix hasPaidAccess
content = content.replace(
  /const hasPaidAccess = Boolean\([\s\S]*?\);/,
  `const hasPaidAccess = [
  "active",
  "trialing"
].includes(normalizedSubscriptionStatus);`
);
console.log('✅ hasPaidAccess fixed');

// 2b. Add analysis to initialState
if (!content.includes('analysis: {')) {
  content = content.replace(
    /(candles: \[\],\s+candlesLoading: false,)/,
    `$1\n  analysis: {\n    regime: "Neutral",\n    confidence: 0,\n    reasoning: [],\n    decision: "WAIT",\n    updatedAt: null,\n    source: "unavailable",\n  },\n  candlesSource: "none",`
  );
  console.log('✅ Analysis added to initialState');
}

// 2c. Add SET_ANALYSIS and SET_CANDLES_SOURCE to ACTIONS
if (!content.includes('SET_ANALYSIS')) {
  content = content.replace(
    /(SET_CANDLES_LOADING: "SET_CANDLES_LOADING",)/,
    `$1\n  SET_ANALYSIS: "SET_ANALYSIS",\n  SET_CANDLES_SOURCE: "SET_CANDLES_SOURCE",`
  );
  console.log('✅ Actions added');
}

// 2d. Add reducer cases
if (!content.includes('case ACTIONS.SET_ANALYSIS:')) {
  content = content.replace(
    /(case ACTIONS\.SET_CANDLES_LOADING:[\s\S]*?break;)/,
    `$1\n    case ACTIONS.SET_ANALYSIS:\n      return {\n        ...state,\n        analysis: {\n          ...state.analysis,\n          ...action.payload,\n        },\n      };\n    case ACTIONS.SET_CANDLES_SOURCE:\n      return { ...state, candlesSource: action.payload };`
  );
  console.log('✅ Reducer cases added');
}

// 2e. Replace AIThinkingPanel usage
content = content.replace(
  /<AIThinkingPanel strategy={state\.currentStrategy} \/>/g,
  `<AIThinkingPanel analysis={state.analysis} />`
);
console.log('✅ AIThinkingPanel usage updated');

// Write the file back
fs.writeFileSync(dashboardPath, content);
console.log('✅ MemberDashboard.jsx updated successfully!');
