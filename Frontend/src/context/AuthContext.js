// src/context/AuthContext.js
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo
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
     Load User + Activation Together (Single Source)
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

      const userData = await retry(() => BotAPI.me());
      const activationData = await retry(() =>
        BotAPI.activationStatus()
      );

      setUser(userData?.user || userData || null);
      setActivation(activationData?.status || activationData || null);
    } catch (err) {
      console.error("Auth load failed:", err);
      BotAPI.clearToken();
      setUser(null);
      setActivation(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  /* -------------------------------------------------------
     Activation Completion Logic (Pure + Safe)
  -------------------------------------------------------- */
  const activationComplete = useMemo(() => {
    if (!user || !activation) return false;

    const tier = (user.tier || "starter").toLowerCase();

    if (!activation.billing_complete) return false;

    const needsOkx = ["starter", "pro", "bundle"].includes(tier);
    const needsAlpaca = ["starter", "bundle"].includes(tier);
    const needsWallet = ["elite", "stock", "bundle"].includes(tier);

    const okxOk = !needsOkx || activation.okx_connected;
    const alpacaOk = !needsAlpaca || activation.alpaca_connected;
    const walletOk = !needsWallet || activation.wallet_connected;

    return okxOk && alpacaOk && walletOk && activation.trading_enabled;
  }, [user, activation]);

  /* -------------------------------------------------------
     Login
  -------------------------------------------------------- */
  const login = async (email, password) => {
    try {
      const res = await BotAPI.login({ email, password });
      await loadUserData();
      return { success: true, data: res };
    } catch (err) {
      return {
        success: false,
        error:
          err.response?.data?.message ||
          err.message ||
          "Login failed"
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
          "Signup failed"
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
     Soft Refresh (Safe for toggles)
  -------------------------------------------------------- */
  const refreshUser = async () => {
    await loadUserData();
  };

  /* -------------------------------------------------------
     Context Value
  -------------------------------------------------------- */
  const value = {
    user,
    activation,
    setActivation, // safe update hook
    loading,
    activationComplete,
    login,
    signup,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    hasToken: BotAPI.isLoggedIn
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
