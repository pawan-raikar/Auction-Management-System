import React, { createContext, useState, useEffect } from 'react';
import { get } from '../api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ae_token');
    if (token) {
      get('/auth/me')
        .then(userData => {
          setUser(userData);
        })
        .catch(() => {
          localStorage.removeItem('ae_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('ae_token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('ae_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
