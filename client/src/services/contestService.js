import api from './api.js';

export const getContests = (params) => api.get('/contests', { params });
export const getContestBySlug = (slug) => api.get(`/contests/${slug}`);
export const createContest = (data) => api.post('/contests', data);
export const updateContest = (id, data) => api.put(`/contests/${id}`, data);
export const deleteContest = (id) => api.delete(`/contests/${id}`);
export const getContestArena = (id) => api.get(`/contests/${id}/arena`);
export const getContestProblems = (id) => api.get(`/contests/${id}/problems`);
export const getLeaderboard = (id) => api.get(`/contests/${id}/leaderboard`);
export const getMySubmissions = (id) => api.get(`/contests/${id}/my-submissions`);
