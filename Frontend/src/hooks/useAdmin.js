// src/hooks/useAdmin.js
import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

// This is a DEFAULT export
const useAdmin = () => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const adminFetch = useCallback(async (endpoint, options = {}) => {
    if (!token) {
      throw new Error("No authentication token found");
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios({
        url: `${API_BASE}${endpoint}`,
        method: options.method || 'GET',
        data: options.body ? JSON.parse(options.body) : undefined,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
        timeout: 30000,
      });

      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Request failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const checkAdminStatus = useCallback(async () => {
    try {
      const data = await adminFetch('/api/admin/check');
      return data?.is_admin === true;
    } catch (error) {
      console.warn("[useAdmin] Admin check failed:", error);
      return false;
    }
  }, [adminFetch]);

  const showToast = useCallback((message, type = 'success') => {
    console.log(`[Toast] ${type}: ${message}`);
  }, []);

  return {
    loading,
    error,
    adminFetch,
    checkAdminStatus,
    showToast,
    API_BASE,
  };
};

export default useAdmin; // <-- DEFAULT EXPORT
