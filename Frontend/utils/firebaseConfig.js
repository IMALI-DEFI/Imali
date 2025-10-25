// src/utils/firebaseConfig.js
// Universal Firebase config for CRA & Vite environments

const getEnv = (key) => {
  if (typeof import.meta !== "undefined" && import.meta.env && key in import.meta.env) {
    return import.meta.env[key];
  }
  if (typeof process !== "undefined" && process.env && key in process.env) {
    return process.env[key];
  }
  return undefined;
};

export const firebaseConfig = {
  apiKey: getEnv("REACT_APP_FIREBASE_API_KEY") || getEnv("VITE_FIREBASE_API_KEY"),
  authDomain: getEnv("REACT_APP_FIREBASE_AUTH_DOMAIN") || getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("REACT_APP_FIREBASE_PROJECT_ID") || getEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("REACT_APP_FIREBASE_STORAGE_BUCKET") || getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("REACT_APP_FIREBASE_MESSAGING_SENDER_ID") || getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("REACT_APP_FIREBASE_APP_ID") || getEnv("VITE_FIREBASE_APP_ID"),
};

// Optional: Dev-time warning
if (import.meta.env?.MODE === "development") {
  for (const [key, val] of Object.entries(firebaseConfig)) {
    if (!val) console.warn(`[firebaseConfig] Missing environment variable for ${key}`);
  }
}