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
import { useLocation, useNavigate } from "react-router-dom";
import BotAPI from "../utils/BotAPI";

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

const isSessionExpired = (err) => err?.response?.status === 401;

// Admin emails that bypass activation
const ADMIN_EMAILS = ["wayne@imali-defi.com", "admin@imali-defi.com"];

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
  "/after-login",
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activation, setActivation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();
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
    // Clear any cached activation data
    localStorage.removeItem("imali_activation");
    sessionStorage.removeItem("imali_activation");
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!hasToken()) return null;

    try {
      const response = await BotAPI.me();
      const freshUser = response?.user || response || null;
      setUser(freshUser);
      return freshUser;
    } catch (error) {
      console.error("[Auth] Failed to refresh profile:", error);
      if (isSessionExpired(error)) {
        clearAuthState();
      }
      return null;
    }
  }, [hasToken, clearAuthState]);

  const refreshActivation = useCallback(async () => {
    if (!hasToken()) return null;

    try {
      const response = await BotAPI.activationStatus();
      // Normalize the response structure
      let freshActivation = response?.status || response || null;
      
      // Ensure we have consistent field names
      if (freshActivation) {
        // Map billing_complete to has_card_on_file if needed
        if (typeof freshActivation.has_card_on_file === 'undefined' && 
            typeof freshActivation.billing_complete !== 'undefined') {
          freshActivation.has_card_on_file = freshActivation.billing_complete;
        }
        
        // Ensure all boolean fields are actually booleans
        freshActivation.has_card_on_file = !!freshActivation.has_card_on_file;
        freshActivation.billing_complete = !!freshActivation.billing_complete;
        freshActivation.okx_connected = !!freshActivation.okx_connected;
        freshActivation.alpaca_connected = !!freshActivation.alpaca_connected;
        freshActivation.wallet_connected = !!freshActivation.wallet_connected;
        freshActivation.trading_enabled = !!freshActivation.trading_enabled;
        freshActivation.activation_complete = !!freshActivation.activation_complete;
      }
      
      // Cache the activation data
      if (freshActivation) {
        localStorage.setItem("imali_activation", JSON.stringify(freshActivation));
      }
      
      setActivation(freshActivation);
      return freshActivation;
    } catch (error) {
      console.error("[Auth] Failed to refresh activation:", error);
      if (isSessionExpired(error)) {
        clearAuthState();
      }
      return null;
    }
  }, [hasToken, clearAuthState]);

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
        // Load profile first
        const profileResult = await BotAPI.me();
        let freshUser = profileResult?.user || profileResult || null;
        
        // Ensure is_admin is properly set from user data
        if (freshUser) {
          freshUser.is_admin = freshUser.is_admin === true || ADMIN_EMAILS.includes(freshUser.email);
        }
        
        setUser(freshUser);

        // Then load activation status
        try {
          const activationResult = await BotAPI.activationStatus();
          let freshActivation = activationResult?.status || activationResult || null;
          
          // Normalize activation data
          if (freshActivation) {
            if (typeof freshActivation.has_card_on_file === 'undefined' && 
                typeof freshActivation.billing_complete !== 'undefined') {
              freshActivation.has_card_on_file = freshActivation.billing_complete;
            }
            freshActivation.has_card_on_file = !!freshActivation.has_card_on_file;
            freshActivation.billing_complete = !!freshActivation.billing_complete;
            freshActivation.okx_connected = !!freshActivation.okx_connected;
            freshActivation.alpaca_connected = !!freshActivation.alpaca_connected;
            freshActivation.wallet_connected = !!freshActivation.wallet_connected;
            freshActivation.trading_enabled = !!freshActivation.trading_enabled;
            freshActivation.activation_complete = !!freshActivation.activation_complete;
          }
          
          // Cache activation data
          if (freshActivation) {
            localStorage.setItem("imali_activation", JSON.stringify(freshActivation));
          }
          
          setActivation(freshActivation);
        } catch (actErr) {
          console.warn("[Auth] Activation status failed, using cached or default:", actErr);
          // Try to use cached activation data
          const cachedActivation = localStorage.getItem("imali_activation");
          if (cachedActivation) {
            try {
              const parsed = JSON.parse(cachedActivation);
              setActivation(parsed);
              console.log("[Auth] Using cached activation data");
            } catch (e) {
              setActivation(null);
            }
          } else if (!isSessionExpired(actErr)) {
            // Set default activation state
            setActivation({
              has_card_on_file: false,
              billing_complete: false,
              okx_connected: false,
              alpaca_connected: false,
              wallet_connected: false,
              trading_enabled: false,
              activation_complete: false,
            });
          } else {
            throw actErr;
          }
        }
      } catch (err) {
        console.error("[Auth] Failed to load user data:", err);
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

  // Enhanced activationComplete logic with admin bypass
  const activationComplete = useMemo(() => {
    // Admin bypass - admins are always considered activated
    if (user?.is_admin === true || ADMIN_EMAILS.includes(user?.email)) {
      console.log("[Auth] Admin bypass - activationComplete = true");
      return true;
    }
    
    if (!user || !activation) return false;
    if (activation._error) return false;

    const tier = (user.tier || "starter").toLowerCase();
    
    // Check billing - use has_card_on_file OR billing_complete
    const hasCard = activation.has_card_on_file === true || activation.billing_complete === true;
    if (!hasCard) return false;

    // Define required connections based on tier
    const needsOkx = ["starter", "pro", "bundle"].includes(tier);
    const needsAlpaca = ["starter", "bundle"].includes(tier);
    const needsWallet = ["elite", "stock", "bundle"].includes(tier);

    // Check connections
    const okxOk = !needsOkx || activation.okx_connected === true;
    const alpacaOk = !needsAlpaca || activation.alpaca_connected === true;
    const walletOk = !needsWallet || activation.wallet_connected === true;
    const tradingOk = activation.trading_enabled === true;

    const isComplete = okxOk && alpacaOk && walletOk && tradingOk;
    
    console.log("[Auth] activationComplete check:", {
      email: user.email,
      tier,
      hasCard,
      needsOkx, okxOk,
      needsAlpaca, alpacaOk,
      needsWallet, walletOk,
      tradingOk,
      isComplete
    });
    
    return isComplete;
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

        // Load user data
        await loadUserData({ force: true });
        
        // CRITICAL: Refresh activation data after login
        await refreshActivation();

        // Determine where to redirect based on activation status
        let redirectPath = "/dashboard";
        
        // Check if user is admin
        const isAdmin = user?.is_admin === true || ADMIN_EMAILS.includes(email);
        
        if (isAdmin) {
          // Admins go directly to dashboard
          redirectPath = "/dashboard";
        } else if (activation) {
          const hasCard = activation.has_card_on_file === true || activation.billing_complete === true;
          
          if (!hasCard) {
            redirectPath = "/billing";
          } else if (!activation.trading_enabled) {
            redirectPath = "/activation";
          }
        }

        return {
          success: true,
          data: result.data,
          redirectTo: redirectPath,
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
    [loadUserData, refreshActivation, activation, user]
  );

  const signup = useCallback(async (userData) => {
    try {
      setAuthError(null);

      const result = await BotAPI.signup(userData);

      return {
        success: true,
        data: result.data,
        token: result.token || result?.data?.token || null,
        redirectTo: "/billing", // New users go to billing
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
    // Clear cached data
    localStorage.removeItem("imali_activation");
    sessionStorage.removeItem("imali_activation");
    navigate("/login", { replace: true });
  }, [clearAuthState, navigate]);

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
