// src/hooks/usePromo.js
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const mountedRef = useRef(true);
  const intervalRef = useRef(null);

  const fetchPromoStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/promo/status`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      const { data } = response;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[usePromo] API Response:', data);
      }
      
      if (data?.success && data?.data) {
        const promo = data.data;
        const limit = Number(promo.limit) || 50;
        const claimed = Number(promo.claimed) || 0;
        const spotsLeft = Math.max(0, limit - claimed);
        
        if (mountedRef.current) {
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
        }
      } else {
        throw new Error(data?.message || 'Invalid response from server');
      }
    } catch (error) {
      console.error('[usePromo] Fetch error:', error);
      if (mountedRef.current) {
        setPromoState(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'Failed to load promo status',
        }));
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchPromoStatus();
    
    // Refresh every 60 seconds
    intervalRef.current = setInterval(fetchPromoStatus, 60000);
    
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
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
  const mountedRef = useRef(true);

  const claim = useCallback(async (email, tier = "starter") => {
    // Validate email
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
      // FIXED: Send ONLY email and tier - NO code parameter
      // The backend will generate its own promo code
      const payload = {
        email: email.trim().toLowerCase(),
        tier: tier || "starter"
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[usePromo] Claim payload:', payload);
      }
      
      const response = await axios.post(`${API_BASE}/api/promo/claim`, payload, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      const { data } = response;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[usePromo] Claim response:', data);
      }
      
      if (data?.success) {
        const result = data.data || data;
        if (mountedRef.current) {
          setState({ 
            loading: false, 
            success: true, 
            error: null, 
            data: result 
          });
        }
        return true;
      } else {
        throw new Error(data?.message || data?.error || 'Failed to claim promo');
      }
    } catch (error) {
      // Handle different error response formats
      let errorMessage = "Failed to claim promo spot";
      
      if (error.response) {
        // Server responded with error status
        const responseData = error.response.data;
        errorMessage = responseData?.message || 
                      responseData?.error || 
                      responseData?.data?.message ||
                      error.response.statusText ||
                      "Server error";
                      
        // Specific error codes
        if (error.response.status === 400) {
          if (errorMessage.includes('already claimed') || errorMessage.includes('email already')) {
            errorMessage = "This email has already claimed a promo spot";
          } else if (errorMessage.includes('limit reached')) {
            errorMessage = "Sorry, all promo spots have been claimed";
          } else {
            errorMessage = "Invalid request. Please check your email address.";
          }
        } else if (error.response.status === 429) {
          errorMessage = "Too many requests. Please try again later.";
        } else if (error.response.status === 503) {
          errorMessage = "Service temporarily unavailable. Please try again.";
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error('[usePromo] Claim error:', errorMessage, error);
      
      if (mountedRef.current) {
        setState({ 
          loading: false, 
          success: false, 
          error: errorMessage, 
          data: null 
        });
      }
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    if (mountedRef.current) {
      setState({ loading: false, success: false, error: null, data: null });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { state, claim, reset };
};

// Hook to check if user is eligible for promo (based on email domain or other criteria)
export const usePromoEligibility = () => {
  const [eligibility, setEligibility] = useState({
    eligible: false,
    checking: true,
    message: null
  });

  const checkEligibility = useCallback(async (email) => {
    if (!email || !email.includes('@')) {
      setEligibility({ eligible: false, checking: false, message: "Please enter a valid email" });
      return false;
    }

    setEligibility(prev => ({ ...prev, checking: true }));

    try {
      // You can add an eligibility endpoint or check client-side
      const emailDomain = email.split('@')[1].toLowerCase();
      
      // Example: Block certain domains (optional)
      const blockedDomains = ['tempmail.com', '10minutemail.com'];
      
      if (blockedDomains.includes(emailDomain)) {
        setEligibility({
          eligible: false,
          checking: false,
          message: "Please use a valid email address (temporary emails are not allowed)"
        });
        return false;
      }
      
      // Check if promo is still available via status endpoint
      const response = await axios.get(`${API_BASE}/api/promo/status`, { timeout: 5000 });
      
      if (response.data?.success && response.data?.data) {
        const spotsLeft = response.data.data.spots_left || 0;
        const eligible = spotsLeft > 0;
        
        setEligibility({
          eligible,
          checking: false,
          message: eligible ? "You're eligible for the free trial!" : "Sorry, all promo spots have been claimed"
        });
        return eligible;
      }
      
      setEligibility({ eligible: true, checking: false, message: "You're eligible for the free trial!" });
      return true;
      
    } catch (error) {
      console.error('[usePromo] Eligibility check error:', error);
      // Default to eligible if we can't check (fail open)
      setEligibility({ eligible: true, checking: false, message: null });
      return true;
    }
  }, []);

  return { eligibility, checkEligibility };
};

// Optional: Cache the promo status in localStorage for offline/fallback
export const useCachedPromoStatus = () => {
  const promo = usePromoStatus();
  const [cached, setCached] = useState(null);
  
  useEffect(() => {
    if (!promo.loading && !promo.error) {
      const cacheData = {
        limit: promo.limit,
        claimed: promo.claimed,
        spotsLeft: promo.spotsLeft,
        active: promo.active,
        feePercent: promo.feePercent,
        durationDays: promo.durationDays,
        thresholdPercent: promo.thresholdPercent,
        cachedAt: Date.now()
      };
      localStorage.setItem('cached_promo_status', JSON.stringify(cacheData));
      setCached(cacheData);
    }
  }, [promo]);
  
  // Return cached data if available while loading
  if (promo.loading && cached) {
    // Check if cache is less than 5 minutes old
    const isCacheValid = Date.now() - (cached.cachedAt || 0) < 5 * 60 * 1000;
    if (isCacheValid) {
      return { ...cached, loading: true, fromCache: true };
    }
  }
  
  return promo;
};
