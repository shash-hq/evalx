import api from './api.js';

export const createOrder = (contestId) => api.post('/payments/create-order', { contestId });
export const verifyPayment = (data) => api.post('/payments/verify', data);
export const getPaymentHistory = () => api.get('/payments/history');
