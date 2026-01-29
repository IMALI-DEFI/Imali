// src/utils/firebaseConfig.js
// Universal Firebase config for CRA & Vite environments

const IS_BROWSER = typeof window !== "undefined";

const getEnv = (key) => {
  // Node.js/React Native environment
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  
  // Browser environment
  if (IS_BROWSER) {
    // Check global injected config
    if (window.__FIREBASE_CONFIG__ && window.__FIREBASE_CONFIG__[key] !== undefined) {
      return window.__FIREBASE_CONFIG__[key];
    }
    
    // Check create-react-app style
    if (window.process?.env?.[key]) {
      return window.process.env[key];
    }
    
    // Check window object directly
    if (window[key]) {
      return window[key];
    }
  }
  
  return undefined;
};

export const firebaseConfig = {
  apiKey: getEnv("REACT_APP_FIREBASE_API_KEY") || getEnv("FIREBASE_API_KEY"),
  authDomain: getEnv("REACT_APP_FIREBASE_AUTH_DOMAIN") || getEnv("FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("REACT_APP_FIREBASE_PROJECT_ID") || getEnv("FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("REACT_APP_FIREBASE_STORAGE_BUCKET") || getEnv("FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("REACT_APP_FIREBASE_MESSAGING_SENDER_ID") || getEnv("FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("REACT_APP_FIREBASE_APP_ID") || getEnv("FIREBASE_APP_ID"),
};

// Optional: Dev-time warning
if ((typeof process !== 'undefined' && process.env.NODE_ENV === 'development') || 
    (IS_BROWSER && window.location.hostname === 'localhost')) {
  
  const missingKeys = Object.entries(firebaseConfig)
    .filter(([key, val]) => !val)
    .map(([key]) => key);
    
  if (missingKeys.length > 0) {
    console.warn(`[firebaseConfig] Missing Firebase config keys: ${missingKeys.join(', ')}`);
    console.warn('Make sure to set these environment variables or inject them via window.__FIREBASE_CONFIG__');
  }
}
