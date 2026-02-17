// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import BotAPI from '../utils/BotAPI';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activation, setActivation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Load user and activation data in one go
  const loadUserData = useCallback(async () => {
    if (!BotAPI.isLoggedIn()) {
      setUser(null);
      setActivation(null);
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      // Get user data
      const userData = await BotAPI.me();
      
      if (!userData) {
        throw new Error('No user data');
      }

      // Try to get activation data (but don't fail if it's not available)
      let activationData = null;
      try {
        const actResponse = await BotAPI.activationStatus();
        activationData = actResponse?.status || actResponse;
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
