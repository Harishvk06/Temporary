import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../utils/constants';

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s timeout for long-running AI tasks
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aura_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as ExtendedAxiosRequestConfig | undefined;

    if (error.response?.status === 401) {
      localStorage.removeItem('aura_token');
      localStorage.removeItem('aura_user');
      return Promise.reject(new Error('Session expired. Please sign in again.'));
    }

    // Automatic retry logic for transient network failures & server timeouts (up to 3 retries)
    if (config && !config.signal?.aborted) {
      const retryCount = config._retryCount || 0;
      const isRetryableError =
        !error.response ||
        error.code === 'ERR_NETWORK' ||
        error.code === 'ECONNABORTED' ||
        [502, 503, 504].includes(error.response.status);

      if (isRetryableError && retryCount < 3) {
        config._retryCount = retryCount + 1;
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delay));
        return apiClient(config);
      }
    }

    // Normalize error message
    let message = 'An unexpected network error occurred.';
    if (error.code === 'ECONNABORTED') {
      message = 'Request timed out. The server took too long to respond.';
    } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Failed to fetch')) {
      message = 'Network error. Please check your connection and backend server.';
    } else if (error.response?.data && typeof error.response.data === 'object') {
      const data = error.response.data as any;
      message = data.detail || data.message || data.error || message;
    }

    return Promise.reject(new Error(message));
  }
);

