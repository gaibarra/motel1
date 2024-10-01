// utils/axios.js
import axios from 'axios';
import authService from '../api/authService';

const instance = axios.create({
  baseURL: 'https://motel1.click/api',
});

instance.interceptors.request.use(
  async (config) => {
    const token = authService.getCurrentUser();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default instance;
