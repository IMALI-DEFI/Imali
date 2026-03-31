// src/context/AuthContext.js (final version)
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BotAPI from "../utils/BotAPI";
import { wsService } from "../services/WebSocketService";
import { syncService } from "../services/SyncService";

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

const isSessionExpired = (err) => err?.response?.status === 401;
const ADMIN_EMAILS = ["wayne@imali-defi.com", "admin@imali-defi.com"];

const PUBLIC_ROUTES = [
  "/", "/login", "/signup", "/pricing", "/about", "/terms", "/privacy",
  "/support", "/public", "/public-dashboard", "/live", "/trading", "/referrals", "/after-login",
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activation, setActivation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOffline, setIsOffline] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const bootstrappedRef = useRef(false);
  const loadingRef = useRef(false);

  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      loadUserData({ force: true });
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getPathname = useCallback(() => location?.pathname || window.location.pathname || "/", [location]);
  const isPublicRoute = useCallback(() => PUBLIC_ROUTES.includes(getPathname()), [getPathname]);
  const hasToken = useCallback(() => !!BotAPI.getToken(), []);

  const clearAuthState = useCallback(() => {
    BotAPI.clearToken();
    setUser(null);
    setActivation(null);
    setAuthError(null);
    localStorage.removeItem("imali_activation");
    localStorage.removeItem("imali_user");
    sessionStorage.removeItem("imali_activation");
    sessionStorage.removeItem("imali_user");
    wsService.disconnect();
    syncService.stopAutoSync();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!hasToken()) return null;
    
    try {
      const response = await BotAPI.me();
      const freshUser = response?.user || response || null;
      if (freshUser) {
        freshUser.is_admin = freshUser.is_admin === true || ADMIN_EMAILS.includes(freshUser.email);
        localStorage.setItem("imali_user", JSON.stringify(freshUser));
      }
      setUser(freshUser);
      return freshUser;
    } catch (error) {
      console.error("[Auth] Failed to refresh profile:", error);
      if (isSessionExpired(error)) clearAuthState();
      return null;
    }
  }, [hasToken, clearAuthState]);

  const refreshActivation = useCallback(async () => {
    if (!hasToken()) return null;
    
    try {
      const response = await BotAPI.activationStatus();
      let freshActivation = response?.status || response || null;
      if (freshActivation) {
        freshActivation.has_card_on_file = !!freshActivation.has_card_on_file;
        freshActivation.billing_complete = !!freshActivation.billing_complete;
        freshActivation.okx_connected = !!freshActivation.okx_connected;
        freshActivation.alpaca_connected = !!freshActivation.alpaca_connected;
        freshActivation.wallet_connected = !!freshActivation.wallet_connected;
        freshActivation.trading_enabled = !!freshActivation.trading_enabled;
        freshActivation.activation_complete = !!freshActivation.activation_complete;
        localStorage.setItem("imali_activation", JSON.stringify(freshActivation));
      }
      setActivation(freshActivation);
      return freshActivation;
    } catch (error) {
      console.error("[Auth] Failed to refresh activation:", error);
      if (isSessionExpired(error)) clearAuthState();
      return null;
    }
  }, [hasToken, clearAuthState]);

  const loadUserData = useCallback(async ({ force = false } = {}) => {
    if (loadingRef.current && !force) return;
    if (isOffline) {
      setLoading(false);
      return;
    }

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
      // Load with retry logic
      let profileResult;
      let retries = 0;
      while (retries < 3) {
        try {
          profileResult = await BotAPI.me();
          break;
        } catch (err) {
          retries++;
          if (retries === 3) throw err;
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
      
      let freshUser = profileResult?.user || profileResult || null;
      if (freshUser) {
        freshUser.is_admin = freshUser.is_admin === true || ADMIN_EMAILS.includes(freshUser.email);
        localStorage.setItem("imali_user", JSON.stringify(freshUser));
      }
      setUser(freshUser);

      // Load activation with retry
      try {
        const activationResult = await BotAPI.activationStatus();
        let freshActivation = activationResult?.status || activationResult || null;
        if (freshActivation) {
          freshActivation.has_card_on_file = !!freshActivation.has_card_on_file;
          localStorage.setItem("imali_activation", JSON.stringify(freshActivation));
        }
        setActivation(freshActivation);
      } catch (actErr) {
        const cached = localStorage.getItem("imali_activation");
        if (cached) setActivation(JSON.parse(cached));
      }

      // Connect WebSocket and start sync
      if (freshUser) {
        wsService.connect(BotAPI.getToken());
        syncService.startAutoSync();
      }
      
    } catch (err) {
      console.error("[Auth] Failed to load user data:", err);
      if (isSessionExpired(err)) {
        clearAuthState();
      } else {
        setAuthError(err?.message || "Failed to load account");
        // Retry after delay
        setTimeout(() => loadUserData({ force: true }), 5000);
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasToken, clearAuthState, isOffline]);

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
    if (!isPublicRoute()) loadUserData();
    else setLoading(false);
  }, [location.pathname, hasToken, isPublicRoute, loadUserData]);

  const activationComplete = useMemo(() => {
    if (user?.is_admin === true || ADMIN_EMAILS.includes(user?.email)) return true;
    if (!user || !activation) return false;
    
    const hasCard = activation.has_card_on_file === true || activation.billing_complete === true;
    if (!hasCard) return false;
    
    const tier = (user.tier || "starter").toLowerCase();
    const needsOkx = ["starter", "pro", "bundle"].includes(tier);
    const needsAlpaca = ["starter", "bundle"].includes(tier);
    const needsWallet = ["elite", "stock", "bundle"].includes(tier);
    
    const okxOk = !needsOkx || activation.okx_connected === true;
    const alpacaOk = !needsAlpaca || activation.alpaca_connected === true;
    const walletOk = !needsWallet || activation.wallet_connected === true;
    const tradingOk = activation.trading_enabled === true;
    
    return okxOk && alpacaOk && walletOk && tradingOk;
  }, [user, activation]);

  const login = useCallback(async (email, password) => {
    try {
      setAuthError(null);
      const result = await BotAPI.login({ email, password });
      
      if (result.twofaRequired) {
        return { success: true, twofaRequired: true, tempToken: result.tempToken };
      }
      if (!BotAPI.getToken()) {
        return { success: false, error: "Login succeeded but token was not saved." };
      }
      
      await loadUserData({ force: true });
      await refreshActivation();
      
      const currentUser = user || JSON.parse(localStorage.getItem("imali_user") || "{}");
      const isAdmin = currentUser?.is_admin === true || ADMIN_EMAILS.includes(email);
      let redirectPath = "/dashboard";
      
      if (isAdmin) {
        redirectPath = "/dashboard";
      } else if (activation) {
        const hasCard = activation.has_card_on_file === true || activation.billing_complete === true;
        if (!hasCard) redirectPath = "/billing";
        else if (!activation.trading_enabled) redirectPath = "/activation";
      }
      
      return { success: true, data: result.data, redirectTo: redirectPath };
    } catch (err) {
      let errorMessage = "Login failed";
      if (err.response?.status === 401) errorMessage = "Invalid email or password";
      else if (err.response?.status === 429) errorMessage = "Too many attempts. Please try again later.";
      else if (err.response?.data?.message) errorMessage = err.response.data.message;
      else if (err.message) errorMessage = err.message;
      return { success: false, error: errorMessage, status: err.response?.status };
    }
  }, [loadUserData, refreshActivation, activation, user]);

  const signup = useCallback(async (userData) => {
    try {
      setAuthError(null);
      const result = await BotAPI.signup(userData);
      return {
        success: true,
        data: result.data,
        token: result.token || result?.data?.token || null,
        redirectTo: "/billing",
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
      } else if (err.message) {
        errorMessage = err.message;
      }
      return { success: false, error: errorMessage, errorCode, status: err.response?.status };
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthState();
    bootstrappedRef.current = false;
    loadingRef.current = false;
    navigate("/login", { replace: true });
  }, [clearAuthState, navigate]);

  const value = useMemo(() => ({
    user, activation, loading, activationComplete, authError, isOffline,
    isAuthenticated: !!user || hasToken(),
    hasToken: hasToken(),
    isPublicRoute: isPublicRoute(),
    setUser, setActivation,
    login, signup, logout,
    refreshUser: () => loadUserData({ force: true }),
    refreshProfile, refreshActivation,
  }), [user, activation, loading, activationComplete, authError, isOffline,
      hasToken, isPublicRoute, login, signup, logout, loadUserData, refreshProfile, refreshActivation]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
