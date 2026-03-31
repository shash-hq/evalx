import api from './api.js';

export const getSuperAdminHealth = () => api.get('/superadmin/health');
export const getAuditLogs = (params) => api.get('/superadmin/audit-logs', { params });
