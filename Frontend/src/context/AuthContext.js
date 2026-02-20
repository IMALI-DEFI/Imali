import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import BotAPI from "../utils/BotAPI";

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

/* -------------------------------------------------------
   Retry Helper — more patient, backs off properly
-------------------------------------------------------- */
const retry = async (fn, retries = 3, delay = 1500) => {
  try {
    return await fn();
  } catch (err) {
    const status = err?.response?.status;
    const isRetryable =
      status === 429 ||
      status >= 500 ||
      err.code === "ERR_NETWORK" ||
      err.code === "ECONNABORTED";

    if (retries > 0 && isRetryable) {
      console.warn(
        `[retry] ${status || err.code} — waiting ${delay}ms, ${retries} retries left`
      );
      await new Promise((r) => setTimeout(r, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw err;
  }
};

/* -------------------------------------------------------
   Is the error an auth failure (should clear token)?
-------------------------------------------------------- */
const isAuthError = (err) => {
  const status = err?.response?.status;
  return status === 401 || status === 403;
};

/* =======================================================
   AUTH PROVIDER
======================================================= */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activation, setActivation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Guard against double-loading on mount (React StrictMode)
  const initialLoadDone = useRef(false);
  // Guard against concurrent loadUserData calls
  const loadingLock = useRef(false);

  /* -------------------------------------------------------
     Refresh ONLY activation (lightweight, no user refetch)
  -------------------------------------------------------- */
  const refreshActivation = useCallback(async () => {
    if (!BotAPI.isLoggedIn()) return null;

    try {
      const raw = await retry(() => BotAPI.activationStatus());
      const fresh = raw?.status ?? raw ?? null;

      console.log("[AuthContext] refreshActivation →", fresh);

      setActivation((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(fresh)) return prev;
        return fresh;
      });

      return fresh;
    } catch (err) {
      console.error("[AuthContext] refreshActivation failed:", err);
      // Only clear on auth errors
      if (isAuthError(err)) {
        BotAPI.clearToken();
        setUser(null);
        setActivation(null);
      }
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
        if (JSON.stringify(prev) === JSON.stringify(fresh)) return prev;
        return fresh;
      });

      return fresh;
    } catch (err) {
      console.error("[AuthContext] refreshProfile failed:", err);
      if (isAuthError(err)) {
        BotAPI.clearToken();
        setUser(null);
        setActivation(null);
      }
      return null;
    }
  }, []);

  /* -------------------------------------------------------
     Load User + Activation Together (Full Refresh)
     — Sequential to avoid hammering the API with parallel calls
     — Only clears token on 401/403, NOT on 429/network errors
  -------------------------------------------------------- */
  const loadUserData = useCallback(async () => {
    if (!BotAPI.isLoggedIn()) {
      console.log("[AuthContext] loadUserData — no token, skipping");
      setUser(null);
      setActivation(null);
      setLoading(false);
      return;
    }

    // Prevent concurrent calls
    if (loadingLock.current) {
      console.log("[AuthContext] loadUserData — already loading, skipping");
      return;
    }

    loadingLock.current = true;

    try {
      setLoading(true);

      // Sequential fetching to avoid 429 rate limits
      console.log("[AuthContext] loadUserData — fetching /me...");
      const userRaw = await retry(() => BotAPI.me());
      const userData = userRaw?.user ?? userRaw ?? null;
      setUser(userData);

      // Small delay between calls to respect rate limits
      await new Promise((r) => setTimeout(r, 500));

      console.log("[AuthContext] loadUserData — fetching /activation-status...");
      const activationRaw = await retry(() => BotAPI.activationStatus());
      const activationData = activationRaw?.status ?? activationRaw ?? null;
      setActivation(activationData);

      console.log("[AuthContext] loadUserData complete →", {
        user: userData,
        activation: activationData,
      });
    } catch (err) {
      console.error("[AuthContext] loadUserData failed:", err);

      if (isAuthError(err)) {
        // Real auth failure — clear everything
        console.warn("[AuthContext] Auth failure — clearing session");
        BotAPI.clearToken();
        setUser(null);
        setActivation(null);
      } else {
        // Transient error (429, 500, network) — keep token intact
        // User stays "authenticated" even though data didn't load
        console.warn(
          "[AuthContext] Transient error — keeping token, user may retry"
        );
      }
    } finally {
      setLoading(false);
      loadingLock.current = false;
    }
  }, []);

  /* -------------------------------------------------------
     Initial Load — only once
  -------------------------------------------------------- */
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    loadUserData();
  }, [loadUserData]);

  /* -------------------------------------------------------
     refreshUser — backwards-compatible alias
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
     Login — saves token, then loads user data with a delay
  -------------------------------------------------------- */
  const login = useCallback(async (email, password) => {
    try {
      const res = await BotAPI.login({ email, password });

      console.log("[AuthContext] login success, token saved");

      // Small delay before loading user data to let the
      // server settle (avoids immediate 429 after login)
      await new Promise((r) => setTimeout(r, 500));

      // Load user data but DON'T block navigation on failure
      loadUserData().catch((err) => {
        console.warn("[AuthContext] Post-login data load failed (non-blocking):", err);
      });

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
  }, [loadUserData]);

  /* -------------------------------------------------------
     Signup — creates account only, no auto-login
  -------------------------------------------------------- */
  const signup = useCallback(async (data) => {
    try {
      const res = await BotAPI.signup(data);

      // If backend returns a token on signup, save it
      if (res?.token) {
        BotAPI.setToken(res.token);
        console.log("[AuthContext] signup returned token, saved");
      }

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
  }, []);

  /* -------------------------------------------------------
     Logout
  -------------------------------------------------------- */
  const logout = useCallback(() => {
    BotAPI.clearToken();
    setUser(null);
    setActivation(null);
    initialLoadDone.current = false;
    loadingLock.current = false;
  }, []);

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
      isAuthenticated: !!user || BotAPI.isLoggedIn(),
      hasToken: BotAPI.isLoggedIn,

      // Setters (for edge-case manual updates)
      setUser,
      setActivation,

      // Actions
      login,
      signup,
      logout,

      // Refresh functions
      refreshUser,
      refreshActivation,
      refreshProfile,
    }),
    [
      user,
      activation,
      loading,
      activationComplete,
      login,
      signup,
      logout,
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
