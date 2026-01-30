// src/utils/firebase.js
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

/* =========================================================
   Firebase config (CRA only — injected at build time)
   ========================================================= */
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId:
    process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "",
};

/* =========================================================
   Detect whether Firebase is actually usable
   ========================================================= */
const REQUIRED_KEYS = ["apiKey", "authDomain", "projectId", "appId"];

const firebaseEnabled = REQUIRED_KEYS.every(
  (k) => Boolean(firebaseConfig[k])
);

if (!firebaseEnabled) {
  console.warn(
    "[firebase] Disabled — missing REACT_APP_FIREBASE_* env vars. " +
      "Firestore features will be no-ops."
  );
}

/* =========================================================
   Initialize Firebase ONCE (or not at all)
   ========================================================= */
let app = null;
let db = null;

if (firebaseEnabled) {
  try {
    const apps = getApps();
    app = apps.length ? apps[0] : initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (err) {
    console.error("[firebase] Initialization failed:", err);
    app = null;
    db = null;
  }
}

export { db };

/* =========================================================
   Helpers
   ========================================================= */

/**
 * Normalize a user doc id (wallet or uid).
 * - Wallets are lowercased to avoid duplicates
 */
export function normalizeUserId(id) {
  if (!id) return "";
  const s = String(id).trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(s)) return s.toLowerCase();
  return s;
}

const COLLECTION = "users"; // change to "imali_users" if needed

/* =========================================================
   Firestore accessors (SAFE no-ops when disabled)
   ========================================================= */

export async function getUserData(userIdOrWallet) {
  if (!db) return null;

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
  if (!db) {
    return { ok: false, error: "Firebase disabled" };
  }

  const id = normalizeUserId(userIdOrWallet);
  if (!id) {
    return { ok: false, error: "Missing user id / wallet" };
  }

  try {
    const ref = doc(db, COLLECTION, id);
    const snap = await getDoc(ref);

    const base = snap.exists()
      ? {}
      : {
          createdAt: serverTimestamp(),
          wallet: /^0x/i.test(id) ? id : undefined,
        };

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

export async function saveUserStrategy(userIdOrWallet, strategy) {
  if (!userIdOrWallet) {
    return { ok: false, error: "Missing user id / wallet" };
  }
  return upsertUser(userIdOrWallet, { strategy });
}
