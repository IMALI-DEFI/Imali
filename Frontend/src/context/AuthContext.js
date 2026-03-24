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
const isForbidden = (err) => err?.response?.status === 403;
const isRateLimited = (err) => err?.response?.status === 429;

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/dashboard', '/public-dashboard', '/public', '/live', '/trading'];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activation, setActivation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  
  const location = useLocation();
  const initialLoadDone = useRef(false);
  const loadingLock = useRef(false);

  // Check if current route is public
  const isPublicRoute = useCallback(() => {
    const pathname = location?.pathname || window.location.pathname;
    return PUBLIC_ROUTES.includes(pathname) || pathname === '/';
  }, [location]);

  // ========================
  // Helper to verify token status
  // ========================
  const verifyTokenStatus = useCallback(() => {
    const token = BotAPI.getToken();
    const isLoggedIn = BotAPI.isLoggedIn();
    console.log("[AuthContext] Token status:", { 
      hasToken: !!token, 
      isLoggedIn,
      tokenPreview: token ? token.substring(0, 20) + "..." : null 
    });
    return isLoggedIn;
  }, []);

  // ========================
  // Refresh activation status
  // ========================
  const refreshActivation = useCallback(async () => {
    if (!verifyTokenStatus()) {
      console.log("[AuthContext] refreshActivation - no token, skipping");
      return null;
    }

    try {
      console.log("[AuthContext] refreshActivation - fetching...");
      const response = await BotAPI.activationStatus();
      console.log("[AuthContext] refreshActivation response:", response);
      
      const fresh = response?.status || response || null;

      setActivation((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(fresh)) return prev;
        console.log("[AuthContext] activation updated:", fresh);
        return fresh;
      });

      return fresh;
    } catch (err) {
      console.error("[AuthContext] refreshActivation failed:", err);

      if (isSessionExpired(err)) {
        console.log("[AuthContext] Session expired, clearing token");
        BotAPI.clearToken();
        setUser(null);
        setActivation(null);
      }
      return null;
    }
  }, [verifyTokenStatus]);

  // ========================
  // Refresh user profile
  // ========================
  const refreshProfile = useCallback(async () => {
    if (!verifyTokenStatus()) {
      console.log("[AuthContext] refreshProfile - no token, skipping");
      return null;
    }

    try {
      console.log("[AuthContext] refreshProfile - fetching...");
      const response = await BotAPI.me();
      console.log("[AuthContext] refreshProfile response:", response);
      
      const fresh = response?.user || response || null;

      setUser((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(fresh)) return prev;
        console.log("[AuthContext] user updated:", fresh?.email);
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
  }, [verifyTokenStatus]);

  // ========================
  // Load all user data
  // ========================
  const loadUserData = useCallback(async () => {
    console.log("[AuthContext] loadUserData started");
    
    // SKIP AUTH FOR PUBLIC ROUTES
    if (isPublicRoute()) {
      console.log("[AuthContext] Public route detected - skipping auth");
      setUser(null);
      setActivation(null);
      setLoading(false);
      return;
    }
    
    const hasToken = verifyTokenStatus();

    if (!hasToken) {
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
        console.log("[AuthContext] /api/me response:", response);
        const userData = response?.user || response || null;
        setUser(userData);
        console.log("[AuthContext] /api/me OK:", userData?.email);
      } catch (meErr) {
        console.error("[AuthContext] /api/me failed:", meErr);
        if (isSessionExpired(meErr)) {
          BotAPI.clearToken();
          setUser(null);
          setActivation(null);
          setLoading(false);
          loadingLock.current = false;
          return;
        }
      }

      // Delay between calls
      await new Promise((r) => setTimeout(r, 500));

      // Fetch activation status
      try {
        console.log("[AuthContext] loadUserData — fetching activation status...");
        const response = await BotAPI.activationStatus();
        console.log("[AuthContext] activation status response:", response);
        const activationData = response?.status || response || null;
        setActivation(activationData);
        console.log("[AuthContext] activation status OK:", activationData);
      } catch (actErr) {
        console.error("[AuthContext] activation status failed:", actErr);
        if (isSessionExpired(actErr)) {
          BotAPI.clearToken();
          setUser(null);
          setActivation(null);
        }
      }
    } finally {
      setLoading(false);
      loadingLock.current = false;
      console.log("[AuthContext] loadUserData completed");
    }
  }, [verifyTokenStatus, isPublicRoute]);

  // ========================
  // Initial load
  // ========================
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    console.log("[AuthContext] Initial load starting");
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
        console.log("[AuthContext] login result:", result);

        if (result.twofaRequired) {
          console.log("[AuthContext] 2FA required");
          return {
            success: true,
            twofaRequired: true,
            tempToken: result.tempToken,
          };
        }

        // Verify token was saved
        console.log("[AuthContext] Verifying token after login...");
        const tokenCheck = verifyTokenStatus();
        
        if (!tokenCheck) {
          console.error("[AuthContext] Token not saved properly!");
          // Try one more time with a delay
          await new Promise(resolve => setTimeout(resolve, 200));
          const retryCheck = verifyTokenStatus();
          if (!retryCheck) {
            return {
              success: false,
              error: "Login succeeded but token not saved. Please try again.",
            };
          }
        }

        // Small delay to ensure token is propagated
        await new Promise(resolve => setTimeout(resolve, 300));

        // Load user data after successful login
        console.log("[AuthContext] Loading user data after login...");
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
    [loadUserData, verifyTokenStatus]
  );

  // ========================
  // Signup
  // ========================
  const signup = useCallback(async (userData) => {
    try {
      setAuthError(null);
      console.log("[AuthContext] signup attempt for:", userData.email);

      const result = await BotAPI.signup(userData);
      console.log("[AuthContext] signup result:", result);

      return { success: true, data: result.data };
    } catch (err) {
      console.error("[AuthContext] signup error:", err);

      let errorMessage = "Signup failed";
      let errorCode = null;

      if (err.response) {
        errorCode = err.response.data?.error;
        errorMessage = err.response.data?.message || err.message;

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
    console.log("[AuthContext] Logging out");
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
      isPublicRoute: isPublicRoute(),

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
      isPublicRoute,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
