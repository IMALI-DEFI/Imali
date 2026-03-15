// src/hooks/useAdmin.js
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL?.replace(/\/+$/, "") || 
  "https://api.imali-defi.com";

const useAdmin = () => {
  const { user: authUser, hasToken, loading: authLoading } = useAuth();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Sync user from AuthContext
  useEffect(() => {
    console.log('[useAdmin] Auth user changed:', authUser?.email);
    setUser(authUser);
    setIsLoading(authLoading);
  }, [authUser, authLoading]);

  // Check admin status when user changes
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!hasToken || !authUser) {
        setIsAdmin(false);
        return;
      }

      try {
        const token = localStorage.getItem("imali_token");
        const response = await axios({
          url: `${API_BASE}/api/admin/check`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        setIsAdmin(response.data?.data?.is_admin === true);
      } catch (err) {
        console.error("[useAdmin] Admin check failed:", err);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [authUser, hasToken]);

  const adminFetch = useCallback(async (endpoint, options = {}) => {
    if (!hasToken) {
      throw new Error("No authentication token found");
    }

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
      
      // Handle 401 by clearing user
      if (err.response?.status === 401) {
        setUser(null);
        setIsAdmin(false);
      }
      
      throw new Error(errorMessage);
    }
  }, [hasToken]);

  const checkAdminStatus = useCallback(async () => {
    if (!hasToken || !authUser) return false;
    
    try {
      const data = await adminFetch('/api/admin/check');
      const adminStatus = data?.data?.is_admin === true;
      setIsAdmin(adminStatus);
      return adminStatus;
    } catch (error) {
      console.warn("[useAdmin] Admin check failed:", error);
      return false;
    }
  }, [adminFetch, hasToken, authUser]);

  const showToast = useCallback((message, type = 'success') => {
    console.log(`[Toast] ${type}: ${message}`);
    // You can replace this with your actual toast implementation
    if (type === 'error') {
      alert(`❌ Error: ${message}`);
    } else {
      alert(`✅ Success: ${message}`);
    }
  }, []);

  return {
    user,           // ✅ Now properly populated from AuthContext
    isLoading,      // ✅ Matches component expectation
    error,          // ✅ Error state
    adminFetch,     // ✅ API helper
    showToast,      // ✅ Toast helper
    checkAdminStatus,
    isAdmin,
    API_BASE,
    hasToken,       // ✅ Add for convenience
  };
};

export default useAdmin;
