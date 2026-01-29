// src/utils/firebase.js
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// Use process.env directly - CRA injects these at build time
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Check if config is missing (development only)
if (process.env.NODE_ENV === 'development') {
  const required = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missing = required.filter(key => !firebaseConfig[key]);
  if (missing.length > 0) {
    console.warn(
      `[firebase] Missing config: ${missing.join(', ')}. ` +
      "Check Netlify env vars: REACT_APP_FIREBASE_*"
    );
  }
}

// Initialize Firebase once
let app;
try {
  const apps = getApps();
  app = apps.length ? apps[0] : initializeApp(firebaseConfig);
} catch (error) {
  console.error("Firebase initialization error:", error);
  // Create empty app with dummy config to prevent crashes
  app = initializeApp({
    apiKey: "dummy",
    authDomain: "dummy",
    projectId: "dummy",
    storageBucket: "dummy",
    messagingSenderId: "dummy",
    appId: "dummy"
  });
}

// Firestore instance
export const db = getFirestore(app);

/**
 * Normalize a user doc id (wallet or uid).
 * - for wallets: lower-case to prevent duplicates (backend can checksum)
 */
export function normalizeUserId(id) {
  if (!id) return "";
  const s = String(id).trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(s)) return s.toLowerCase();
  return s;
}

const COLLECTION = "users"; // change to "imali_users" if needed

export async function getUserData(userIdOrWallet) {
  const id = normalizeUserId(userIdOrWallet);
  if (!id) return null;

  try {
    const ref = doc(db, COLLECTION, id);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.error("getUserData error:", err);
    return null;
  }
}

export async function upsertUser(userIdOrWallet, fields = {}) {
  const id = normalizeUserId(userIdOrWallet);
  if (!id) throw new Error("Missing user id / wallet.");

  try {
    const ref = doc(db, COLLECTION, id);

    const snap = await getDoc(ref);
    const base = snap.exists()
      ? {}
      : { createdAt: serverTimestamp(), wallet: /^0x/i.test(id) ? id : undefined };

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
