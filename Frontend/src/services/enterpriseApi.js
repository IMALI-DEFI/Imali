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

// Handle response errors
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

/**
 * Get organization details
 * GET /api/enterprise/organization
 */
export const getOrganization = async () => {
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
};

/**
 * Get organization users/team members
 * GET /api/enterprise/organization/users
 */
export const getOrganizationUsers = async () => {
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
};

/**
 * Invite a new team member
 * POST /api/enterprise/organization/invite
 * @param {string} email - User email to invite
 * @param {string} role - Role: 'admin', 'member', or 'viewer'
 */
export const inviteTeamMember = async (email, role) => {
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
};

/**
 * Remove a team member
 * DELETE /api/enterprise/organization/users/:userId
 * @param {string} userId - User ID to remove
 */
export const removeTeamMember = async (userId) => {
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
};

/**
 * Update a team member's role
 * PUT /api/enterprise/organization/users/:userId/role
 * @param {string} userId - User ID to update
 * @param {string} role - New role: 'admin', 'member', or 'viewer'
 */
export const updateTeamMemberRole = async (userId, role) => {
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
};

// =============================================
// CUSTOM STRATEGY APIs
// =============================================

/**
 * Get all custom strategies for the organization
 * GET /api/enterprise/strategies
 */
export const getCustomStrategies = async () => {
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
};

/**
 * Create a new custom strategy
 * POST /api/enterprise/strategies
 * @param {string} name - Strategy name
 * @param {string} description - Strategy description
 * @param {object} strategyConfig - Strategy configuration object
 */
export const createCustomStrategy = async (name, description, strategyConfig) => {
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
};

/**
 * Update an existing custom strategy
 * PUT /api/enterprise/strategies/:strategyId
 * @param {string} strategyId - Strategy ID
 * @param {object} updates - Updates to apply (name, description, strategy_config, is_active)
 */
export const updateCustomStrategy = async (strategyId, updates) => {
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
};

/**
 * Delete a custom strategy
 * DELETE /api/enterprise/strategies/:strategyId
 * @param {string} strategyId - Strategy ID to delete
 */
export const deleteCustomStrategy = async (strategyId) => {
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
};

// =============================================
// BRANDING APIs
// =============================================

/**
 * Update organization branding
 * PUT /api/enterprise/branding
 * @param {object} branding - Branding configuration object
 */
export const updateBranding = async (branding) => {
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
};

// =============================================
// BOT CONTROLS APIs
// =============================================

/**
 * Update enhanced bot controls
 * PUT /api/enterprise/bot-controls
 * @param {object} botControls - Bot controls configuration object
 */
export const updateBotControls = async (botControls) => {
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
};

// =============================================
// ANALYTICS APIs
// =============================================

/**
 * Get organization analytics
 * GET /api/enterprise/analytics
 * @param {number} days - Number of days to include (default: 30)
 */
export const getEnterpriseAnalytics = async (days = 30) => {
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
};

// =============================================
// AUDIT LOG APIs
// =============================================

/**
 * Get enterprise audit logs
 * GET /api/enterprise/audit-logs
 * @param {number} limit - Number of logs to return (default: 50)
 * @param {number} offset - Offset for pagination (default: 0)
 */
export const getAuditLogs = async (limit = 50, offset = 0) => {
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
};

// =============================================
// ADMIN ENTERPRISE APIs (Admin only)
// =============================================

/**
 * Get pending enterprise requests (Admin only)
 * GET /api/admin/enterprise-requests
 * @param {string} status - Filter by status: 'pending', 'approved', 'rejected', 'all'
 */
export const getEnterpriseRequests = async (status = 'pending') => {
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
};

/**
 * Update enterprise request status (Admin only)
 * PUT /api/admin/enterprise-requests/:requestId
 * @param {string} requestId - Request ID
 * @param {string} status - New status: 'approved' or 'rejected'
 * @param {string} notes - Optional notes for rejection
 */
export const updateEnterpriseRequest = async (requestId, status, notes = null) => {
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
};

// =============================================
// ORGANIZATION MANAGEMENT (Admin only)
// =============================================

/**
 * Get all organizations (Admin only)
 * GET /api/admin/organizations
 */
export const getAllOrganizations = async () => {
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
};

/**
 * Get enterprise analytics (Admin only)
 * GET /api/admin/enterprise/analytics
 */
export const getAdminEnterpriseAnalytics = async () => {
  try {
    const response = await apiClient.get('/api/admin/enterprise/analytics');
    return response.data;
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message,
    };
  }
};

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Check if current user is enterprise admin
 */
export const isEnterpriseAdmin = (user) => {
  return user?.tier === 'enterprise' && 
         (user?.organization_role === 'admin' || user?.organization_role === 'owner');
};

/**
 * Check if current user has enterprise access
 */
export const hasEnterpriseAccess = (user) => {
  return user?.tier === 'enterprise';
};

/**
 * Get enterprise role display name
 */
export const getEnterpriseRoleName = (role) => {
  const roles = {
    admin: 'Admin',
    member: 'Member',
    viewer: 'Viewer',
    owner: 'Owner',
  };
  return roles[role] || role || 'Member';
};

/**
 * Get enterprise role color
 */
export const getEnterpriseRoleColor = (role) => {
  const colors = {
    admin: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    owner: 'bg-red-500/20 text-red-300 border-red-500/30',
    member: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    viewer: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  };
  return colors[role] || colors.member;
};

export default {
  getOrganization,
  getOrganizationUsers,
  inviteTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
  getCustomStrategies,
  createCustomStrategy,
  updateCustomStrategy,
  deleteCustomStrategy,
  updateBranding,
  updateBotControls,
  getEnterpriseAnalytics,
  getAuditLogs,
  getEnterpriseRequests,
  updateEnterpriseRequest,
  getAllOrganizations,
  getAdminEnterpriseAnalytics,
  isEnterpriseAdmin,
  hasEnterpriseAccess,
  getEnterpriseRoleName,
  getEnterpriseRoleColor,
};