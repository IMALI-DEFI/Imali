// src/utils/billingApi.js
import axios from "axios";

const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  "https://api.imali-defi.com";

const billingApi = axios.create({
  baseURL: `${API_BASE}/api/billing`,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

export async function createSetupIntent({ email, tier }) {
  if (!email) {
    throw new Error("Email required for billing");
  }

  const res = await billingApi.post("/setup-intent", {
    email,
    tier: tier || "starter",
  });

  if (!res?.data?.client_secret) {
    throw new Error("Stripe client_secret missing");
  }

  return res.data;
}
