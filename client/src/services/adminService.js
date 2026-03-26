import api from './api.js';

export const getAdminStats = () => api.get('/admin/stats');
export const getAdminContests = (params) => api.get('/admin/contests', { params });
export const approveContest = (id) => api.put(`/admin/contests/${id}/approve`);
export const rejectContest = (id) => api.put(`/admin/contests/${id}/reject`);
export const triggerClose = (id) => api.post(`/admin/contests/${id}/trigger-close`);
export const processPayouts = (id) => api.post(`/admin/contests/${id}/payouts`);
export const getAdminUsers = (params) => api.get('/admin/users', { params });
export const updateUserRole = (id, role) => api.put(`/admin/users/${id}/role`, { role });
