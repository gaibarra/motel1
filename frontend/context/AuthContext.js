import React, { createContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import authService from '../api/authService';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const accessToken = authService.getCurrentUser();
    if (accessToken) {
      authService.getUserData(accessToken)
        .then(userData => {
          setUser(userData);
          setIsAuthenticated(true);
          setAxiosAuthHeader(accessToken);  // Set Axios header
        })
        .catch(async (error) => {
          console.error('Error fetching user data:', error);
          if (error.response && error.response.status === 401 && error.response.data.code === 'token_not_valid') {
            try {
              const newAccessToken = await authService.refreshToken();
              const userData = await authService.getUserData(newAccessToken);
              setUser(userData);
              setIsAuthenticated(true);
              setAxiosAuthHeader(newAccessToken);  // Set Axios header
            } catch (refreshError) {
              console.error('Error refreshing token:', refreshError);
              authService.logout();
            }
          }
        });
    }
  }, []);

  const login = async (username, password) => {
    try {
      const tokens = await authService.login(username, password);
      const userData = await authService.getUserData(tokens.access);
      setUser(userData);
      setIsAuthenticated(true);
      setAxiosAuthHeader(tokens.access);  // Set Axios header
      return userData;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    axios.defaults.headers.common['Authorization'] = '';  // Remove Axios header
  };

  const setAxiosAuthHeader = (token) => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
