// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import BotAPI from '../utils/BotAPI';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (BotAPI.isLoggedIn()) {
      try {
        const response = await BotAPI.me();
        setUser(response.user);
      } catch (error) {
        console.error('Auth check failed:', error);
        BotAPI.clearToken();
        setUser(null);
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      const response = await BotAPI.login({ email, password });
      setUser(response.user);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signup = async (userData) => {
    try {
      const response = await BotAPI.signup(userData);
      setUser(response.user);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    BotAPI.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    checkAuth,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};