// src/hooks/useAdmin.js
import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export default function useAdmin() {
  const { user, isAdmin, token } = useAuth();

  const getAuthToken = useCallback(() => {
    // Try multiple sources
    const tokenFromStorage = localStorage.getItem('imali_token') || 
                             sessionStorage.getItem('imali_token');
    
    // Also check cookies if needed
    const cookieMatch = document.cookie.match(/token=([^;]+)/);
    const tokenFromCookie = cookieMatch ? cookieMatch[1] : null;
    
    return tokenFromStorage || tokenFromCookie || token;
  }, [token]);

  const adminFetch = useCallback(async (endpoint, options = {}) => {
    const authToken = getAuthToken();
    
    if (!authToken) {
      const error = new Error('No authentication token found');
      error.status = 401;
      throw error;
    }

    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'https://api.imali-defi.com'}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        ...options.headers,
      },
    });

    if (response.status === 401) {
      localStorage.removeItem('imali_token');
      sessionStorage.removeItem('imali_token');
      const error = new Error('Session expired. Please log in again.');
      error.status = 401;
      throw error;
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }
    
    return data;
  }, [getAuthToken]);

  return {
    adminFetch,
    isAuthenticated: !!getAuthToken(),
    isAdmin,
    user,
    isLoading: false
  };
}
