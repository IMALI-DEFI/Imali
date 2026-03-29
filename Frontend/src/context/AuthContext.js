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
import { useLocation } from "react-router-dom";
import BotAPI from "../utils/BotAPI";

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

const isSessionExpired = (err) => err?.response?.status === 401;

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/pricing",
  "/about",
  "/terms",
  "/privacy",
  "/support",
  "/public",
  "/public-dashboard",
  "/live",
  "/trading",
  "/referrals",
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activation, setActivation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const location = useLocation();
  const bootstrappedRef = useRef(false);
  const loadingRef = useRef(false);

  const getPathname = useCallback(() => {
    return location?.pathname || window.location.pathname || "/";
  }, [location]);

  const isPublicRoute = useCallback(() => {
    const pathname = getPathname();
    return PUBLIC_ROUTES.includes(pathname);
  }, [getPathname]);

  const hasToken = useCallback(() => {
    return !!BotAPI.getToken();
  }, []);

  const clearAuthState = useCallback(() => {
    BotAPI.clearToken();
    setUser(null);
    setActivation(null);
    setAuthError(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!hasToken()) return null;

    const response = await BotAPI.me();
    const freshUser = response?.user || response || null;
    setUser(freshUser);
    return freshUser;
  }, [hasToken]);

  const refreshActivation = useCallback(async () => {
    if (!hasToken()) return null;

    const response = await BotAPI.activationStatus();
    const freshActivation = response?.status || response || null;
    setActivation(freshActivation);
    return freshActivation;
  }, [hasToken]);

  const loadUserData = useCallback(
    async ({ force = false } = {}) => {
      if (loadingRef.current && !force) return;

      const tokenPresent = hasToken();

      if (!tokenPresent) {
        setUser(null);
        setActivation(null);
        setLoading(false);
        return;
      }

      loadingRef.current = true;
      setLoading(true);
      setAuthError(null);

      try {
        const [profileResult, activationResult] = await Promise.allSettled([
          BotAPI.me(),
          BotAPI.activationStatus(),
        ]);

        if (profileResult.status === "fulfilled") {
          const freshUser = profileResult.value?.user || profileResult.value || null;
          setUser(freshUser);
        } else {
          throw profileResult.reason;
        }

        if (activationResult.status === "fulfilled") {
          const freshActivation =
            activationResult.value?.status || activationResult.value || null;
          setActivation(freshActivation);
        } else {
          const actErr = activationResult.reason;
          if (isSessionExpired(actErr)) {
            throw actErr;
          }
          setActivation(null);
        }
      } catch (err) {
        if (isSessionExpired(err)) {
          clearAuthState();
        } else {
          setAuthError(err?.message || "Failed to load account");
        }
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [hasToken, clearAuthState]
  );

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    loadUserData({ force: true });
  }, [loadUserData]);

  useEffect(() => {
    if (!hasToken()) {
      setUser(null);
      setActivation(null);
      setLoading(false);
      return;
    }

    if (!isPublicRoute()) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, [location.pathname, hasToken, isPublicRoute, loadUserData]);

  const activationComplete = useMemo(() => {
    if (!user || !activation) return false;
    if (activation._error) return false;

    const tier = (user.tier || "starter").toLowerCase();
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

  const login = useCallback(
    async (email, password) => {
      try {
        setAuthError(null);

        const result = await BotAPI.login({ email, password });

        if (result.twofaRequired) {
          return {
            success: true,
            twofaRequired: true,
            tempToken: result.tempToken,
          };
        }

        if (!BotAPI.getToken()) {
          return {
            success: false,
            error: "Login succeeded but token was not saved.",
          };
        }

        await loadUserData({ force: true });

        return {
          success: true,
          data: result.data,
        };
      } catch (err) {
        let errorMessage = "Login failed";

        if (err.response?.status === 401) {
          errorMessage = "Invalid email or password";
        } else if (err.response?.status === 429) {
          errorMessage = "Too many attempts. Please try again later.";
        } else if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.message) {
          errorMessage = err.message;
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

  const signup = useCallback(async (userData) => {
    try {
      setAuthError(null);

      const result = await BotAPI.signup(userData);

      return {
        success: true,
        data: result.data,
        token: result.token || result?.data?.token || null,
      };
    } catch (err) {
      let errorMessage = "Signup failed";
      let errorCode = err.response?.data?.error || null;

      if (errorCode === "user_exists") {
        errorMessage = "An account with this email already exists. Please log in instead.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 429) {
        errorMessage = "Too many attempts. Please wait a moment and try again.";
      } else if (err.response?.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (err.message === "Network Error") {
        errorMessage = "Unable to connect to server. Please check your connection.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      return {
        success: false,
        error: errorMessage,
        errorCode,
        status: err.response?.status,
      };
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthState();
    bootstrappedRef.current = false;
    loadingRef.current = false;
  }, [clearAuthState]);

  const value = useMemo(
    () => ({
      user,
      activation,
      loading,
      activationComplete,
      authError,
      isAuthenticated: !!user || hasToken(),
      hasToken: hasToken(),
      isPublicRoute: isPublicRoute(),

      setUser,
      setActivation,

      login,
      signup,
      logout,

      refreshUser: () => loadUserData({ force: true }),
      refreshProfile,
      refreshActivation,
    }),
    [
      user,
      activation,
      loading,
      activationComplete,
      authError,
      hasToken,
      isPublicRoute,
      login,
      signup,
      logout,
      loadUserData,
      refreshProfile,
      refreshActivation,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};