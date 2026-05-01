// src/hooks/usePromo.js
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

// Default promo state
const DEFAULT_PROMO_STATE = {
  limit: 50,
  claimed: 0,
  spotsLeft: 50,
  active: true,
  loading: true,
  error: null,
  feePercent: 5,
  durationDays: 90,
  thresholdPercent: 3,
  userCount: 0
};

export const usePromoStatus = () => {
  const [promoState, setPromoState] = useState(DEFAULT_PROMO_STATE);

  const fetchPromoStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/promo/status`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const { data } = response;
      
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('[usePromo] API Response:', data);
      }
      
      if (data?.success && data?.data) {
        const promo = data.data;
        const limit = Number(promo.limit) || 50;
        const claimed = Number(promo.claimed) || 0;
        const spotsLeft = Math.max(0, limit - claimed);
        
        setPromoState({
          limit,
          claimed,
          spotsLeft,
          active: spotsLeft > 0,
          loading: false,
          error: null,
          feePercent: Number(promo.fee_percent) || 5,
          durationDays: Number(promo.duration_days) || 90,
          thresholdPercent: Number(promo.threshold_percent) || 3,
          userCount: Number(promo.user_count) || 0
        });
      } else {
        throw new Error(data?.message || 'Invalid response from server');
      }
    } catch (error) {
      console.error('[usePromo] Fetch error:', error);
      setPromoState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load promo status',
        // Keep existing values on error, don't reset to zero
      }));
    }
  }, []);

  useEffect(() => {
    fetchPromoStatus();
    const interval = setInterval(fetchPromoStatus, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchPromoStatus]);

  return promoState;
};

export const usePromoClaim = () => {
  const [state, setState] = useState({
    loading: false,
    success: false,
    error: null,
    data: null
  });

  const claim = useCallback(async (email, tier = "starter") => {
    if (!email || !email.includes('@')) {
      setState({
        loading: false,
        success: false,
        error: 'Please enter a valid email address',
        data: null
      });
      return false;
    }

    setState({ loading: true, success: false, error: null, data: null });

    try {
      const response = await axios.post(`${API_BASE}/api/promo/claim`, 
        { email: email.trim().toLowerCase(), tier },
        { timeout: 15000 }
      );
      
      const { data } = response;
      
      if (data?.success) {
        const result = data.data || data;
        setState({ 
          loading: false, 
          success: true, 
          error: null, 
          data: result 
        });
        return true;
      } else {
        throw new Error(data?.message || data?.error || 'Failed to claim promo');
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          "Spot already taken or promo full";
      
      setState({ 
        loading: false, 
        success: false, 
        error: errorMessage, 
        data: null 
      });
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, success: false, error: null, data: null });
  }, []);

  return { state, claim, reset };
};

// Optional: Cache the promo status in localStorage for offline/fallback
export const useCachedPromoStatus = () => {
  const promo = usePromoStatus();
  const [cached, setCached] = useState(null);
  
  useEffect(() => {
    if (!promo.loading && !promo.error) {
      localStorage.setItem('cached_promo_status', JSON.stringify(promo));
      setCached(promo);
    }
  }, [promo]);
  
  // Return cached data if available while loading
  if (promo.loading && cached) {
    return { ...cached, loading: true };
  }
  
  return promo;
};
