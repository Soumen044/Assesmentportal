import axios from 'axios';
import { clearAdminSession, getStoredAdminToken, isAdminTokenExpired } from './adminSession';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL
});

function isAdminApiRequest(url = '') {
  return String(url).startsWith('/api/admin') || String(url).startsWith('/api/assessments');
}

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = getStoredAdminToken();
    if (token) {
      if (isAdminTokenExpired(token) && isAdminApiRequest(config.url)) {
        clearAdminSession();
        return Promise.reject(new axios.CanceledError('Admin session expired'));
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      typeof window !== 'undefined'
      && error?.response?.status === 401
      && isAdminApiRequest(error?.config?.url)
    ) {
      clearAdminSession();
    }
    return Promise.reject(error);
  }
);

export default api;
