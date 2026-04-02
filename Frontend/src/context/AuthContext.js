import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import BotAPI from "../utils/BotAPI";

const AuthContext = createContext(null);

const TOKEN_KEY = "imali_token";
const USER_KEY = "imali_user";

const extractUser = (response) => response?.data?.user || response?.user || null;
const extractActivation = (response) =>
  response?.data?.status || response?.status || response?.data || response || null;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activation, setActivation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState(null);

  const persistUser = useCallback((nextUser) => {
    setUser(nextUser);
    if (nextUser) localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    else localStorage.removeItem(USER_KEY);
  }, []);

  const persistToken = useCallback((nextToken) => {
    setTokenState(nextToken || null);
    BotAPI.setToken(nextToken || null);
    if (nextToken) localStorage.setItem(TOKEN_KEY, nextToken);
    else localStorage.removeItem(TOKEN_KEY);
  }, []);

  const clearAuth = useCallback(() => {
    persistToken(null);
    persistUser(null);
    setActivation(null);
    localStorage.removeItem("imali_ws_token");
  }, [persistToken, persistUser]);

  const refreshActivation = useCallback(async () => {
    try {
      const response = await BotAPI.getActivationStatus();
      const nextActivation = extractActivation(response);
      setActivation(nextActivation || null);
      return nextActivation;
    } catch (err) {
      console.warn("[Auth] Failed to refresh activation:", err);
      return null;
    }
  }, []);

  const loadUser = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUserRaw = localStorage.getItem(USER_KEY);

    if (!storedToken) {
      clearAuth();
      setLoading(false);
      return null;
    }

    persistToken(storedToken);

    if (storedUserRaw) {
      try {
        const parsed = JSON.parse(storedUserRaw);
        if (parsed) setUser(parsed);
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }

    try {
      const response = await BotAPI.getMe();
      const nextUser = extractUser(response);

      if (!nextUser) {
        clearAuth();
        setLoading(false);
        return null;
      }

      persistUser(nextUser);
      await refreshActivation();
      return nextUser;
    } catch (error) {
      console.error("[Auth] Failed to load user:", error);

      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        clearAuth();
      } else {
        console.warn("[Auth] Keeping stored auth because this was not a confirmed auth rejection.");
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, [clearAuth, persistToken, persistUser, refreshActivation]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(
    async (email, password) => {
      try {
        const response = await BotAPI.login(email, password);

        const nextToken = response?.data?.token || response?.token || null;
        const nextUser = response?.data?.user || response?.user || null;
        const twofaRequired = response?.data?.twofaRequired || response?.twofaRequired || false;
        const tempToken = response?.data?.tempToken || response?.tempToken || null;

        if (twofaRequired) {
          return {
            success: true,
            twofaRequired: true,
            tempToken,
          };
        }

        if (!nextToken) {
          return {
            success: false,
            error: response?.message || "Login failed",
          };
        }

        persistToken(nextToken);
        if (nextUser) persistUser(nextUser);

        const loadedUser = await loadUser();

        return {
          success: true,
          user: loadedUser || nextUser || null,
        };
      } catch (error) {
        console.error("[Auth] Login error:", error);
        return {
          success: false,
          error:
            error?.response?.data?.message ||
            error?.message ||
            "Login failed",
        };
      }
    },
    [loadUser, persistToken, persistUser]
  );

  const signup = useCallback(
    async (userData) => {
      try {
        const response = await BotAPI.signup(userData);

        const nextToken = response?.data?.token || response?.token || null;
        const nextUser = response?.data?.user || response?.user || null;

        if (!nextToken) {
          return {
            success: false,
            error: response?.message || "Signup failed",
          };
        }

        persistToken(nextToken);
        if (nextUser) persistUser(nextUser);

        const loadedUser = await loadUser();

        return {
          success: true,
          user: loadedUser || nextUser || null,
        };
      } catch (error) {
        console.error("[Auth] Signup error:", error);
        return {
          success: false,
          error:
            error?.response?.data?.message ||
            error?.message ||
            "Signup failed",
        };
      }
    },
    [loadUser, persistToken, persistUser]
  );

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const refreshWebSocketToken = useCallback(async () => {
    try {
      const response = await BotAPI.getWebSocketToken();
      const wsToken = response?.data?.token || response?.token || null;
      if (wsToken) {
        localStorage.setItem("imali_ws_token", wsToken);
        return wsToken;
      }
    } catch (error) {
      console.error("[Auth] Failed to refresh WebSocket token:", error);
    }
    return null;
  }, []);

  const activationComplete = activation?.trading_enabled === true;
  const hasCardOnFile =
    activation?.has_card_on_file === true || activation?.billing_complete === true;

  const value = useMemo(
    () => ({
      user,
      setUser: persistUser,
      activation,
      setActivation,
      token,
      loading,
      isAuthenticated: !!user && !!token,
      activationComplete,
      hasCardOnFile,
      login,
      signup,
      logout,
      loadUser,
      refreshActivation,
      refreshWebSocketToken,
      clearAuth,
    }),
    [
      user,
      persistUser,
      activation,
      token,
      loading,
      activationComplete,
      hasCardOnFile,
      login,
      signup,
      logout,
      loadUser,
      refreshActivation,
      refreshWebSocketToken,
      clearAuth,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
