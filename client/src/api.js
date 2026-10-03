import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getToken, clearToken } from './session';
export const apiOrigin = import.meta.env.VITE_API_URL.replace(/\/$/, '');
export const api = axios.create({ baseURL: `${apiOrigin}/api/v1` });
api.interceptors.request.use((config) => {
  const token = getToken();
  config.estoraToken = token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login') &&
      error.config?.estoraToken &&
      error.config.estoraToken === getToken()
    ) {
      clearToken();
      window.dispatchEvent(new Event('estora:logout'));
    }
    return Promise.reject(error);
  }
);
export const errorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.message ||
  'Something went wrong. Please try again.';
export const get = async (path, params, config = {}) =>
  (await api.get(path, { ...config, params })).data.data;
export const send = async (method, path, body) =>
  (await api[method](path, body)).data.data;
export function useData(path, params = {}, options = {}) {
  return useQuery({
    queryKey: [path, params, getToken()],
    queryFn: ({ signal }) => get(path, params, { signal }),
    ...options,
  });
}
export function useAction(action, success = 'Changes saved') {
  const client = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: async () => {
      if (success) toast.success(success);
      await client.invalidateQueries();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
