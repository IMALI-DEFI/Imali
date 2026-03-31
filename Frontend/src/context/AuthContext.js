// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import BotAPI from '../utils/BotAPI';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activation, setActivation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Load user data from token
  const loadUser = useCallback(async () => {
    const storedToken = localStorage.getItem('imali_token');
    if (!storedToken) {
      setLoading(false);
      return;
    }

    setToken(storedToken);
    BotAPI.setToken(storedToken);

    try {
      // Get user profile
      const response = await BotAPI.getMe();
      
      if (response?.success && response?.data?.user) {
        setUser(response.data.user);
        
        // Load activation status
        try {
          const activationRes = await BotAPI.getActivationStatus();
          if (activationRes?.success) {
            setActivation(activationRes.data?.status || activationRes.data);
          }
        } catch (err) {
          console.warn('[Auth] Failed to load activation status:', err);
          setActivation({ trading_enabled: false, has_card_on_file: false });
        }
      } else {
        // Token might be invalid
        localStorage.removeItem('imali_token');
        BotAPI.setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('[Auth] Failed to load user data:', error);
      localStorage.removeItem('imali_token');
      BotAPI.setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    try {
      const response = await BotAPI.login(email, password);
      if (response?.success && response?.data?.token) {
        const newToken = response.data.token;
        localStorage.setItem('imali_token', newToken);
        setToken(newToken);
        BotAPI.setToken(newToken);
        
        await loadUser();
        return { success: true, user: response.data.user };
      }
      return { success: false, error: response?.message || 'Login failed' };
    } catch (error) {
      console.error('[Auth] Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const signup = async (userData) => {
    try {
      const response = await BotAPI.signup(userData);
      if (response?.success && response?.data?.token) {
        const newToken = response.data.token;
        localStorage.setItem('imali_token', newToken);
        setToken(newToken);
        BotAPI.setToken(newToken);
        
        await loadUser();
        return { success: true, user: response.data.user };
      }
      return { success: false, error: response?.message || 'Signup failed' };
    } catch (error) {
      console.error('[Auth] Signup error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('imali_token');
    BotAPI.setToken(null);
    setToken(null);
    setUser(null);
    setActivation(null);
  };

  const refreshWebSocketToken = async () => {
    try {
      const response = await BotAPI.getWebSocketToken();
      if (response?.success && response?.data?.token) {
        localStorage.setItem('imali_ws_token', response.data.token);
        return response.data.token;
      }
    } catch (error) {
      console.error('[Auth] Failed to refresh WebSocket token:', error);
    }
    return null;
  };

  const activationComplete = activation?.trading_enabled === true;
  const hasCardOnFile = activation?.has_card_on_file === true;

  const value = {
    user,
    activation,
    token,
    loading,
    isAuthenticated: !!user,
    activationComplete,
    hasCardOnFile,
    login,
    signup,
    logout,
    loadUser,
    refreshWebSocketToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
