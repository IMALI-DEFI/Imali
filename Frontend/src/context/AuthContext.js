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

const isSessionExpired = (err) => err?.response?.status === 401;
const isForbidden = (err) => err?.response?.status === 403;
const isRateLimited = (err) => err?.response?.status === 429;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activation, setActivation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const initialLoadDone = useRef(false);
  const loadingLock = useRef(false);

  // ========================
  // Refresh activation status
  // ========================
  const refreshActivation = useCallback(async () => {
    if (!BotAPI.isLoggedIn()) return null;

    try {
      const response = await BotAPI.activationStatus();
      // API returns { success: true, status: {...} }
      const fresh = response?.status || response || null;

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
        setAuthError("Cannot load activation status");
        setActivation({
          has_card_on_file: false,
          trading_enabled: false,
          wallet_connected: false,
          okx_connected: false,
          alpaca_connected: false,
          tier_requirements_met: false,
          activation_complete: false,
          _error: "forbidden",
        });
      }
      return null;
    }
  }, []);

  // ========================
  // Refresh user profile
  // ========================
  const refreshProfile = useCallback(async () => {
    if (!BotAPI.isLoggedIn()) return null;

    try {
      const response = await BotAPI.me();
      // API returns { success: true, user: {...} }
      const fresh = response?.user || response || null;

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
      }
      return null;
    }
  }, []);

  // ========================
  // Load all user data
  // ========================
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

      // Fetch user profile
      try {
        console.log("[AuthContext] loadUserData — fetching /api/me...");
        const response = await BotAPI.me();
        const userData = response?.user || response || null;
        setUser(userData);
        console.log("[AuthContext] /api/me OK:", userData?.email);
      } catch (meErr) {
        if (isSessionExpired(meErr)) {
          BotAPI.clearToken();
          setUser(null);
          setActivation(null);
          return;
        }
        console.warn("[AuthContext] /api/me failed:", meErr.message);
      }

      // Delay between calls
      await new Promise((r) => setTimeout(r, 500));

      // Fetch activation status
      try {
        console.log("[AuthContext] loadUserData — fetching activation status...");
        const response = await BotAPI.activationStatus();
        const activationData = response?.status || response || null;
        setActivation(activationData);
        console.log("[AuthContext] activation status OK:", activationData);
      } catch (actErr) {
        if (isSessionExpired(actErr)) {
          BotAPI.clearToken();
          setUser(null);
          setActivation(null);
          return;
        }
        console.warn("[AuthContext] activation status failed:", actErr.message);
      }
    } finally {
      setLoading(false);
      loadingLock.current = false;
    }
  }, []);

  // ========================
  // Initial load
  // ========================
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    loadUserData();
  }, [loadUserData]);

  // ========================
  // Activation completion logic
  // ========================
  const activationComplete = useMemo(() => {
    if (!user || !activation) return false;
    if (activation._error) return false;

    const tier = (user.tier || "starter").toLowerCase();

    // Check billing completion
    const billingComplete = activation.has_card_on_file === true;
    if (!billingComplete) return false;

    const needsOkx = ["starter", "pro", "bundle"].includes(tier);
    const needsAlpaca = ["starter", "bundle"].includes(tier);
    const needsWallet = ["elite", "stock", "bundle"].includes(tier);

    const okxOk = !needsOkx || activation.okx_connected === true;
    const alpacaOk = !needsAlpaca || activation.alpaca_connected === true;
    const walletOk = !needsWallet || activation.wallet_connected === true;
    const tradingOk = activation.trading_enabled === true;

    return okxOk && alpacaOk && walletOk && tradingOk;
  }, [user, activation]);

  // ========================
  // Login
  // ========================
  const login = useCallback(
    async (email, password) => {
      try {
        setAuthError(null);
        console.log("[AuthContext] login attempt for:", email);

        const result = await BotAPI.login({ email, password });

        if (result.twofaRequired) {
          return {
            success: true,
            twofaRequired: true,
            tempToken: result.tempToken,
          };
        }

        // Load user data after successful login
        await loadUserData();

        return { success: true, data: result.data };
      } catch (err) {
        console.error("[AuthContext] login error:", err);

        let errorMessage = "Login failed";
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.message) {
          errorMessage = err.message;
        }

        // Handle specific error codes
        if (err.response?.status === 401) {
          errorMessage = "Invalid email or password";
        } else if (err.response?.status === 429) {
          errorMessage = "Too many attempts. Please try again later.";
        }

        return {
          success: false,
          error: errorMessage,
          status: err.response?.status,
        };
      }
    },
    [loadUserData]
  );

  // ========================
  // Signup
  // ========================
  const signup = useCallback(async (userData) => {
    try {
      setAuthError(null);
      console.log("[AuthContext] signup attempt for:", userData.email);

      const result = await BotAPI.signup(userData);

      return { success: true, data: result.data };
    } catch (err) {
      console.error("[AuthContext] signup error:", err);

      let errorMessage = "Signup failed";
      let errorCode = null;

      if (err.response) {
        errorCode = err.response.data?.error;
        errorMessage = err.response.data?.message || err.message;

        // Handle specific error codes
        if (errorCode === "user_exists") {
          errorMessage = "An account with this email already exists. Please login instead.";
        } else if (errorCode === "password_too_short") {
          errorMessage = err.response.data?.message || "Password must be at least 8 characters";
        } else if (errorCode === "email_required") {
          errorMessage = "Please enter a valid email address";
        } else if (err.response?.status === 429) {
          errorMessage = "Too many attempts. Please wait a moment and try again.";
        } else if (err.response?.status >= 500) {
          errorMessage = "Server error. Please try again later.";
        }
      } else if (err.message === "Network Error") {
        errorMessage = "Unable to connect to server. Please check your connection.";
      }

      return {
        success: false,
        error: errorMessage,
        errorCode: errorCode,
        status: err.response?.status,
      };
    }
  }, []);

  // ========================
  // Logout
  // ========================
  const logout = useCallback(() => {
    BotAPI.clearToken();
    setUser(null);
    setActivation(null);
    setAuthError(null);
    initialLoadDone.current = false;
    loadingLock.current = false;
  }, []);

  // ========================
  // Context value
  // ========================
  const value = useMemo(
    () => ({
      user,
      activation,
      loading,
      activationComplete,
      authError,
      isAuthenticated: !!user || BotAPI.isLoggedIn(),
      hasToken: BotAPI.isLoggedIn(),

      setUser,
      setActivation,

      login,
      signup,
      logout,

      refreshUser: loadUserData,
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
      loadUserData,
      refreshActivation,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
