// src/constants/enterpriseRoles.js
export const ENTERPRISE_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
};

export const ROLE_LABELS = {
  [ENTERPRISE_ROLES.ADMIN]: 'Admin',
  [ENTERPRISE_ROLES.MEMBER]: 'Member',
  [ENTERPRISE_ROLES.VIEWER]: 'Viewer',
};

export const ROLE_DESCRIPTIONS = {
  [ENTERPRISE_ROLES.ADMIN]: 'Full access to all organization settings and member management',
  [ENTERPRISE_ROLES.MEMBER]: 'Can trade and view team analytics',
  [ENTERPRISE_ROLES.VIEWER]: 'Read-only access to dashboards and reports',
};

export const ROLE_COLORS = {
  [ENTERPRISE_ROLES.ADMIN]: 'purple',
  [ENTERPRISE_ROLES.MEMBER]: 'blue',
  [ENTERPRISE_ROLES.VIEWER]: 'gray',
};