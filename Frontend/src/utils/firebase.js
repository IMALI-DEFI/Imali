// src/utils/firebase.js
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

/**
 * CRA-only env helper.
 * NOTE: CRA only exposes variables prefixed with REACT_APP_*
 */
const E = (k, fallback = undefined) => {
  if (typeof process !== "undefined" && process.env && process.env[k] != null) {
    return process.env[k];
  }
  return fallback;
};

const firebaseConfig = {
  apiKey: E("REACT_APP_FIREBASE_API_KEY"),
  authDomain: E("REACT_APP_FIREBASE_AUTH_DOMAIN"),
  projectId: E("REACT_APP_FIREBASE_PROJECT_ID"),
  storageBucket: E("REACT_APP_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: E("REACT_APP_FIREBASE_MESSAGING_SENDER_ID"),
  appId: E("REACT_APP_FIREBASE_APP_ID"),
};

if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
  // eslint-disable-next-line no-console
  console.warn(
    "[firebase] Missing config (apiKey/authDomain/projectId/appId). " +
      "Check Netlify env vars: REACT_APP_FIREBASE_*"
  );
}

// Initialize Firebase once
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

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