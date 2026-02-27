// src/context/AuthContext.js
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
   Retry Helper — respects rate limits with exponential backoff
-------------------------------------------------------- */
const retry = async (fn, retries = 3, delay = 2000) => {
  try {
    return await fn();
  } catch (err) {
    const status = err?.response?.status;

    // NEVER retry 401 or 403 — those are permission issues, not transient
    if (status === 401 || status === 403) {
      throw err;
    }

    const isRetryable =
      status === 429 ||
      status >= 500 ||
      err.code === "ERR_NETWORK" ||
      err.code === "ECONNABORTED";

    if (retries > 0 && isRetryable) {
      // For 429, check Retry-After header
      let waitTime = delay;
      if (status === 429) {
        const retryAfter = err?.response?.headers?.["retry-after"];
        if (retryAfter) {
          waitTime = Math.max(parseInt(retryAfter, 10) * 1000, delay);
        }
      }

      console.warn(
        `[retry] ${status || err.code} — waiting ${waitTime}ms, ${retries} retries left`
      );
      await new Promise((r) => setTimeout(r, waitTime));
      return retry(fn, retries - 1, delay * 2);
    }
    throw err;
  }
};

/* -------------------------------------------------------
   Error Classification
   401 = not authenticated (clear token, redirect)
   403 = authenticated but wrong role (DON'T clear token)
   429 = rate limited (retry)
-------------------------------------------------------- */
const isSessionExpired = (err) => err?.response?.status === 401;
const isForbidden = (err) => err?.response?.status === 403;
const isRateLimited = (err) => err?.response?.status === 429;

