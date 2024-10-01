import axios from 'axios';

const API_URL = 'https://motel1.click/api';

const authService = {
  login: async (username, password) => {
    const response = await axios.post(`${API_URL}/token/`, {
      username,
      password,
    });
    const { access, refresh } = response.data;
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    return { access, refresh };
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  getCurrentUser: () => {
    return localStorage.getItem('accessToken');
  },

  getUserData: async (token) => {
    try {
      const response = await axios.get(`${API_URL}/auth/user/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  },

  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(`${API_URL}/token/refresh/`, {
        refresh: refreshToken,
      });
      const { access } = response.data;
      localStorage.setItem('accessToken', access);
      return access;
    } catch (error) {
      console.error('Error refreshing token:', error);
      // Manejar la redirección al login si no se puede actualizar el token
      authService.logout();
      window.location.href = '/login';
      throw error;
    }
  },
};

export default authService;
