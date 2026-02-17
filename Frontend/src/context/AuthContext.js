// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import BotAPI from '../utils/BotAPI';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

// Simple retry function with exponential backoff
const retry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    // Only retry on 429 or network errors
    if (retries > 0 && (error.response?.status === 429 || error.code === 'ERR_NETWORK')) {
      console.log(`Rate limited, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activation, setActivation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Load user and activation data in one go with retry logic
  const loadUserData = useCallback(async () => {
    if (!BotAPI.isLoggedIn()) {
      setUser(null);
      setActivation(null);
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      // Get user data with retry
      const userData = await retry(async () => {
        const data = await BotAPI.me();
        if (!data) throw new Error('No user data');
        return data;
      }, 3, 1000);
      
      // Try to get activation data (but don't fail if it's not available)
      let activationData = null;
      try {
        const actResponse = await retry(async () => {
          const data = await BotAPI.activationStatus();
          return data?.status || data;
        }, 2, 1500);
        activationData = actResponse;
      } catch (actErr) {
        console.warn('Could not load activation data:', actErr);
      }

      setUser(userData);
      setActivation(activationData);
    } catch (error) {
      console.error('Failed to load user data:', error);
      BotAPI.clearToken();
      setUser(null);
      setActivation(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Compute activation status from user + activation data
  const activationComplete = useCallback(() => {
    if (!user || !activation) return false;
    
    const tier = (user.tier || 'starter').toLowerCase();
    
    // Check billing
    if (!activation.billing_complete) return false;
    
    // Check connections based on tier
    const needsOkx = ['starter', 'pro', 'bundle'].includes(tier);
    const needsAlpaca = ['starter', 'bundle'].includes(tier);
    const needsWallet = ['elite', 'stock', 'bundle'].includes(tier);
    
    const okxConnected = !!activation.okx_connected;
    const alpacaConnected = !!activation.alpaca_connected;
    const walletConnected = !!activation.wallet_connected;
    
    const connectionsComplete = 
      (!needsOkx || okxConnected) &&
      (!needsAlpaca || alpacaConnected) &&
      (!needsWallet || walletConnected);
    
    // Check trading enabled
    if (!activation.trading_enabled) return false;
    
    return activation.billing_complete && connectionsComplete && activation.trading_enabled;
  }, [user, activation]);

  const login = async (email, password) => {
    try {
      const response = await BotAPI.login({ email, password });
      
      if (!response) {
        throw new Error('No response from server');
      }

      // Load user data immediately after login
      await loadUserData();
      
      return { success: true, data: response };
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed';
      if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many attempts. Please wait a moment.';
      } else if (error.response?.status === 503) {
        errorMessage = 'Service temporarily unavailable.';
      } else if (error.message === 'Network Error') {
        errorMessage = 'Unable to connect to server.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const signup = async (userData) => {
    try {
      const response = await BotAPI.signup(userData);
      
      if (!response) {
        throw new Error('No response from server');
      }
      
      return { success: true, data: response };
    } catch (error) {
      console.error('Signup error:', error);
      
      let errorMessage = 'Signup failed';
      if (error.response?.status === 409) {
        errorMessage = 'Email already exists';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || 'Invalid signup information';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many attempts. Please wait a moment.';
      } else if (error.response?.status === 503) {
        errorMessage = 'Service temporarily unavailable.';
      } else if (error.message === 'Network Error') {
        errorMessage = 'Unable to connect to server.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    BotAPI.clearToken();
    setUser(null);
    setActivation(null);
  };

  const refreshUser = async () => {
    await loadUserData();
    return user;
  };

  const value = {
    user,
    activation,
    loading,
    initialized,
    activationComplete: activationComplete(),
    login,
    signup,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    hasToken: () => BotAPI.isLoggedIn()
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
