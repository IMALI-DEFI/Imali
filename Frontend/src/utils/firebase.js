// src/utils/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/* -------------------------- CRA-only env helper -------------------------- */
const getEnvVar = (key, fallback = "") => {
  // CRA uses process.env.REACT_APP_*
  if (typeof process !== "undefined" && process.env) {
    const value = process.env[key];
    // Return value if it exists and is not undefined/null
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return fallback;
};

// Debug: Log available Firebase env vars
if (process.env.NODE_ENV === 'development') {
  console.log('[Firebase Debug] Available env vars:');
  Object.keys(process.env)
    .filter(key => key.includes('FIREBASE') || key.includes('REACT_APP'))
    .forEach(key => {
      console.log(`  ${key}: ${process.env[key] ? '***SET***' : 'MISSING'}`);
    });
}

const firebaseConfig = {
  apiKey: getEnvVar("REACT_APP_FIREBASE_API_KEY"),
  authDomain: getEnvVar("REACT_APP_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnvVar("REACT_APP_FIREBASE_PROJECT_ID"),
  storageBucket: getEnvVar("REACT_APP_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnvVar("REACT_APP_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnvVar("REACT_APP_FIREBASE_APP_ID"),
};

function missingKeys(cfg) {
  const required = ["apiKey", "authDomain", "projectId", "appId"];
  return required.filter((k) => !cfg[k] || String(cfg[k]).trim() === "");
}

const missing = missingKeys(firebaseConfig);
const FIREBASE_READY = missing.length === 0;

// Show warning in development if Firebase is not configured
if (!FIREBASE_READY) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `[Firebase] Missing config: ${missing.join(", ")}. ` +
      `Please set REACT_APP_FIREBASE_* environment variables in .env file.`
    );
    console.warn('[Firebase] Firebase features will be disabled.');
  }
}

/* -------------------------- Initialize Firebase -------------------------- */
let app = null;
let db = null;

if (FIREBASE_READY) {
  try {
    // Check if already initialized
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      console.log('[Firebase] Successfully initialized');
    } else {
      app = getApps()[0];
      console.log('[Firebase] Using existing app instance');
    }
    db = getFirestore(app);
  } catch (error) {
    console.error('[Firebase] Initialization error:', error);
    FIREBASE_READY = false;
  }
}

export { db };
export const FIREBASE_ENABLED = FIREBASE_READY;

/* -------------------------- Utility Functions -------------------------- */
export function normalizeUserId(id) {
  if (!id) return "";
  const s = String(id).trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(s)) return s.toLowerCase();
  return s;
}

// Firebase collection name
const COLLECTION = "imali_users";

const userConverter = {
  toFirestore(data) {
    const { strategy, tier, updatedAt, createdAt, wallet } = data;
    return { strategy, tier, updatedAt, createdAt, wallet };
  },
  fromFirestore(snapshot) {
    const d = snapshot.data();
    return { id: snapshot.id, ...d };
  },
};

export async function getUserData(userIdOrWallet) {
  const id = normalizeUserId(userIdOrWallet);
  if (!id) return null;
  if (!db) {
    console.warn('[Firebase] Database not available. Check Firebase configuration.');
    return null;
  }

  try {
    const ref = doc(db, COLLECTION, id).withConverter(userConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error("getUserData error:", err);
    return null;
  }
}

export async function upsertUser(userIdOrWallet, fields = {}) {
  const id = normalizeUserId(userIdOrWallet);
  if (!id) throw new Error("Missing user id / wallet.");
  if (!db) {
    const error = "Firebase not configured. Please check environment variables.";
    console.error(error);
    return { ok: false, error };
  }

  try {
    const ref = doc(db, COLLECTION, id).withConverter(userConverter);
    const snap = await getDoc(ref);
    const base = snap.exists()
      ? {}
      : { createdAt: serverTimestamp(), wallet: /^0x/.test(id) ? id : undefined };

    await setDoc(ref, { ...base, ...fields, updatedAt: serverTimestamp() }, { merge: true });
    return { ok: true };
  } catch (err) {
    console.error("upsertUser error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
}

export async function saveUserStrategy(userIdOrWallet, strategy) {
  if (!userIdOrWallet) throw new Error("Missing user id / wallet.");
  return upsertUser(userIdOrWallet, { strategy });
}
