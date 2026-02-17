// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import BotAPI from '../utils/BotAPI';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      if (BotAPI.isLoggedIn()) {
        try {
          const response = await BotAPI.me();
          if (mounted) {
            const userData = response.user || response;
            setUser(userData);
            console.log('Auth initialized for:', userData?.email);
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);
          if (mounted) {
            BotAPI.clearToken();
            setUser(null);
          }
        }
      } else {
        if (mounted) {
          setUser(null);
        }
      }
      
      if (mounted) {
        setLoading(false);
        setInitialized(true);
      }
    };

    initAuth();
    
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await BotAPI.login({ email, password });
      
      // Immediately fetch user data
      const meResponse = await BotAPI.me();
      const userData = meResponse.user || meResponse;
      
      setUser(userData);
      console.log('Login successful:', userData?.email);
      
      return { success: true, data: userData };
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed';
      if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (error.response?.status === 503) {
        errorMessage = 'Service temporarily unavailable. Please try again.';
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
      console.error('Signup error:', error);
      
      let errorMessage = 'Signup failed';
      if (error.response?.status === 409) {
        errorMessage = 'Email already exists';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || 'Invalid signup information';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many attempts. Please try again later.';
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
    initialized,
    login,
    signup,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    hasToken: () => BotAPI.isLoggedIn()
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
