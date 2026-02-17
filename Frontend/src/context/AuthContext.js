// src/context/AuthContext.js
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import BotAPI from "../utils/BotAPI";

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

/* -------------------------------------------------------
   Retry Helper (Safe + Controlled)
-------------------------------------------------------- */
const retry = async (fn, retries = 2, delay = 800) => {
  try {
    return await fn();
  } catch (err) {
    if (
      retries > 0 &&
      (err.response?.status === 429 || err.code === "ERR_NETWORK")
    ) {
      await new Promise((r) => setTimeout(r, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw err;
  }
};

/* =======================================================
   AUTH PROVIDER
======================================================= */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activation, setActivation] = useState(null);
  const [loading, setLoading] = useState(true);

  /* -------------------------------------------------------
     Refresh ONLY activation (lightweight, no user refetch)
     — Used after connect/toggle actions on the Activation page
  -------------------------------------------------------- */
  const refreshActivation = useCallback(async () => {
    if (!BotAPI.isLoggedIn()) return null;

    try {
      const raw = await retry(() => BotAPI.activationStatus());
      const fresh = raw?.status ?? raw ?? null;

      console.log("[AuthContext] refreshActivation →", fresh);

      // Functional update: avoids stale closure issues
      setActivation((prev) => {
        const prevJSON = JSON.stringify(prev);
        const freshJSON = JSON.stringify(fresh);
        // Skip no-op updates so downstream memos don't re-fire
        if (prevJSON === freshJSON) return prev;
        return fresh;
      });

      return fresh;
    } catch (err) {
      console.error("[AuthContext] refreshActivation failed:", err);
      return null;
    }
  }, []);

  /* -------------------------------------------------------
     Refresh ONLY user profile (lightweight, no activation)
  -------------------------------------------------------- */
  const refreshProfile = useCallback(async () => {
    if (!BotAPI.isLoggedIn()) return null;

    try {
      const raw = await retry(() => BotAPI.me());
      const fresh = raw?.user ?? raw ?? null;

      console.log("[AuthContext] refreshProfile →", fresh);

      setUser((prev) => {
        const prevJSON = JSON.stringify(prev);
        const freshJSON = JSON.stringify(fresh);
        if (prevJSON === freshJSON) return prev;
        return fresh;
      });

      return fresh;
    } catch (err) {
      console.error("[AuthContext] refreshProfile failed:", err);
      return null;
    }
  }, []);

  /* -------------------------------------------------------
     Load User + Activation Together (Full Refresh)
  -------------------------------------------------------- */
  const loadUserData = useCallback(async () => {
    if (!BotAPI.isLoggedIn()) {
      setUser(null);
      setActivation(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch both in parallel for speed
      const [userRaw, activationRaw] = await Promise.all([
        retry(() => BotAPI.me()),
        retry(() => BotAPI.activationStatus()),
      ]);

      const userData = userRaw?.user ?? userRaw ?? null;
      const activationData = activationRaw?.status ?? activationRaw ?? null;

      console.log("[AuthContext] loadUserData →", {
        user: userData,
        activation: activationData,
      });

      setUser(userData);
      setActivation(activationData);
    } catch (err) {
      console.error("[AuthContext] loadUserData failed:", err);
      BotAPI.clearToken();
      setUser(null);
      setActivation(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /* -------------------------------------------------------
     Initial Load
  -------------------------------------------------------- */
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  /* -------------------------------------------------------
     refreshUser — backwards-compatible alias
     Components that already call refreshUser() keep working.
     Now fetches both user + activation in parallel.
  -------------------------------------------------------- */
  const refreshUser = useCallback(async () => {
    console.log("[AuthContext] refreshUser called (full reload)");
    await loadUserData();
  }, [loadUserData]);

  /* -------------------------------------------------------
     Activation Completion Logic (Pure + Memoized)
  -------------------------------------------------------- */
  const activationComplete = useMemo(() => {
    if (!user || !activation) return false;

    const tier = (user.tier || "starter").toLowerCase();

    if (!activation.billing_complete) return false;

    const needsOkx = ["starter", "pro", "bundle"].includes(tier);
    const needsAlpaca = ["starter", "bundle"].includes(tier);
    const needsWallet = ["elite", "stock", "bundle"].includes(tier);

    const okxOk = !needsOkx || !!activation.okx_connected;
    const alpacaOk = !needsAlpaca || !!activation.alpaca_connected;
    const walletOk = !needsWallet || !!activation.wallet_connected;
    const tradingOk = !!activation.trading_enabled;

    const complete = okxOk && alpacaOk && walletOk && tradingOk;

    console.log("[AuthContext] activationComplete →", complete, {
      tier,
      billing: !!activation.billing_complete,
      okx: `need=${needsOkx} have=${!!activation.okx_connected}`,
      alpaca: `need=${needsAlpaca} have=${!!activation.alpaca_connected}`,
      wallet: `need=${needsWallet} have=${!!activation.wallet_connected}`,
      trading: tradingOk,
    });

    return complete;
  }, [user, activation]);

  /* -------------------------------------------------------
     Login
  -------------------------------------------------------- */
  const login = async (email, password) => {
    try {
      const res = await BotAPI.login({ email, password });
      // Full load after login so both user + activation are fresh
      await loadUserData();
      return { success: true, data: res };
    } catch (err) {
      return {
        success: false,
        error:
          err.response?.data?.message ||
          err.message ||
          "Login failed",
      };
    }
  };

  /* -------------------------------------------------------
     Signup
  -------------------------------------------------------- */
  const signup = async (data) => {
    try {
      const res = await BotAPI.signup(data);
      return { success: true, data: res };
    } catch (err) {
      return {
        success: false,
        error:
          err.response?.data?.message ||
          err.message ||
          "Signup failed",
      };
    }
  };

  /* -------------------------------------------------------
     Logout
  -------------------------------------------------------- */
  const logout = () => {
    BotAPI.clearToken();
    setUser(null);
    setActivation(null);
  };

  /* -------------------------------------------------------
     Context Value
  -------------------------------------------------------- */
  const value = useMemo(
    () => ({
      // State
      user,
      activation,
      loading,
      activationComplete,
      isAuthenticated: !!user,
      hasToken: BotAPI.isLoggedIn,

      // Setters (for edge-case manual updates)
      setUser,
      setActivation,

      // Actions
      login,
      signup,
      logout,

      // Refresh functions
      refreshUser,            // full reload (user + activation)
      refreshActivation,      // activation only (fast)
      refreshProfile,         // user profile only (fast)
    }),
    [
      user,
      activation,
      loading,
      activationComplete,
      refreshUser,
      refreshActivation,
      refreshProfile,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
