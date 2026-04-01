// src/hooks/usePromo.js
import { useState, useEffect } from 'react';
import axios from 'axios';

export const usePromoStatus = () => {
  const [promoState, setPromoState] = useState({
    limit: 50,
    claimed: 0,
    spotsLeft: 50,
    active: true,
    loading: true,
    feePercent: 5,
    durationDays: 90,
    thresholdPercent: 3,
    userCount: 0
  });

  useEffect(() => {
    const fetchPromoStatus = async () => {
      try {
        const response = await axios.get('/api/promo/status');
        const data = response.data;
        
        if (data.success && data.data) {
          const promo = data.data;
          const limit = Number(promo.limit) || 50;
          const claimed = Number(promo.claimed) || 0;
          
          setPromoState({
            limit,
            claimed,
            spotsLeft: Math.max(0, limit - claimed),
            active: claimed < limit,
            loading: false,
            feePercent: Number(promo.fee_percent) || 5,
            durationDays: Number(promo.duration_days) || 90,
            thresholdPercent: Number(promo.threshold_percent) || 3,
            userCount: Number(promo.user_count) || 0
          });
        } else {
          setPromoState(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error("Failed to fetch promo status:", error);
        setPromoState(prev => ({ ...prev, loading: false }));
      }
    };
    
    fetchPromoStatus();
    const interval = setInterval(fetchPromoStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  return promoState;
};

export const usePromoClaim = () => {
  const [state, setState] = useState({
    loading: false,
    success: false,
    error: null,
    data: null
  });

  const claim = async (email, tier = "starter") => {
    if (!email) return false;

    setState({ loading: true, success: false, error: null, data: null });

    try {
      const res = await axios.post('/api/promo/claim', { email, tier });
      const result = res.data.data || res.data;

      setState({ loading: false, success: true, error: null, data: result });
      return true;
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Spot already taken or promo full";
      setState({ loading: false, success: false, error: msg, data: null });
      return false;
    }
  };

  const reset = () => setState({ loading: false, success: false, error: null, data: null });

  return { state, claim, reset };
};