// src/utils/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/* -------------------------- Env helpers (CRA + Vite) -------------------------- */
const E = (k, fallback = "") => {
  try {
    // Vite: import.meta.env.VITE_*
    if (typeof import.meta !== "undefined" && import.meta?.env && k in import.meta.env) {
      const v = import.meta.env[k];
      return (v ?? fallback) || fallback;
    }
  } catch {
    // ignore
  }

  // CRA: process.env.REACT_APP_*
  try {
    if (typeof process !== "undefined" && process?.env && k in process.env) {
      const v = process.env[k];
      return (v ?? fallback) || fallback;
    }
  } catch {
    // ignore
  }

  return fallback;
};

const firebaseConfig = {
  apiKey: E("REACT_APP_FIREBASE_API_KEY") || E("VITE_FIREBASE_API_KEY"),
  authDomain: E("REACT_APP_FIREBASE_AUTH_DOMAIN") || E("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: E("REACT_APP_FIREBASE_PROJECT_ID") || E("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: E("REACT_APP_FIREBASE_STORAGE_BUCKET") || E("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId:
    E("REACT_APP_FIREBASE_MESSAGING_SENDER_ID") || E("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: E("REACT_APP_FIREBASE_APP_ID") || E("VITE_FIREBASE_APP_ID"),
};

function missingKeys(cfg) {
  const req = ["apiKey", "authDomain", "projectId", "appId"];
  return req.filter((k) => !cfg[k] || String(cfg[k]).trim() === "");
}

const missing = missingKeys(firebaseConfig);
const FIREBASE_READY = missing.length === 0;

// ✅ Don’t crash production. Just disable Firebase features if not configured.
if (!FIREBASE_READY) {
  // eslint-disable-next-line no-console
  console.warn(
    `[firebase] Missing config (${missing.join(", ")}). Firebase features are disabled until env vars are set.`
  );
}

/* -------------------------- Init (SAFE) -------------------------- */
let app = null;
let db = null;

if (FIREBASE_READY) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  db = getFirestore(app);
}

export { db };
export const FIREBASE_ENABLED = FIREBASE_READY;

/* -------------------------- Helpers -------------------------- */
export function normalizeUserId(id) {
  if (!id) return "";
  const s = String(id).trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(s)) return s.toLowerCase();
  return s;
}

// ✅ IMPORTANT: match your real collection name.
// If your backend/telegram uses "imali_users", use that here too.
const COLLECTION = "imali_users"; // <- change if needed

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
  if (!db) return null; // ✅ Firebase not configured

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
  if (!db) return { ok: false, error: "Firebase not configured." }; // ✅ no crash

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
