// src/utils/billingApi.js
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const TOKEN_KEY = "imali_token";

const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const billingApi = axios.create({
  baseURL: `${API_BASE}/api/billing`,
  headers: { "Content-Type": "application/json" },
});

/* 🔑 ALWAYS SEND RAW JWT */
billingApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function createSetupIntent({ email, tier = "starter" }) {
  if (!email) throw new Error("Email required");

  const res = await billingApi.post("/setup-intent", {
    email: email.trim().toLowerCase(),
    tier,
  });

  if (!res.data?.client_secret) {
    throw new Error("Stripe client_secret missing");
  }

  return res.data;
}
