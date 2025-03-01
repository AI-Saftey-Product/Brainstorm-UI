import axios from 'axios';

// Use environment variable for API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const customError = {
      status: error.response?.status || 500,
      message: error.response?.data?.message || 'Something went wrong',
      data: error.response?.data || {},
    };
    
    // Log errors in development
    if (import.meta.env.DEV) {
      console.error('API Error:', customError);
    }
    
    return Promise.reject(customError);
  }
);

export default api;