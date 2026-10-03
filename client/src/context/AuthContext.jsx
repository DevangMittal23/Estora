import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { get, errorMessage } from '../api';
import { getToken, setToken as storeToken, clearToken } from '../session';
export const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [token, setToken] = useState(getToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState(null);
  const client = useQueryClient();
  const refresh = async () => {
    const requestToken = getToken();
    if (!requestToken) return;
    setLoading(true);
    setError(null);
    try {
      const nextUser = await get('/auth/me');
      if (getToken() === requestToken) setUser(nextUser);
    } catch (e) {
      if (getToken() === requestToken) setError(errorMessage(e));
    } finally {
      if (getToken() === requestToken) setLoading(false);
    }
  };
  useEffect(() => {
    const clear = () => {
      clearToken();
      setToken(null);
      setUser(null);
      setLoading(false);
      setError(null);
      client.clear();
    };
    window.addEventListener('estora:logout', clear);
    return () => window.removeEventListener('estora:logout', clear);
  }, [client]);
  useEffect(() => {
    if (token) {
      let alive = true;
      const controller = new AbortController();
      get('/auth/me', undefined, { signal: controller.signal })
        .then((data) => {
          if (alive && getToken() === token) setUser(data);
        })
        .catch((e) => {
          if (alive && getToken() === token) setError(errorMessage(e));
        })
        .finally(() => {
          if (alive && getToken() === token) setLoading(false);
        });
      return () => {
        alive = false;
        controller.abort();
      };
    }
    setLoading(false);
  }, [token]);
  const login = (nextToken, nextUser) => {
    client.clear();
    storeToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setError(null);
    setLoading(false);
  };
  const logout = () => {
    clearToken();
    setToken(null);
    setUser(null);
    setLoading(false);
    setError(null);
    client.clear();
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
