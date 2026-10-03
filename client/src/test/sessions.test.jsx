import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { api, useData } from '../api';
import { getToken } from '../session';
import { investmentKey } from '../utils';

const investor = { _id: 'a', name: 'Investor A', role: 'INVESTOR' };
const admin = { _id: 'b', name: 'Admin B', role: 'ADMIN' };
const response = (config, data) => ({
  config,
  data: { data },
  status: 200,
  headers: {},
});
const originalAdapter = api.defaults.adapter;
const unauthorized = (config) => ({
  config,
  response: { status: 401 },
  message: 'Unauthorized',
});
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
};

function WalletSnapshot() {
  const query = useData('/wallet');
  return (
    <output data-testid="wallet">
      {query.data?.walletBalance ?? 'loading'}
    </output>
  );
}
function SessionControls({ wallet = false }) {
  const auth = useAuth();
  return (
    <>
      <output data-testid="identity">{auth.user?.name || 'Signed out'}</output>
      <button onClick={() => auth.login('token-a', investor)}>Login A</button>
      <button onClick={() => auth.login('token-b', admin)}>Login B</button>
      <button onClick={auth.logout}>Logout</button>
      <button onClick={auth.refresh}>Refresh</button>
      {wallet && auth.user && <WalletSnapshot />}
    </>
  );
}
function mount(wallet = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <SessionControls wallet={wallet} />
        </AuthProvider>
      </QueryClientProvider>
    ),
  };
}
beforeEach(() => {
  api.defaults.adapter = vi.fn(async (config) =>
    response(
      config,
      config.url === '/auth/me'
        ? config.estoraToken === 'token-a'
          ? investor
          : admin
        : { walletBalance: config.estoraToken === 'token-a' ? 100 : 200 }
    )
  );
});
afterEach(() => {
  api.defaults.adapter = originalAdapter;
});

describe('tab-scoped authentication', () => {
  it("ignores another tab's shared token and sends requests using this tab's identity", async () => {
    localStorage.setItem('token', 'legacy-shared-token');
    mount();
    expect(screen.getByTestId('identity')).toHaveTextContent('Signed out');
    expect(getToken()).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Login A' }));
    expect(sessionStorage.getItem('token')).toBe('token-a');
    expect(localStorage.getItem('token')).toBeNull();
    localStorage.setItem('token', 'another-tab-token');
    await api.get('/wallet');
    expect(
      api.defaults.adapter.mock.calls.at(-1)[0].headers.Authorization
    ).toBe('Bearer token-a');
    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(getToken()).toBeNull();
    expect(localStorage.getItem('token')).toBe('another-tab-token');
  });
  it('restores the current tab session after a reload', async () => {
    sessionStorage.setItem('token', 'token-a');
    const first = mount();
    await vi.waitFor(() =>
      expect(screen.getByTestId('identity')).toHaveTextContent('Investor A')
    );
    first.unmount();
    mount();
    await vi.waitFor(() =>
      expect(screen.getByTestId('identity')).toHaveTextContent('Investor A')
    );
  });
  it('expires only the session whose authenticated request failed', async () => {
    mount();
    await userEvent.click(screen.getByRole('button', { name: 'Login A' }));
    api.defaults.adapter = (config) => Promise.reject(unauthorized(config));
    await act(async () => {
      await expect(api.get('/wallet')).rejects.toMatchObject({
        response: { status: 401 },
      });
    });
    expect(getToken()).toBeNull();
    expect(screen.getByTestId('identity')).toHaveTextContent('Signed out');
  });
  it('does not log out a new account when an old request later returns 401', async () => {
    mount();
    await userEvent.click(screen.getByRole('button', { name: 'Login A' }));
    const pending = deferred();
    let oldConfig;
    const adapter = api.defaults.adapter;
    api.defaults.adapter = (config) => {
      if (config.url !== '/old-request') return adapter(config);
      oldConfig = config;
      return pending.promise;
    };
    const result = api.get('/old-request').catch((error) => error);
    await vi.waitFor(() => expect(oldConfig?.estoraToken).toBe('token-a'));
    await userEvent.click(screen.getByRole('button', { name: 'Login B' }));
    await act(async () => {
      pending.reject(unauthorized(oldConfig));
      await result;
    });
    expect(getToken()).toBe('token-b');
    expect(screen.getByTestId('identity')).toHaveTextContent('Admin B');
  });
  it('ignores a stale profile refresh after switching accounts', async () => {
    mount();
    await userEvent.click(screen.getByRole('button', { name: 'Login A' }));
    const pending = deferred();
    let oldConfig;
    const adapter = api.defaults.adapter;
    api.defaults.adapter = (config) => {
      if (config.url === '/auth/me' && config.estoraToken === 'token-a') {
        oldConfig = config;
        return pending.promise;
      }
      return adapter(config);
    };
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await vi.waitFor(() => expect(oldConfig).toBeDefined());
    await userEvent.click(screen.getByRole('button', { name: 'Login B' }));
    await act(async () => {
      pending.resolve(response(oldConfig, investor));
    });
    expect(screen.getByTestId('identity')).toHaveTextContent('Admin B');
  });
  it('cancels old wallet queries and keeps caches isolated on account changes', async () => {
    mount(true);
    const pending = deferred();
    let oldConfig;
    const adapter = api.defaults.adapter;
    api.defaults.adapter = (config) => {
      if (config.url === '/wallet' && config.estoraToken === 'token-a') {
        oldConfig = config;
        return pending.promise;
      }
      return adapter(config);
    };
    await userEvent.click(screen.getByRole('button', { name: 'Login A' }));
    await vi.waitFor(() => expect(oldConfig).toBeDefined());
    await userEvent.click(screen.getByRole('button', { name: 'Login B' }));
    await vi.waitFor(() =>
      expect(screen.getByTestId('wallet')).toHaveTextContent('200')
    );
    expect(oldConfig.signal.aborted).toBe(true);
    await act(async () => {
      pending.resolve(response(oldConfig, { walletBalance: 100 }));
    });
    expect(screen.getByTestId('wallet')).toHaveTextContent('200');
  });
  it('keeps purchase retry identity within a tab without sharing new purchase intent', () => {
    const first = investmentKey('a', 'property', 1);
    expect(investmentKey('a', 'property', 1).key).toBe(first.key);
    expect(localStorage.getItem(first.storageKey)).toBeNull();
    const saved = sessionStorage.getItem(first.storageKey);
    sessionStorage.clear();
    expect(investmentKey('a', 'property', 1).key).not.toBe(first.key);
    sessionStorage.setItem(first.storageKey, saved);
    expect(investmentKey('a', 'property', 1).key).toBe(first.key);
  });
});
