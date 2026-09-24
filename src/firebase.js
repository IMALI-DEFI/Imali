// src/firebase.js
// Browser-side Firebase configuration for Google authentication.
// IMPORTANT: This uses Firebase WEB config only.
// Never put the Firebase service-account JSON/private key in the frontend.

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "imali-defi",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const missingRequired = [
  ["REACT_APP_FIREBASE_API_KEY", firebaseConfig.apiKey],
  ["REACT_APP_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain],
  ["REACT_APP_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
  ["REACT_APP_FIREBASE_APP_ID", firebaseConfig.appId],
].filter(([, value]) => !value);

if (missingRequired.length) {
  console.warn(
    "[Firebase] Missing frontend environment values:",
    missingRequired.map(([name]) => name).join(", ")
  );
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// An unavailable optional Google provider must not crash email login/session recovery.
let initializedAuth = null;
if (!missingRequired.length) {
  try { initializedAuth = getAuth(app); }
  catch { console.warn('[Firebase] Google sign-in unavailable; email login remains available.'); }
}
export const firebaseAuth = initializedAuth;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export async function getGoogleIdToken() {
  if (!firebaseAuth) throw new Error('Google sign-in is temporarily unavailable. Please sign in with email.');
  const result = await signInWithPopup(firebaseAuth, googleProvider);
  const token = await result.user.getIdToken(true);

  return {
    idToken: token,
    firebaseUser: result.user,
  };
}

export async function signOutGoogle() {
  if (!firebaseAuth) return;
  try {
    await firebaseSignOut(firebaseAuth);
  } catch (error) {
    console.warn("[Firebase] Google sign-out failed:", error?.message || error);
  }
}

export default app;
