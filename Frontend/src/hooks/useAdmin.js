// src/hooks/useAdmin.js
import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL?.replace(/\/+$/, "") || 
  "https://api.imali-defi.com";

const useAdmin = () => {
  const { user, hasToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const adminFetch = useCallback(async (endpoint, options = {}) => {
    if (!hasToken) {
      throw new Error("No authentication token found");
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("imali_token");
      
      const response = await axios({
        url: `${API_BASE}${endpoint}`,
        method: options.method || 'GET',
        data: options.body,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
        timeout: 30000,
      });

      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
        err.response?.data?.error || 
        err.message || 
        'Request failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [hasToken]);

  const checkAdminStatus = useCallback(async () => {
    try {
      const data = await adminFetch('/api/admin/check');
      return data?.data?.is_admin === true;
    } catch (error) {
      console.warn("[useAdmin] Admin check failed:", error);
      return false;
    }
  }, [adminFetch]);

  const showToast = useCallback((message, type = 'success') => {
    console.log(`[Toast] ${type}: ${message}`);
    // In a real app, you'd use a toast library here
    alert(`${type.toUpperCase()}: ${message}`);
  }, []);

  return {
    loading,
    error,
    adminFetch,
    checkAdminStatus,
    showToast,
    API_BASE,
    isAdmin: user?.is_admin || false,
  };
};

export default useAdmin;
