import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ProtectedRoute, RoleRoute, BrokerGuard } from '../routes/Guards';
function renderGuard(guard, auth) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/" element={<p>Landing destination</p>} />
          <Route path="/login" element={<p>Login destination</p>} />
          <Route path="/forbidden" element={<p>Forbidden destination</p>} />
          <Route element={guard}>
            <Route path="/protected" element={<p>Protected content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}
describe('role and identity guards', () => {
  it('sends visitors to login before rendering private data', () => {
    renderGuard(<ProtectedRoute />, { token: null });
    expect(screen.getByText('Login destination')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });
  it('waits for current profile before deciding access', () => {
    renderGuard(<ProtectedRoute />, { token: 'token', loading: true });
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Loading profile'
    );
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });
  it('rejects a logged-in user with the wrong role', () => {
    renderGuard(<RoleRoute role="ADMIN" />, { user: { role: 'INVESTOR' } });
    expect(screen.getByText('Forbidden destination')).toBeInTheDocument();
  });
  it('renders content only for a matching role', () => {
    renderGuard(<RoleRoute role="INVESTOR" />, { user: { role: 'INVESTOR' } });
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
  it('allows retry after a current-profile fetch error', async () => {
    const refresh = vi.fn();
    renderGuard(<ProtectedRoute />, {
      token: 'token',
      loading: false,
      error: 'Network unavailable',
      refresh,
    });
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalledOnce();
  });
  it('blocks an unapproved broker and allows checking status', async () => {
    const refresh = vi.fn();
    renderGuard(<BrokerGuard />, {
      user: { role: 'BROKER', brokerApproved: false },
      refresh,
    });
    expect(
      screen.getByText('Your broker account is under review')
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Check approval status' })
    );
    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });
  it('offers a safe Back destination when a directly opened private page cannot load the profile', async () => {
    window.history.replaceState({ idx: 0 }, '', '/protected');
    renderGuard(<ProtectedRoute />, {
      token: 'token',
      loading: false,
      error: 'Network unavailable',
      refresh: vi.fn(),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Landing destination')).toBeInTheDocument();
  });
});
