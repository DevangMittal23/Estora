import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { get, send, errorMessage } from '../api';
export const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState(null);
  const client = useQueryClient();
  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setUser(await get('/auth/me'));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const clear = () => {
      setToken(null);
      setUser(null);
      client.clear();
    };
    window.addEventListener('estora:logout', clear);
    return () => window.removeEventListener('estora:logout', clear);
  }, [client]);
  useEffect(() => {
    if (token) {
      let alive = true;
      get('/auth/me')
        .then((data) => {
          if (alive) setUser(data);
        })
        .catch((e) => {
          if (alive) setError(errorMessage(e));
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
      return () => {
        alive = false;
      };
    }
    setLoading(false);
  }, [token]);
  const login = (nextToken, nextUser) => {
    localStorage.setItem('token', nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setError(null);
  };
  const logout = async () => {
    try {
      await send('post', '/auth/logout');
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      client.clear();
    }
  };
  return (
    <AuthContext.Provider
      value={{ token, user, loading, error, refresh, login, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
