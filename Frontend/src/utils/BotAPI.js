import axios from "axios";

const IS_BROWSER = typeof window !== "undefined";
const TOKEN_KEY = "imali_token";

/* ---------------- Token helpers ---------------- */
const getToken = () =>
  IS_BROWSER ? localStorage.getItem(TOKEN_KEY) : null;

const setToken = (t) => {
  if (!IS_BROWSER) return;
  if (!t) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, t);
};

const clearToken = () => {
  if (IS_BROWSER) localStorage.removeItem(TOKEN_KEY);
};

/* ---------------- API base ---------------- */
const API_ORIGIN =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  (IS_BROWSER && window.location.hostname === "localhost"
    ? "http://localhost:8080"
    : "https://api.imali-defi.com");

const api = axios.create({
  baseURL: `${API_ORIGIN.replace(/\/+$/, "")}/api`,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

/* ---------------- Request interceptor ---------------- */
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ---------------- Response interceptor ---------------- */
/* ⚠️ DO NOT REDIRECT HERE */
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

/* ---------------- Error wrapper ---------------- */
async function call(fn) {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;

    const e = new Error(
      data?.message ||
      data?.detail ||
      data?.error ||
      "Request failed"
    );

    e.status = status;
    e.data = data;
    throw e;
  }
}

/* ---------------- Public API ---------------- */
const BotAPI = {
  /* Auth */
  signup: async (p) => {
    const d = await call(() => api.post("/signup", p));
    if (d?.token) setToken(d.token);
    return d;
  },

  login: async (p) => {
    const d = await call(() => api.post("/auth/login", p));
    if (d?.token) setToken(d.token);
    return d;
  },

  logout: () => clearToken(),
  isLoggedIn: () => !!getToken(),

  /* User */
  me: () => call(() => api.get("/me")),
  activationStatus: () => call(() => api.get("/me/activation-status")),

  /* Billing */
  billingSetupIntent: (p) =>
    call(() => api.post("/billing/setup-intent", p)),

  billingCardStatus: () =>
    call(() => api.get("/billing/card-status")),

  /* Trading */
  tradingEnable: (enabled) =>
    call(() => api.post("/trading/enable", { enabled })),

  /* Bot */
  botStart: (p = {}) =>
    call(() => api.post("/bot/start", p)),

  /* Trades */
  sniperTrades: () =>
    call(() => api.get("/sniper/trades")),
};

export default BotAPI;
