// src/hooks/useEnterprise.js
import { useState, useCallback } from 'react';
import { organizationApi, strategiesApi, brandingApi, botControlsApi, analyticsApi, auditApi } from '../services/enterpriseApi';

export const useEnterprise = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRequest = async (requestFn, successMessage = null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await requestFn();
      if (successMessage) {
        console.log(successMessage);
      }
      return result;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Organization Methods
  const getOrganization = useCallback(() => {
    return handleRequest(() => organizationApi.getOrganization());
  }, []);

  const getOrganizationUsers = useCallback(() => {
    return handleRequest(() => organizationApi.getOrganizationUsers());
  }, []);

  const inviteUser = useCallback((email, role) => {
    return handleRequest(() => organizationApi.inviteUser(email, role), `Invited ${email} as ${role}`);
  }, []);

  const removeUser = useCallback((userId) => {
    return handleRequest(() => organizationApi.removeUser(userId), 'User removed successfully');
  }, []);

  const updateUserRole = useCallback((userId, role) => {
    return handleRequest(() => organizationApi.updateUserRole(userId, role), `User role updated to ${role}`);
  }, []);

  // Strategy Methods
  const getStrategies = useCallback(() => {
    return handleRequest(() => strategiesApi.getStrategies());
  }, []);

  const createStrategy = useCallback((name, description, strategyConfig) => {
    return handleRequest(() => strategiesApi.createStrategy(name, description, strategyConfig), 'Strategy created successfully');
  }, []);

  const updateStrategy = useCallback((strategyId, updates) => {
    return handleRequest(() => strategiesApi.updateStrategy(strategyId, updates), 'Strategy updated successfully');
  }, []);

  const deleteStrategy = useCallback((strategyId) => {
    return handleRequest(() => strategiesApi.deleteStrategy(strategyId), 'Strategy deleted successfully');
  }, []);

  // Branding Methods
  const updateBranding = useCallback((branding) => {
    return handleRequest(() => brandingApi.updateBranding(branding), 'Branding updated successfully');
  }, []);

  // Bot Controls Methods
  const updateBotControls = useCallback((botControls) => {
    return handleRequest(() => botControlsApi.updateBotControls(botControls), 'Bot controls updated successfully');
  }, []);

  // Analytics Methods
  const getAnalytics = useCallback((days = 30) => {
    return handleRequest(() => analyticsApi.getAnalytics(days));
  }, []);

  // Audit Methods
  const getAuditLogs = useCallback((limit = 50, offset = 0) => {
    return handleRequest(() => auditApi.getAuditLogs(limit, offset));
  }, []);

  return {
    loading,
    error,
    getOrganization,
    getOrganizationUsers,
    inviteUser,
    removeUser,
    updateUserRole,
    getStrategies,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    updateBranding,
    updateBotControls,
    getAnalytics,
    getAuditLogs,
  };
};