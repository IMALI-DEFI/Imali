// src/utils/firebaseConfig.js
// CRA-safe Firebase config (react-scripts)

const getEnv = (key) => {
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  return undefined;
};

export const firebaseConfig = {
  apiKey: getEnv("REACT_APP_FIREBASE_API_KEY"),
  authDomain: getEnv("REACT_APP_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("REACT_APP_FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("REACT_APP_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("REACT_APP_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("REACT_APP_FIREBASE_APP_ID"),
};

// Optional dev warning (CRA)
if (process.env.NODE_ENV === "development") {
  for (const [k, v] of Object.entries(firebaseConfig)) {
    if (!v) console.warn(`[firebaseConfig] Missing env var: ${k}`);
  }
}
