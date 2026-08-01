// src/utils/marketData.js

// ---------- Base URL (CRA/Vite safe; no `import process`) ----------
function resolveBaseUrl() {
  if (typeof window !== "undefined" && window.__API_BASE__) return window.__API_BASE__;
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.host}`;
  }
  return "http://localhost:8001";
}
const BASE_URL = resolveBaseUrl();

export function setApiBase(url) {
  if (typeof window !== "undefined") window.__API_BASE__ = url;
}
export { BASE_URL };

/** Ensure intervals match your backend/OKX */
export function normalizeInterval(input = "1h") {
  const map = {
    "1m": "1m","3m":"3m","5m":"5m","15m":"15m","30m":"30m",
    "1h":"1h","1H":"1h","2h":"2h","2H":"2h","4h":"4h","4H":"4h",
    "6h":"6h","6H":"6h","8h":"8h","8H":"8h","12h":"12h","12H":"12h",
    "1d":"1d","1D":"1d","3d":"3d","3D":"3d","1w":"1w","1W":"1w",
    "1M":"1M","1mth":"1M","1month":"1M",
  };
  return map[input] || "1h";
}

/** OKX symbol helper (BTCUSDT → BTC-USDT) */
export function normalizeOkxSymbol(sym = "BTC-USDT") {
  if (!sym) return "BTC-USDT";
  if (sym.includes("-")) return sym.toUpperCase();

  const s = sym.toUpperCase().replace(/\s+/g, "");
  const stables = ["USDT", "USDC", "USD", "DAI"];
  for (const stab of stables) {
    if (s.endsWith(stab)) return `${s.slice(0, -stab.length)}-${stab}`;
  }
  if (s.length > 4) return `${s.slice(0, -4)}-${s.slice(-4)}`;
  return s;
}

/** → [{ time (seconds), open, high, low, close }] — ASCENDING by time */
export function normalizeKlines(raw = []) {
  if (!Array.isArray(raw)) return [];
  const out = raw
    .map((k) => {
      if (k && typeof k === "object" && !Array.isArray(k)) {
        let t = Number(k.time ?? k.timestamp ?? k.t ?? 0);
        if (t > 1e12) t = Math.floor(t / 1000);
        return {
          time: Math.floor(t),
          open: Number(k.open),
          high: Number(k.high),
          low:  Number(k.low),
          close:Number(k.close),
        };
      }
      const ts = Number(k?.[0] ?? 0);
      return {
        time: Math.floor(ts > 1e12 ? ts / 1000 : ts),
        open: Number(k?.[1] ?? 0),
        high: Number(k?.[2] ?? 0),
        low:  Number(k?.[3] ?? 0),
        close:Number(k?.[4] ?? 0),
      };
    })
    .filter(
      (d) =>
        Number.isFinite(d.time) &&
        Number.isFinite(d.open) &&
        Number.isFinite(d.high) &&
        Number.isFinite(d.low) &&
        Number.isFinite(d.close)
    );
  out.sort((a, b) => a.time - b.time);
  return out;
}

/* ---------------------- helpers ---------------------- */
function joinUrl(base, path) {
  if (!base) return path;
  if (base.endsWith("/")) base = base.slice(0, -1);
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

async function fetchWithRetry(url, { retries = 2, backoffMs = 400, signal, headers } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await fetch(url, { signal, headers });
      if (r.ok) return r;
      // Retry on 429/5xx
      if (r.status === 429 || (r.status >= 500 && r.status <= 599)) {
        lastErr = new Error(`HTTP ${r.status}`);
      } else {
        const text = await r.text().catch(() => "");
        throw new Error(`HTTP ${r.status} ${text || ""}`.trim());
      }
    } catch (e) {
      lastErr = e;
    }
    if (attempt < retries) {
      await new Promise((res) => setTimeout(res, backoffMs * Math.pow(2, attempt)));
    }
  }
  throw lastErr || new Error("Network error");
}

// optional in-memory cache for charts
const _cache = new Map();
function cacheGet(key) {
  const v = _cache.get(key);
  if (!v) return null;
  if (v.expires && v.expires < Date.now()) { _cache.delete(key); return null; }
  return v.data;
}
function cacheSet(key, data, ttlMs = 10_000) {
  _cache.set(key, { data, expires: Date.now() + ttlMs });
}

/* ---------------------- CEX (OKX) ---------------------- */
export async function fetchCexKlines({
  baseUrl = BASE_URL,
  symbol = "BTC-USDT",
  interval = "1h",
  limit = 500,
  askBackendToNormalize = false,
  signal,
  headers,
  cacheMs = 0, // e.g. 5_000 to cache for 5s
} = {}) {
  const sym = normalizeOkxSymbol(symbol);
  const itv = normalizeInterval(interval);

  const path =
    `/api/cex/klines?symbol=${encodeURIComponent(sym)}` +
    `&interval=${encodeURIComponent(itv)}` +
    `&limit=${encodeURIComponent(limit)}` +
    (askBackendToNormalize ? `&normalize=true` : ``);

  const url = joinUrl(baseUrl, path);

  const key = `cex:${url}`;
  if (cacheMs > 0) {
    const cached = cacheGet(key);
    if (cached) return cached;
  }

  const r = await fetchWithRetry(url, { signal, headers });
  const raw = await r.json();
  const data = normalizeKlines(raw);
  if (cacheMs > 0) cacheSet(key, data, cacheMs);
  return data;
}

// Back-compat alias
export const fetchCexKlinesOkx = fetchCexKlines;

/* ---------------------- DEX ---------------------- */
export async function fetchDexCandles({
  baseUrl = BASE_URL,
  chain = "ethereum",
  pool,
  interval = "1h",
  limit = 500,
  signal,
  headers,
  cacheMs = 0,
} = {}) {
  if (!pool) throw new Error("Pool (address/ID) is required for DEX candles");
  const itv = normalizeInterval(interval);

  const path =
    `/api/dex/candles?chain=${encodeURIComponent(chain)}` +
    `&pool=${encodeURIComponent(pool)}` +
    `&interval=${encodeURIComponent(itv)}` +
    `&limit=${encodeURIComponent(limit)}`;

  const url = joinUrl(baseUrl, path);

  const key = `dex:${url}`;
  if (cacheMs > 0) {
    const cached = cacheGet(key);
    if (cached) return cached;
  }

  const r = await fetchWithRetry(url, { signal, headers });
  const payload = await r.json();
  const arr = Array.isArray(payload) ? payload : payload?.candles || [];

  const data = normalizeKlines(
    arr.map((c) => {
      let t = Number(c.timestamp ?? c.time ?? 0);
      if (t > 1e12) t = Math.floor(t / 1000);
      return {
        time: Math.floor(t),
        open: Number(c.open),
        high: Number(c.high),
        low:  Number(c.low),
        close:Number(c.close),
      };
    })
  );
  if (cacheMs > 0) cacheSet(key, data, cacheMs);
  return data;
}

/* ---------------------- BOTH ---------------------- */
export async function fetchBothCandles({
  cex = { symbol: "BTC-USDT", interval: "1h", limit: 500 },
  dex = { chain: "ethereum", pool: "", interval: "1h", limit: 500 },
  baseUrl = BASE_URL,
  signal,
  headers,
  cacheMs = 0,
} = {}) {
  const [cexData, dexData] = await Promise.all([
    fetchCexKlines({ baseUrl, signal, headers, cacheMs, ...cex }),
    dex.pool ? fetchDexCandles({ baseUrl, signal, headers, cacheMs, ...dex }) : Promise.resolve([]),
  ]);
  return { cex: cexData, dex: dexData };
}