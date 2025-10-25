// src/utils/adminApi.js
import axios from "axios";

const API_BASE =
  process.env.REACT_APP_API_BASE?.replace(/\/+$/, "") || "http://localhost:8001";

// Axios instance with admin JWT (stored after your admin sign-in flow)
const client = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // include cookies if your backend uses them
});

client.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("ADMIN_JWT");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ---- API wrappers used by AdminPanel ----

export const TreasuryAPI = {
  distributeFees: () => client.post("/admin/treasury/distribute"),
  runBuyback: ({ token, amountUsd }) =>
    client.post("/admin/treasury/buyback", { token, amountUsd }),
  addLiquidity: ({ tokenA, tokenB, amountA, amountB }) =>
    client.post("/admin/treasury/add-liquidity", {
      tokenA,
      tokenB,
      amountA,
      amountB,
    }),
};

export const FeesAPI = {
  setFeeBps: ({ bps }) => client.post("/admin/fees/set-bps", { bps }),
  setRecipient: ({ recipient }) =>
    client.post("/admin/fees/set-recipient", { recipient }),
  sweep: ({ token }) => client.post("/admin/fees/sweep", { token }),
};

export const CexAPI = {
  requestFunding: ({ asset, chain, dest, amount, memo }) =>
    client.post("/admin/cex/funding-request", {
      asset,
      chain,
      dest,
      amount,
      memo,
    }),
  approveFunding: ({ requestId }) =>
    client.post("/admin/cex/approve", { requestId }),
  cancelFunding: ({ requestId }) =>
    client.post("/admin/cex/cancel", { requestId }),
};

export const StocksAPI = {
  getStatus: () => client.get("/admin/stocks/status"),
  pause: () => client.post("/admin/stocks/pause"),
  resume: () => client.post("/admin/stocks/resume"),
  flatAll: () => client.post("/admin/stocks/flat-all"),
  updateRisk: ({
    accountRiskPct,
    maxPositionPct,
    stopLossPct,
    takeProfitPct,
  }) =>
    client.post("/admin/stocks/risk", {
      accountRiskPct,
      maxPositionPct,
      stopLossPct,
      takeProfitPct,
    }),
};

export default { TreasuryAPI, FeesAPI, CexAPI, StocksAPI };
