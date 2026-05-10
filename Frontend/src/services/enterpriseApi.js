// src/services/enterpriseApi.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.imali-defi.com';

const getToken = () => {
  try {
    return localStorage.getItem('imali_token');
  } catch {
    return null;
  }
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('imali_token');
      localStorage.removeItem('imali_user');
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// =============================================
// ORGANIZATION APIs
// =============================================

export const organizationApi = {
  getOrganization: async () => {
    try {
      const response = await apiClient.get('/api/enterprise/organization');
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        status: error.response?.status,
      };
    }
  },

  getOrganizationUsers: async () => {
    try {
      const response = await apiClient.get('/api/enterprise/organization/users');
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        status: error.response?.status,
      };
    }
  },

  inviteUser: async (email, role) => {
    try {
      const response = await apiClient.post('/api/enterprise/organization/invite', { email, role });
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        status: error.response?.status,
      };
    }
  },

  removeUser: async (userId) => {
    try {
      const response = await apiClient.delete(`/api/enterprise/organization/users/${userId}`);
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        status: error.response?.status,
      };
    }
  },

  updateUserRole: async (userId, role) => {
    try {
      const response = await apiClient.put(`/api/enterprise/organization/users/${userId}/role`, { role });
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        status: error.response?.status,
      };
    }
  },
};

// =============================================
// STRATEGY APIs
// =============================================

export const strategiesApi = {
  getStrategies: async () => {
    try {
      const response = await apiClient.get('/api/enterprise/strategies');
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        strategies: [],
        custom_config: {},
      };
    }
  },

  createStrategy: async (name, description, strategyConfig) => {
    try {
      const response = await apiClient.post('/api/enterprise/strategies', {
        name,
        description,
        strategy_config: strategyConfig,
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        status: error.response?.status,
      };
    }
  },

  updateStrategy: async (strategyId, updates) => {
    try {
      const response = await apiClient.put(`/api/enterprise/strategies/${strategyId}`, updates);
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        status: error.response?.status,
      };
    }
  },

  deleteStrategy: async (strategyId) => {
    try {
      const response = await apiClient.delete(`/api/enterprise/strategies/${strategyId}`);
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        status: error.response?.status,
      };
    }
  },
};

// =============================================
// BRANDING APIs
// =============================================

export const brandingApi = {
  updateBranding: async (branding) => {
    try {
      const response = await apiClient.put('/api/enterprise/branding', { branding });
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        status: error.response?.status,
      };
    }
  },
};

// =============================================
// BOT CONTROLS APIs
// =============================================

export const botControlsApi = {
  updateBotControls: async (botControls) => {
    try {
      const response = await apiClient.put('/api/enterprise/bot-controls', { bot_controls: botControls });
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        status: error.response?.status,
      };
    }
  },
};

// =============================================
// ANALYTICS APIs
// =============================================

export const analyticsApi = {
  getAnalytics: async (days = 30) => {
    try {
      const response = await apiClient.get(`/api/enterprise/analytics?days=${days}`);
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        data: {
          summary: {
            total_trades: 0,
            closed_trades: 0,
            open_trades: 0,
            total_pnl: 0,
            avg_pnl: 0,
            win_rate: 0,
            winning_trades: 0,
            losing_trades: 0,
          },
          members: [],
          period_days: days,
        },
      };
    }
  },
};

// =============================================
// AUDIT LOG APIs
// =============================================

export const auditApi = {
  getAuditLogs: async (limit = 50, offset = 0) => {
    try {
      const response = await apiClient.get(`/api/enterprise/audit-logs?limit=${limit}&offset=${offset}`);
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        logs: [],
        total: 0,
      };
    }
  },
};

// =============================================
// ADMIN APIs (Admin only)
// =============================================

export const adminEnterpriseApi = {
  getRequests: async (status = 'pending') => {
    try {
      const response = await apiClient.get(`/api/admin/enterprise-requests?status=${status}`);
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        requests: [],
      };
    }
  },

  updateRequestStatus: async (requestId, status, notes = null) => {
    try {
      const response = await apiClient.put(`/api/admin/enterprise-requests/${requestId}`, { status, notes });
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        status: error.response?.status,
      };
    }
  },

  getAllOrganizations: async () => {
    try {
      const response = await apiClient.get('/api/admin/organizations');
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        organizations: [],
      };
    }
  },

  getEnterpriseAnalytics: async () => {
    try {
      const response = await apiClient.get('/api/admin/enterprise/analytics');
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  },
};

// =============================================
// DEFAULT EXPORT (for backward compatibility)
// =============================================

const enterpriseApi = {
  organizationApi,
  strategiesApi,
  brandingApi,
  botControlsApi,
  analyticsApi,
  auditApi,
  adminEnterpriseApi,
};

export default enterpriseApi;