/* =======================================================
   AUTH PROVIDER
======================================================= */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activation, setActivation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const initialLoadDone = useRef(false);
  const loadingLock = useRef(false);

  /* -------------------------------------------------------
     Refresh ONLY activation (lightweight)
  -------------------------------------------------------- */
  const refreshActivation = useCallback(async () => {
    if (!BotAPI.isLoggedIn()) return null;

    try {
      // The correct endpoint from your API is /api/me/activation-status
      const raw = await retry(() => BotAPI.activationStatus());
      // The API returns the status directly
      const fresh = raw?.status ?? raw ?? null;

      console.log("[AuthContext] refreshActivation →", fresh);
      setAuthError(null);

      setActivation((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(fresh)) return prev;
        return fresh;
      });

      return fresh;
    } catch (err) {
      console.error("[AuthContext] refreshActivation failed:", err);

      if (isSessionExpired(err)) {
        BotAPI.clearToken();
        setUser(null);
        setActivation(null);
      } else if (isForbidden(err)) {
        const msg = err?.response?.data?.message || "Forbidden";
        console.error(`[AuthContext] 403 on activation-status: "${msg}"`);
        setAuthError(
          `Cannot load activation status: "${msg}".`
        );
        // Set a safe default so the UI doesn't break
        setActivation((prev) =>
          prev || {
            billing_complete: false,
            okx_connected: false,
            alpaca_connected: false,
            wallet_connected: false,
            trading_enabled: false,
            _error: "forbidden",
          }
        );
      } else if (isRateLimited(err)) {
        console.warn("[AuthContext] Rate limited on refreshActivation — will retry later");
        // Don't set error — this is transient
      }
      return null;
    }
  }, []);

  /* -------------------------------------------------------
     Refresh ONLY user profile (lightweight)
  -------------------------------------------------------- */
  const refreshProfile = useCallback(async () => {
    if (!BotAPI.isLoggedIn()) return null;

    try {
      // /api/me returns user data directly
      const raw = await retry(() => BotAPI.me());
      // The API returns user object directly
      const fresh = raw?.user ?? raw ?? null;

      console.log("[AuthContext] refreshProfile →", fresh);

      setUser((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(fresh)) return prev;
        return fresh;
      });

      return fresh;
    } catch (err) {
      console.error("[AuthContext] refreshProfile failed:", err);
      if (isSessionExpired(err)) {
        BotAPI.clearToken();
        setUser(null);
        setActivation(null);
      } else if (isForbidden(err)) {
        setAuthError("Cannot load profile — 403 Forbidden on /api/me");
      }
      return null;
    }
  }, []);

  /* -------------------------------------------------------
     Load User + Activation Together (Full Refresh)
  -------------------------------------------------------- */
  const loadUserData = useCallback(async () => {
    if (!BotAPI.isLoggedIn()) {
      console.log("[AuthContext] loadUserData — no token, skipping");
      setUser(null);
      setActivation(null);
      setLoading(false);
      return;
    }

    if (loadingLock.current) {
      console.log("[AuthContext] loadUserData — already loading, skipping");
      return;
    }

    loadingLock.current = true;
    setAuthError(null);

    try {
      setLoading(true);

      // ── Fetch /api/me ──────────────────────────────────
      let userData = null;
      try {
        console.log("[AuthContext] loadUserData — fetching /api/me...");
        const userRaw = await retry(() => BotAPI.me());
        // The API returns user data directly
        userData = userRaw?.user ?? userRaw ?? null;
        setUser(userData);
        console.log("[AuthContext] /api/me OK:", userData?.email);
      } catch (meErr) {
        if (isSessionExpired(meErr)) {
          console.warn("[AuthContext] 401 on /api/me — session expired");
          BotAPI.clearToken();
          setUser(null);
          setActivation(null);
          return;
        }
        if (isForbidden(meErr)) {
          setAuthError("403 on /api/me — backend route has admin guard");
        }
        console.warn("[AuthContext] /api/me failed:", meErr?.response?.status, meErr.message);
      }

      // Delay between calls to respect rate limits
      await new Promise((r) => setTimeout(r, 800));

      // ── Fetch /api/me/activation-status ───────────────────
      try {
        console.log("[AuthContext] loadUserData — fetching /api/me/activation-status...");
        const activationRaw = await retry(() => BotAPI.activationStatus());
        // The API returns activation status directly
        const activationData = activationRaw?.status ?? activationRaw ?? null;
        setActivation(activationData);
        console.log("[AuthContext] /api/me/activation-status OK:", activationData);
      } catch (actErr) {
        if (isSessionExpired(actErr)) {
          BotAPI.clearToken();
          setUser(null);
          setActivation(null);
          return;
        }
        if (isForbidden(actErr)) {
          const msg = actErr?.response?.data?.message || "Forbidden";
          console.error(`[AuthContext] 403 on /api/me/activation-status: "${msg}"`);
          setAuthError(
            `Activation status returned "${msg}".`
          );
          setActivation({
            billing_complete: false,
            okx_connected: false,
            alpaca_connected: false,
            wallet_connected: false,
            trading_enabled: false,
            _error: "forbidden",
          });
        } else if (isRateLimited(actErr)) {
          console.warn("[AuthContext] Rate limited on activation-status");
        }
        console.warn(
          "[AuthContext] /api/me/activation-status failed:",
          actErr?.response?.status,
          actErr.message
        );
      }

      console.log("[AuthContext] loadUserData complete");
    } catch (err) {
      console.error("[AuthContext] loadUserData unexpected error:", err);
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
     Activation Completion Logic
  -------------------------------------------------------- */
  const activationComplete = useMemo(() => {
    if (!user || !activation) return false;
    if (activation._error) return false;

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
  const login = useCallback(
    async (email, password) => {
      try {
        setAuthError(null);
        const res = await BotAPI.login({ email, password });

        console.log("[AuthContext] login success, token saved");

        // Generous delay before loading data — server just authenticated us
        await new Promise((r) => setTimeout(r, 800));

        loadUserData().catch((err) => {
          console.warn(
            "[AuthContext] Post-login data load failed (non-blocking):",
            err
          );
        });

        return { success: true, data: res };
      } catch (err) {
        console.error("[AuthContext] login error:", err);
        return {
          success: false,
          error:
            err.response?.data?.message || err.message || "Login failed",
        };
      }
    },
    [loadUserData]
  );

  /* -------------------------------------------------------
     Signup
  -------------------------------------------------------- */
  const signup = useCallback(async (data) => {
    try {
      setAuthError(null);
      const res = await BotAPI.signup(data);

      if (res?.token) {
        BotAPI.setToken(res.token);
        console.log("[AuthContext] signup returned token, saved");
      }

      return { success: true, data: res };
    } catch (err) {
      console.error("[AuthContext] signup error:", err);
      return {
        success: false,
        error:
          err.response?.data?.message || err.message || "Signup failed",
      };
    }
  }, []);

  /* -------------------------------------------------------
     Logout
  -------------------------------------------------------- */
  const logout = useCallback(() => {
    BotAPI.clearToken();
    BotAPI.clearCache();
    setUser(null);
    setActivation(null);
    setAuthError(null);
    initialLoadDone.current = false;
    loadingLock.current = false;
  }, []);

  /* -------------------------------------------------------
     Context Value
  -------------------------------------------------------- */
  const value = useMemo(
    () => ({
      user,
      activation,
      loading,
      activationComplete,
      authError,
      isAuthenticated: !!user || BotAPI.isLoggedIn(),
      hasToken: BotAPI.isLoggedIn,

      setUser,
      setActivation,

      login,
      signup,
      logout,

      refreshUser,
      refreshActivation,
      refreshProfile,
    }),
    [
      user,
      activation,
      loading,
      activationComplete,
      authError,
      login,
      signup,
      logout,
      refreshUser,
      refreshActivation,
      refreshProfile,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};
