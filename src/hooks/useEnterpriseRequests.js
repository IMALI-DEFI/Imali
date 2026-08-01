// src/hooks/useEnterpriseRequests.js
import { useState, useCallback } from 'react';
import { adminEnterpriseApi } from '../services/enterpriseApi';

export const useEnterpriseRequests = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getRequests = useCallback(async (status = 'pending') => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminEnterpriseApi.getRequests(status);
      return result;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const approveRequest = useCallback(async (requestId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminEnterpriseApi.updateRequestStatus(requestId, 'approved');
      return result;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const rejectRequest = useCallback(async (requestId, notes) => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminEnterpriseApi.updateRequestStatus(requestId, 'rejected', notes);
      return result;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getRequests,
    approveRequest,
    rejectRequest,
  };
};