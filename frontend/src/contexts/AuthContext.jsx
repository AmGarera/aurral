import React, { createContext, useContext, useState, useEffect } from 'react';
import { checkHealth, verifyCredentials, verifyPlexToken } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [plexAuthEnabled, setPlexAuthEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      const healthData = await checkHealth();
      const isRequired = healthData.authRequired;
      const authUser = healthData.authUser || 'admin';
      setAuthRequired(isRequired);
      setPlexAuthEnabled(!!healthData.plexAuthEnabled);

      if (isRequired) {
         localStorage.setItem('auth_user', authUser);
      }

      if (!isRequired) {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // Check Plex session token first
      const storedPlexToken = localStorage.getItem('plex_token');
      if (storedPlexToken) {
        try {
          const isValid = await verifyPlexToken(storedPlexToken);
          if (isValid) {
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          } else {
            localStorage.removeItem('plex_token');
          }
        } catch (e) {
          console.error("Plex token verification failed", e);
        }
      }

      // Fall back to basic auth credentials
      const storedPassword = localStorage.getItem('auth_password');
      const storedUser = localStorage.getItem('auth_user') || 'admin';

      if (storedPassword) {
        try {
           const isValid = await verifyCredentials(storedPassword, storedUser);
           setIsAuthenticated(isValid);
           if (!isValid) {
             localStorage.removeItem('auth_password');
           }
        } catch (e) {
           console.error("Credential verification failed", e);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (password, username = 'admin') => {
    if (!password) return false;

    try {
      const isValid = await verifyCredentials(password, username);
      if (isValid) {
        localStorage.setItem('auth_password', password);
        localStorage.setItem('auth_user', username);
        setIsAuthenticated(true);
        window.location.reload();
        return true;
      }
      return false;
    } catch (e) {
      console.error("Login failed:", e);
      return false;
    }
  };

  const plexLogin = (sessionToken) => {
    localStorage.setItem('plex_token', sessionToken);
    setIsAuthenticated(true);
    window.location.reload();
  };

  const logout = () => {
    localStorage.removeItem('auth_password');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('plex_token');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, plexLogin, logout, authRequired, plexAuthEnabled }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
