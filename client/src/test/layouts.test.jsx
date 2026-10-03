import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { SessionLayout } from '../layouts/Layouts';
import { ProtectedRoute, RoleRoute } from '../routes/Guards';

vi.mock('../api', async (original) => ({
  ...(await original()),
  useData: () => ({ data: { unreadCount: 2, walletBalance: 10000 } }),
}));

const roles = ['ADMIN', 'BROKER', 'INVESTOR'];
const authFor = (role) => ({
  token: 'test-token',
  user: { _id: 'user', name: 'Signed in user', role, brokerApproved: true },
  loading: false,
  logout: vi.fn(),
});
function Shell({ auth, path = '/properties' }) {
  return (
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<SessionLayout />}>
            {[
              '/',
              '/properties',
              '/properties/one',
              '/forbidden',
              '/missing',
            ].map((route) => (
              <Route
                key={route}
                path={route}
                element={
                  <>
                    <h1>Page {route}</h1>
                    <Link to="/properties/one">View property</Link>
                  </>
                }
              />
            ))}
            <Route element={<ProtectedRoute />}>
              {roles.map((role) => (
                <Route
                  key={role}
                  path={`/${role.toLowerCase()}`}
                  element={<h1>{role} dashboard</h1>}
                />
              ))}
              <Route path="/profile" element={<h1>Profile page</h1>} />
              <Route
                path="/notifications"
                element={<h1>Notifications page</h1>}
              />
              <Route element={<RoleRoute role="ADMIN" />}>
                <Route
                  path="/admin/private"
                  element={<h1>Admin private content</h1>}
                />
              </Route>
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('session-aware workspace layout', () => {
  it.each(roles)(
    '%s retains the same sidebar and header while exploring properties and details',
    async (role) => {
      const auth = authFor(role);
      render(<Shell auth={auth} path={`/${role.toLowerCase()}`} />);
      const sidebar = screen.getByRole('complementary');
      const header = document.querySelector('.topbar');
      const user = userEvent.setup();
      await user.click(
        screen.getByRole('link', { name: 'Explore marketplace' })
      );
      expect(
        screen.getByRole('heading', { name: 'Page /properties' })
      ).toBeInTheDocument();
      expect(screen.getByRole('complementary')).toBe(sidebar);
      expect(document.querySelector('.topbar')).toBe(header);
      expect(
        screen.getByRole('link', { name: 'Explore marketplace' })
      ).toHaveAttribute('aria-current', 'page');
      await user.click(screen.getByRole('link', { name: 'View property' }));
      expect(
        screen.getByRole('heading', { name: 'Page /properties/one' })
      ).toBeInTheDocument();
      expect(screen.getByRole('complementary')).toBe(sidebar);
      expect(document.querySelector('.topbar')).toBe(header);
      expect(
        screen.queryByRole('navigation', { name: 'Main navigation' })
      ).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /ESTORA/ })).toHaveAttribute(
        'href',
        `/${role.toLowerCase()}`
      );
    }
  );
  it.each(roles)(
    '%s gets its own workspace on a direct property-detail visit',
    (role) => {
      render(<Shell auth={authFor(role)} path="/properties/one" />);
      const caption = role[0] + role.slice(1).toLowerCase();
      expect(
        screen.getByRole('navigation', { name: `${caption} navigation` })
      ).toBeInTheDocument();
      expect(document.querySelector('.topbar')).toHaveTextContent(
        'Signed in user'
      );
      expect(
        screen.queryByRole('navigation', { name: 'Main navigation' })
      ).not.toBeInTheDocument();
    }
  );
  it('visitors retain public navigation and no workspace', () => {
    render(<Shell auth={{ token: null, user: null }} />);
    expect(
      screen.getByRole('navigation', { name: 'Main navigation' })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'Log in', exact: true }).length
    ).toBeGreaterThan(0);
    expect(document.querySelector('.dashboard-shell')).toBeNull();
  });
  it('restoring a session shows loading without flashing visitor navigation', () => {
    const view = render(
      <Shell
        auth={{ token: 'saved-token', user: null, loading: true }}
        path="/properties/one"
      />
    );
    expect(
      screen.getByRole('status', { name: 'Loading profile' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Main navigation' })
    ).not.toBeInTheDocument();
    view.rerender(<Shell auth={authFor('ADMIN')} path="/properties/one" />);
    expect(
      screen.getByRole('navigation', { name: 'Admin navigation' })
    ).toBeInTheDocument();
  });
  it('a failed session restore offers retry without visitor navigation', async () => {
    const refresh = vi.fn();
    render(
      <Shell
        auth={{
          token: 'saved-token',
          user: null,
          loading: false,
          error: 'Offline',
          refresh,
        }}
      />
    );
    expect(
      screen.queryByRole('navigation', { name: 'Main navigation' })
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalledOnce();
  });
  it('wrong-role pages retain the investor workspace while denying admin access', () => {
    render(<Shell auth={authFor('INVESTOR')} path="/admin/private" />);
    expect(
      screen.getByRole('heading', { name: 'Page /forbidden' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Investor navigation' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Admin private content')).not.toBeInTheDocument();
  });
  it('ending a session switches marketplace navigation back to the public layout', () => {
    const view = render(<Shell auth={authFor('BROKER')} />);
    expect(
      screen.getByRole('navigation', { name: 'Broker navigation' })
    ).toBeInTheDocument();
    view.rerender(<Shell auth={{ token: null, user: null }} />);
    expect(
      screen.getByRole('navigation', { name: 'Main navigation' })
    ).toBeInTheDocument();
    expect(document.querySelector('.dashboard-shell')).toBeNull();
  });
  it('mobile marketplace navigation closes the drawer when the route changes', async () => {
    window.matchMedia.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    render(<Shell auth={authFor('ADMIN')} path="/admin" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(
      screen.getByRole('button', { name: 'Open navigation' })
    ).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('link', { name: 'Explore marketplace' }));
    expect(
      screen.getByRole('button', { name: 'Open navigation' })
    ).toHaveAttribute('aria-expanded', 'false');
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(
      screen.getByRole('heading', { name: 'Page /properties' })
    ).toBeInTheDocument();
  });
});
