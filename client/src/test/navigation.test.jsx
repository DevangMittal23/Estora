import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { PageBack } from '../components/PageBack';

function NavigationPage() {
  const location = useLocation();
  return (
    <>
      <PageBack />
      <p data-testid="location">
        {location.pathname}
        {location.search}
      </p>
      <Link to="/properties/one">Open property</Link>
    </>
  );
}

function renderNavigation(user = null) {
  return render(
    <AuthContext.Provider value={{ user }}>
      <BrowserRouter>
        <NavigationPage />
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

function enter(path, index = 0, key = 'direct') {
  window.history.replaceState({ idx: index, key }, '', path);
}

beforeEach(() => {
  enter('/properties');
});

describe('page Back navigation', () => {
  it.each([
    '/',
    '/investor',
    '/investor/',
    '/broker',
    '/broker/',
    '/admin',
    '/admin/',
  ])('omits Back on homepage %s, including with query parameters', (path) => {
    enter(`${path}?view=overview`);
    renderNavigation();
    expect(
      screen.queryByRole('button', { name: 'Back' })
    ).not.toBeInTheDocument();
  });

  it('returns a signed-out direct visitor to the landing page', async () => {
    renderNavigation();
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });

  it.each(['INVESTOR', 'BROKER', 'ADMIN'])(
    'returns a directly opened shared page to the %s homepage',
    async (role) => {
      enter('/profile');
      renderNavigation({ role });
      await userEvent.click(screen.getByRole('button', { name: 'Back' }));
      expect(screen.getByTestId('location')).toHaveTextContent(
        `/${role.toLowerCase()}`
      );
    }
  );

  it('returns to a verified in-app entry and preserves its filters', async () => {
    enter('/properties?city=Pune');
    renderNavigation();
    await userEvent.click(screen.getByRole('link', { name: 'Open property' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/properties/one');
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/properties?city=Pune'
      )
    );
  });

  it('ignores pre-existing browser history when the router initializes a direct visit', async () => {
    window.history.pushState(null, '', '/unrelated-page');
    window.history.pushState(null, '', '/login');
    expect(window.history.length).toBeGreaterThan(1);
    renderNavigation();
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });

  it('retains verified in-app history after the router remounts', async () => {
    enter('/properties?city=Delhi');
    const view = renderNavigation();
    await userEvent.click(screen.getByRole('link', { name: 'Open property' }));
    view.unmount();
    renderNavigation();
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/properties?city=Delhi'
      )
    );
  });
});
