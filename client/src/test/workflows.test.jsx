import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import { AuthPage } from '../pages/public/Auth';
import { Enquiries } from '../pages/shared/Shared';
import { Wallet } from '../pages/investor/Wallet';
import { MediaLink, Modal } from '../components/ui';
import { RouteScroll } from '../components/RouteScroll';
import { useData, send } from '../api';

vi.mock('../api', async (original) => ({
  ...(await original()),
  useData: vi.fn(),
  send: vi.fn(),
}));
const query = (data) => ({ data, isPending: false, isError: false });
function Providers({ children, initialEntries = ['/'] }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <AuthContext.Provider
        value={{ user: { _id: 'investor', role: 'INVESTOR' }, login: vi.fn() }}
      >
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
beforeEach(() => vi.clearAllMocks());

describe('navigation and history regressions', () => {
  it('starts new pages at the top and scrolls section links to their target', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const scrollIntoView = vi.fn();
    render(
      <Providers>
        <RouteScroll />
        <Link to="/properties">Marketplace</Link>
        <Link to="/#how-it-works">How it works</Link>
        <Routes>
          <Route
            path="/"
            element={
              <section
                id="how-it-works"
                ref={(node) => {
                  if (node) node.scrollIntoView = scrollIntoView;
                }}
              >
                Ownership steps
              </section>
            }
          />
          <Route path="/properties" element={<h1>Property marketplace</h1>} />
        </Routes>
      </Providers>
    );
    await userEvent.click(screen.getByRole('link', { name: 'Marketplace' }));
    expect(scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
    await userEvent.click(screen.getByRole('link', { name: 'How it works' }));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    scrollTo.mockRestore();
  });
  it('restores the login form after completing password recovery', async () => {
    send.mockResolvedValue({});
    render(
      <Providers initialEntries={['/forgot-password']}>
        <Routes>
          <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
          <Route path="/login" element={<AuthPage />} />
        </Routes>
      </Providers>
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Email address' }),
      'investor@example.com'
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Send reset link' })
    );
    await screen.findByText('Check your inbox');
    await userEvent.click(screen.getByRole('link', { name: 'Back to login' }));
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email address' })).toHaveValue(
      ''
    );
    expect(screen.queryByText('Check your inbox')).not.toBeInTheDocument();
  });
  it('keeps broker entry links on the broker signup option', () => {
    render(
      <Providers initialEntries={['/signup?role=broker']}>
        <AuthPage mode="signup" />
      </Providers>
    );
    expect(screen.getByRole('radio', { name: 'I’m a broker' })).toBeChecked();
  });
  it('requests older enquiries and resets to page one for a different property', async () => {
    useData.mockImplementation((_path, params) =>
      query({ items: [], page: params.page, total: 25, totalPages: 3 })
    );
    const { rerender } = render(
      <Providers>
        <Enquiries propertyId="property-a" />
      </Providers>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(useData).toHaveBeenLastCalledWith('/enquiries', {
      page: 2,
      limit: 10,
      propertyId: 'property-a',
    });
    rerender(
      <Providers>
        <Enquiries propertyId="property-b" />
      </Providers>
    );
    expect(useData).toHaveBeenLastCalledWith('/enquiries', {
      page: 1,
      limit: 10,
      propertyId: 'property-b',
    });
  });
  it('lets investors read older withdrawal requests independently of the ledger', async () => {
    useData.mockImplementation((path, params) =>
      path === '/wallet'
        ? query({ walletBalance: 10000 })
        : query({ items: [], page: params.page, total: 21, totalPages: 3 })
    );
    render(
      <Providers>
        <Wallet />
      </Providers>
    );
    const section = screen
      .getByRole('heading', { name: 'Withdrawal requests' })
      .closest('section');
    await userEvent.click(
      within(section).getByRole('button', { name: 'Next' })
    );
    expect(useData).toHaveBeenCalledWith('/wallet/withdrawals', {
      page: 2,
      limit: 10,
    });
    expect(useData).toHaveBeenCalledWith('/transactions', {
      page: 1,
      limit: 15,
    });
  });
  it('serves bundled document links from the frontend origin', () => {
    render(
      <MediaLink
        media={{
          url: '/assets/property-brochure.pdf',
          name: 'Property brochure',
        }}
      />
    );
    expect(
      screen.getByRole('link', { name: 'Property brochure' })
    ).toHaveAttribute('href', '/assets/property-brochure.pdf');
  });
  it('contains keyboard focus when a dialog opens and includes select controls', async () => {
    render(
      <Modal title="Choose status" onClose={vi.fn()}>
        <select aria-label="Status">
          <option>Live</option>
        </select>
        <button disabled>Unavailable</button>
      </Modal>
    );
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Go back' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Go back' })).toHaveFocus();
  });
});
