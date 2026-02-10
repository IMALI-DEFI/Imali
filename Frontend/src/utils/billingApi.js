// src/utils/billingApi.js
import axios from "axios";

/* =====================================================
   CONFIG
===================================================== */
const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  "https://api.imali-defi.com";

const TOKEN_KEY = "imali_token";

/* =====================================================
   TOKEN HELPERS
===================================================== */
const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

/* =====================================================
   AXIOS INSTANCE
===================================================== */
const billingApi = axios.create({
  baseURL: `${API_BASE.replace(/\/$/, "")}/api/billing`,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

/* =====================================================
   AUTH INTERCEPTOR (THE FIX)
===================================================== */
billingApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* =====================================================
   ERROR NORMALIZER
===================================================== */
const unwrap = async (fn) => {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    const e = new Error(
      err?.response?.data?.message ||
      err?.response?.data?.detail ||
      err?.message ||
      "Billing request failed"
    );
    e.status = err?.response?.status;
    throw e;
  }
};

/* =====================================================
   BILLING API
===================================================== */
export async function createSetupIntent({ email, tier = "starter" }) {
  if (!email) {
    throw new Error("Email required for billing");
  }

  return unwrap(() =>
    billingApi.post("/setup-intent", {
      email: email.trim().toLowerCase(),
      tier,
    })
  );
}
