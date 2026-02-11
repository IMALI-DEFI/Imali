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
    // Check if there's a token and it's not expired
    if (BotAPI.isLoggedIn()) {
      try {
        const response = await BotAPI.me();
        // Extract user from response properly
        const userData = response.user || response;
        setUser(userData);
        console.log('Auth check successful:', userData?.email);
      } catch (error) {
        console.error('Auth check failed:', error.response?.status, error.message);
        // Clear invalid token
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
      const response = await BotAPI.login({ email, password });
      
      // Extract user from login response
      // Different APIs might return user in different formats
      const userData = response.user || response;
      
      setUser(userData);
      console.log('Login successful:', userData?.email);
      
      // Verify the token works by fetching fresh user data
      // This ensures the session is fully established
      setTimeout(async () => {
        try {
          await BotAPI.me();
          console.log('Session verified after login');
        } catch (verifyError) {
          console.error('Session verification failed:', verifyError);
        }
      }, 100);
      
      return { success: true, data: response };
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
      
      // Don't set user on signup - they need to login
      // Just return success
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

  // Add this method to refresh user data
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
    // Helper to check if token exists (not necessarily valid)
    hasToken: BotAPI.isLoggedIn()
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
