// src/utils/firebase.js
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// ---------- Env helpers (CRA + Vite) ----------
const E = (k, fallback = undefined) => {
  // Vite: import.meta.env.VITE_*
  if (typeof import.meta !== "undefined" && import.meta.env && k in import.meta.env) {
    return import.meta.env[k] ?? fallback;
  }
  // CRA: process.env.REACT_APP_*
  if (typeof process !== "undefined" && process.env && k in process.env) {
    return process.env[k] ?? fallback;
  }
  return fallback;
};

// Expect the CRA-style keys; map them from Vite if needed in your .env:
// Vite example:
//   VITE_FIREBASE_API_KEY=xxx
//   ...
// and then set REACT_APP_* vars in build OR just change these keys to VITE_* names.
const firebaseConfig = {
  apiKey: E("REACT_APP_FIREBASE_API_KEY") || E("VITE_FIREBASE_API_KEY"),
  authDomain: E("REACT_APP_FIREBASE_AUTH_DOMAIN") || E("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: E("REACT_APP_FIREBASE_PROJECT_ID") || E("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: E("REACT_APP_FIREBASE_STORAGE_BUCKET") || E("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: E("REACT_APP_FIREBASE_MESSAGING_SENDER_ID") || E("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: E("REACT_APP_FIREBASE_APP_ID") || E("VITE_FIREBASE_APP_ID"),
};

if (!firebaseConfig.projectId) {
  // Fail fast with a clear message in dev
  // (avoid throwing in production if you want a softer fallback)
  // eslint-disable-next-line no-console
  console.warn("[firebase] Missing config. Check your .env variables.");
}

// Initialize Firebase once
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Firestore instance
export const db = getFirestore(app);

// ---------- Helpers ----------
/** Normalize a user doc id (wallet or uid).
 *  - For wallets: prefer EIP-55 checksum on backend; here we at least lower-case to avoid dupes.
 *  - For non-wallet UIDs: return as-is.
 */
export function normalizeUserId(id) {
  if (!id) return "";
  const s = String(id).trim();
  // naive wallet detection (0x + 40 hex chars). Replace with a checksumming utility if desired.
  if (/^0x[a-fA-F0-9]{40}$/.test(s)) return s.toLowerCase();
  return s;
}

// Optionally: a Firestore data converter to keep shape consistent
const userConverter = {
  toFirestore(data) {
    // only allow known fields
    const { strategy, tier, updatedAt, createdAt, wallet } = data;
    return { strategy, tier, updatedAt, createdAt, wallet };
  },
  fromFirestore(snapshot) {
    const d = snapshot.data();
    return { id: snapshot.id, ...d };
  },
};

const COLLECTION = "users"; // change to "imali_users" if that's your canonical name

/**
 * Fetch a user document by wallet address or uid.
 */
export async function getUserData(userIdOrWallet) {
  const id = normalizeUserId(userIdOrWallet);
  if (!id) return null;
  try {
    const ref = doc(db, COLLECTION, id).withConverter(userConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error("getUserData error:", err);
    // surface a consistent null; UI can decide to show a toast
    return null;
  }
}

/**
 * Upsert a user doc with fields you pass (e.g., strategy, tier).
 * Adds createdAt on first write and always updates updatedAt (server time).
 */
export async function upsertUser(userIdOrWallet, fields = {}) {
  const id = normalizeUserId(userIdOrWallet);
  if (!id) throw new Error("Missing user id / wallet.");

  try {
    const ref = doc(db, COLLECTION, id).withConverter(userConverter);

    // Determine if doc exists (to set createdAt once)
    const snap = await getDoc(ref);
    const base = snap.exists()
      ? {}
      : { createdAt: serverTimestamp(), wallet: /^0x/.test(id) ? id : undefined };

    await setDoc(
      ref,
      { ...base, ...fields, updatedAt: serverTimestamp() },
      { merge: true }
    );
    return { ok: true };
  } catch (err) {
    console.error("upsertUser error:", err);
    return { ok: false, error: String(err?.message || err) };
  }
}

/**
 * Save or update a user’s strategy (convenience wrapper).
 */
export async function saveUserStrategy(userIdOrWallet, strategy) {
  if (!userIdOrWallet) throw new Error("Missing user id / wallet.");
  return upsertUser(userIdOrWallet, { strategy });
}