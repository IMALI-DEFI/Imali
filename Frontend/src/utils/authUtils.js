// src/utils/authUtils.js
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const TOKEN_KEY = "imali_token";

/* =========================
   TOKEN HELPERS (RAW JWT)
========================= */
export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  if (!token || typeof token !== "string") return false;
  localStorage.setItem(TOKEN_KEY, token); // RAW JWT ONLY
  return true;
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

/* =========================
   SERVER AUTH CHECK
========================= */
export const checkAuthStatus = async () => {
  const token = getToken();
  if (!token) return { authenticated: false };

  try {
    const res = await axios.get(`${API_BASE}/api/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      authenticated: true,
      user: res.data?.user || res.data,
    };
  } catch (err) {
    if (err.response?.status === 401) clearToken();
    return { authenticated: false };
  }
};
