import axios from 'axios';
import { store } from '../store/index.js';
import { logout, setCredentials } from '../store/slices/authSlice.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.evalx.in/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// Refresh token on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefresh } = data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefresh);
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        store.dispatch(logout());
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
