import api from './api.js';

export const createSubmission = (data) => api.post('/submissions', data);
export const getSubmission = (id) => api.get(`/submissions/${id}`);
export const getContestSubmissions = (contestId, params) =>
  api.get(`/submissions/contest/${contestId}`, { params });
