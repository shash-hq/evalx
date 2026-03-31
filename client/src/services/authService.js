import api from './api.js';

export const register = (data) => api.post('/auth/register', data);
export const verifyOTP = (data) => api.post('/auth/verify-otp', data);
export const login = (data) => api.post('/auth/login', data);
export const refreshToken = () => api.post('/auth/refresh-token');
export const logoutAPI = () => api.post('/auth/logout');
export const resendOTP = (data) => api.post('/auth/resend-otp', data);
