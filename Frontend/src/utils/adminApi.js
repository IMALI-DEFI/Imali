// src/utils/adminApi.js
import axios from "axios";

const IS_BROWSER = typeof window !== "undefined";

function stripTrailingSlash(s) {
  return String(s || "").replace(/\/+$/, "");
}

// Resolve API ORIGIN (no /api at the end)
function resolveApiOrigin() {
  const raw =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_API_BASE ||
    process.env.VITE_API_BASE_URL ||
    "";

  if (raw) {
    const cleaned = stripTrailingSlash(raw);
    // If someone set ".../api" by accident, normalize back to origin
    if (cleaned.endsWith("/api")) return cleaned.slice(0, -4);
    return cleaned;
  }

  if (IS_BROWSER) {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return "http://localhost:8001";
    return "https://api.imali-defi.com";
  }

  return "http://localhost:8001";
}

// Your backend is mounted under /api/*
const API_ORIGIN = resolveApiOrigin();
const BASE_URL = `${stripTrailingSlash(API_ORIGIN)}/api`;

// Store admin token here (can be ADMIN_API_KEY or a real JWT later)
const ADMIN_TOKEN_KEY = "IMALI_ADMIN_TOKEN";

export function setAdminToken(token) {
  if (!IS_BROWSER) return;
  const t = (token || "").trim();
  if (!t) localStorage.removeItem(ADMIN_TOKEN_KEY);
  else localStorage.setItem(ADMIN_TOKEN_KEY, t);
}

export function getAdminToken() {
  if (!IS_BROWSER) return "";
  return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((cfg) => {
  const token = getAdminToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

/* --- Helpers --- */
async function unwrap(promise) {
  const res = await promise;
  return res.data;
}

/* ---------------- Admin APIs ----------------
   IMPORTANT: these now call /api/admin/... (correct)
--------------------------------------------- */

export const TreasuryAPI = {
  distributeFees: () => unwrap(client.post("/admin/treasury/distribute")),
  runBuyback: ({ token, amountUsd }) =>
    unwrap(client.post("/admin/treasury/buyback", { token, amountUsd })),
  addLiquidity: ({ tokenA, tokenB, amountA, amountB }) =>
    unwrap(
      client.post("/admin/treasury/add-liquidity", {
        tokenA,
        tokenB,
        amountA,
        amountB,
      })
    ),
};

export const FeesAPI = {
  setFeeBps: ({ bps }) => unwrap(client.post("/admin/fees/set-bps", { bps })),
  setRecipient: ({ recipient }) =>
    unwrap(client.post("/admin/fees/set-recipient", { recipient })),
  sweep: ({ token }) => unwrap(client.post("/admin/fees/sweep", { token })),
};

export const CexAPI = {
  requestFunding: ({ asset, chain, dest, amount, memo }) =>
    unwrap(
      client.post("/admin/cex/funding-request", { asset, chain, dest, amount, memo })
    ),
  approveFunding: ({ requestId }) =>
    unwrap(client.post("/admin/cex/approve", { requestId })),
  cancelFunding: ({ requestId }) =>
    unwrap(client.post("/admin/cex/cancel", { requestId })),
};

export const StocksAPI = {
  getStatus: () => unwrap(client.get("/admin/stocks/status")),
  pause: () => unwrap(client.post("/admin/stocks/pause")),
  resume: () => unwrap(client.post("/admin/stocks/resume")),
  flatAll: () => unwrap(client.post("/admin/stocks/flat-all")),
  updateRisk: ({ accountRiskPct, maxPositionPct, stopLossPct, takeProfitPct }) =>
    unwrap(
      client.post("/admin/stocks/risk", {
        accountRiskPct,
        maxPositionPct,
        stopLossPct,
        takeProfitPct,
      })
    ),
};

export default { TreasuryAPI, FeesAPI, CexAPI, StocksAPI, setAdminToken, getAdminToken };
