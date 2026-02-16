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
        const userData = response.user || response;
        setUser(userData);
        console.log('Auth check successful:', userData?.email);
      } catch (error) {
        console.error('Auth check failed:', error.response?.status, error.message);
        BotAPI.clearToken();
        setUser(null);
      }
    } else {
      console.log('No valid token found');
      setUser(null);
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      // This will set the token in BotAPI
      const response = await BotAPI.login({ email, password });
      
      // 🔥 FIX: Immediately fetch the REAL user data
      const meResponse = await BotAPI.me();
      const userData = meResponse.user || meResponse;
      
      setUser(userData);
      console.log('Login successful:', userData?.email);
      
      return { success: true, data: userData };
    } catch (error) {
      console.error('Login error:', error.response?.status, error.response?.data || error.message);
      
      let errorMessage = 'Login failed';
      if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password';
      } else if (error.response?.status === 403) {
        errorMessage = 'Account not activated';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const signup = async (userData) => {
    try {
      const response = await BotAPI.signup(userData);
      console.log('Signup successful:', userData.email);
      return { success: true, data: response };
    } catch (error) {
      console.error('Signup error:', error.response?.status, error.response?.data || error.message);
      
      let errorMessage = 'Signup failed';
      if (error.response?.status === 409) {
        errorMessage = 'Email already exists';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    BotAPI.clearToken();
    setUser(null);
    console.log('Logged out');
  };

  const refreshUser = async () => {
    if (BotAPI.isLoggedIn()) {
      try {
        const response = await BotAPI.me();
        const userData = response.user || response;
        setUser(userData);
        return userData;
      } catch (error) {
        console.error('Refresh user failed:', error);
        return null;
      }
    }
    return null;
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    checkAuth,
    refreshUser,
    isAuthenticated: !!user,
    // 🔥 FIX: Make hasToken a function that checks current state
    hasToken: () => BotAPI.isLoggedIn()
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
