import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CheckoutForm } from '../pages/investor/Checkout';
import { SaleForm } from '../pages/admin/Sale';
import {
  Button,
  Field,
  QueryState,
  Progress,
  Kpis,
  PropertyImage,
} from '../components/ui';
import { signupSchema } from '../pages/public/Auth';
import { financialSchema, WizardForm } from '../pages/broker/Wizard';
import { validateFiles } from '../pages/investor/KYC';
import { withdrawalAmountSchema } from '../pages/investor/Wallet';
import { money, toPaise, investmentKey } from '../utils';
import { send, get, api } from '../api';
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal()),
  send: vi.fn(),
  get: vi.fn(),
}));
const property = {
  _id: 'property-1',
  title: 'Test Property',
  city: 'Mumbai',
  status: 'LIVE',
  unitPrice: 1000000,
  totalUnits: 1000,
  unitsSold: 200,
  minUnits: 1,
  maxUnitsPerInvestor: 490,
  maxOwnershipPct: 49,
  expectedAppreciationPct: 10,
  holdingPeriodMonths: 24,
  fundingPct: 20,
  images: [],
};
function wrap(component) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{component}</MemoryRouter>
    </QueryClientProvider>
  );
}
beforeEach(() => vi.clearAllMocks());
describe('property asset resolution', () => {
  it('loads all seeded public asset paths from the frontend without an API request', () => {
    const request = vi.spyOn(api, 'get');
    const { rerender } = render(
      <PropertyImage
        media={{ url: '/assets/property-1.svg' }}
        alt="Property illustration"
      />
    );
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      '/assets/property-1.svg'
    );
    for (const number of [2, 3]) {
      rerender(
        <PropertyImage
          media={{ url: `/assets/property-${number}.svg` }}
          alt="Property illustration"
        />
      );
      expect(screen.getByRole('img')).toHaveAttribute(
        'src',
        `/assets/property-${number}.svg`
      );
    }
    expect(request).not.toHaveBeenCalled();
    request.mockRestore();
  });
  it('fetches private media through the authenticated API and releases its blob on unmount', async () => {
    const createObjectURL = vi.fn(() => 'blob:private-preview'),
      revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const request = vi
      .spyOn(api, 'get')
      .mockResolvedValue({ data: new Blob(['image'], { type: 'image/png' }) });
    const { unmount } = render(
      <PropertyImage
        media={{ url: '/api/v1/media/private-id' }}
        alt="Private property illustration"
      />
    );
    expect(request).toHaveBeenCalledWith('/media/private-id', {
      responseType: 'blob',
    });
    await vi.waitFor(() =>
      expect(screen.getByRole('img')).toHaveAttribute(
        'src',
        'blob:private-preview'
      )
    );
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:private-preview');
    request.mockRestore();
    vi.unstubAllGlobals();
  });
});
describe('saved listing wizard', () => {
  it('preserves financial input when navigating back and saving the location step', async () => {
    const initial = {
      ...property,
      status: 'DRAFT',
      savedStep: 2,
      address: 'Test Road',
      state: 'Maharashtra',
      pincode: '400001',
      areaSqft: 1500,
      description: 'A detailed description of this test property.',
      valuation: 1000000000,
      geo: { lat: 19, lng: 72 },
    };
    send.mockResolvedValue({ property: initial });
    const user = userEvent.setup();
    wrap(<WizardForm initial={initial} storageKey="test-draft" />);
    const units = screen.getByLabelText('Total units');
    await user.clear(units);
    await user.type(units, '2000');
    await user.click(screen.getByRole('button', { name: 'Previous step' }));
    expect(screen.getByLabelText('City')).toHaveValue('Mumbai');
    await user.click(screen.getByRole('button', { name: 'Save & continue →' }));
    expect(await screen.findByLabelText('Total units')).toHaveValue(2000);
    expect(send.mock.calls[0][0]).toBe('patch');
    expect(send.mock.calls[0][1]).toBe('/properties/property-1');
    expect(send.mock.calls[0][2]).toMatchObject({
      city: 'Mumbai',
      savedStep: 2,
    });
  });
  it('blocks review submission when fewer than three images are saved', () => {
    wrap(
      <WizardForm
        initial={{
          ...property,
          status: 'DRAFT',
          savedStep: 4,
          images: [{ url: '/image-1.jpg' }, { url: '/image-2.jpg' }],
        }}
        storageKey="test-draft"
      />
    );
    expect(
      screen.getByRole('button', { name: 'Submit for approval' })
    ).toBeDisabled();
  });
  it('styles a realised loss with the danger color', () => {
    render(<Kpis items={[['Realised ROI', '-12.00%']]} />);
    expect(screen.getByText('-12.00%')).toHaveClass('danger');
  });
});
describe('financial and identity input handling', () => {
  it('converts decimal rupees exactly and refuses invalid precision', () => {
    expect(toPaise('100.01')).toBe(10001);
    expect(toPaise('0.29')).toBe(29);
    expect(() => toPaise('1.001')).toThrow();
    expect(() => toPaise('-1')).toThrow();
    expect(money(100)).toBe('₹1.00');
  });
  it('cannot register an administrator or a weak-password user', () => {
    const user = {
      name: 'Investor',
      email: 'test@example.com',
      phone: '9876543210',
      password: 'Strong@123',
      role: 'INVESTOR',
    };
    expect(signupSchema.safeParse(user).success).toBe(true);
    expect(signupSchema.safeParse({ ...user, role: 'ADMIN' }).success).toBe(
      false
    );
    expect(
      signupSchema.safeParse({ ...user, password: 'password' }).success
    ).toBe(false);
  });
  it('blocks fractional paise unit pricing and incompatible unit limits', () => {
    const form = {
      valuation: '1000',
      totalUnits: 100,
      minUnits: 1,
      maxUnitsPerInvestor: 49,
      expectedAppreciationPct: 10,
      rentalYieldPct: 3,
      holdingPeriodMonths: 24,
    };
    expect(financialSchema.safeParse(form).success).toBe(true);
    expect(financialSchema.safeParse({ ...form, totalUnits: 3 }).success).toBe(
      false
    );
    expect(financialSchema.safeParse({ ...form, minUnits: 101 }).success).toBe(
      false
    );
    expect(financialSchema.safeParse({ ...form, valuation: '' }).success).toBe(
      false
    );
  });
  it('refuses missing, oversized and unsupported KYC uploads', () => {
    expect(validateFiles([])).not.toBe(true);
    expect(
      validateFiles([new File(['a'], 'a.pdf', { type: 'application/pdf' })])
    ).toBe(true);
    expect(
      validateFiles([{ type: 'application/pdf', size: 6 * 1024 * 1024 }])
    ).not.toBe(true);
    expect(validateFiles([{ type: 'text/plain', size: 1 }])).not.toBe(true);
  });
  it('prevents a withdrawal request that exceeds the displayed balance', () => {
    expect(withdrawalAmountSchema(10_000).safeParse('100.01').success).toBe(false);
    expect(withdrawalAmountSchema(10_000).safeParse('100.00').success).toBe(true);
    expect(withdrawalAmountSchema(0).safeParse('1').success).toBe(false);
  });
  it('keeps the same investment reference through retries and reloads', () => {
    const first = investmentKey('user', 'property', 5);
    expect(investmentKey('user', 'property', 5).key).toBe(first.key);
    expect(investmentKey('user', 'property', 6).key).not.toBe(first.key);
  });
  it('keeps pending buttons disabled even when disabled=false is supplied', () => {
    render(
      <Button loading disabled={false}>
        Confirm
      </Button>
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });
  it('forwards input refs and exposes inline errors', () => {
    const ref = React.createRef();
    render(<Field ref={ref} label="Name" error="Name required" />);
    expect(ref.current).toBe(screen.getByLabelText('Name'));
    expect(screen.getByRole('alert')).toHaveTextContent('Name required');
  });
});
describe('checkout safety and retry behavior', () => {
  it('disables checkout and shows the precise wallet shortfall', () => {
    wrap(
      <CheckoutForm
        property={property}
        wallet={{ walletBalance: 100 }}
        user={{ _id: 'user' }}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Review investment' })
    ).toBeDisabled();
    expect(screen.getByText(/You need ₹9,999.00 more/)).toBeInTheDocument();
  });
  it('honors the live platform ownership cap and existing holdings', () => {
    wrap(
      <CheckoutForm
        property={{ ...property, maxOwnershipPct: 20 }}
        wallet={{ walletBalance: 100000000 }}
        user={{ _id: 'user' }}
        existingUnits={195}
      />
    );
    expect(screen.getByLabelText('Units to purchase')).toHaveAttribute(
      'max',
      '5'
    );
  });
  it('requires terms and a review modal, preserves idempotency after a network error', async () => {
    send
      .mockRejectedValueOnce(new Error('Network interrupted'))
      .mockResolvedValueOnce({
        investment: { _id: 'investment' },
        walletBalance: 99000000,
      });
    const user = userEvent.setup();
    wrap(
      <CheckoutForm
        property={property}
        wallet={{ walletBalance: 100000000 }}
        user={{ _id: 'user' }}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Review investment' })
    ).toBeDisabled();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Review investment' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('1 unit')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Test Property', { exact: false })
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', { name: 'Confirm & invest' })
    );
    await screen.findByText(/Your retry uses the same investment reference/);
    const key = send.mock.calls[0][2].idempotencyKey;
    await user.click(
      within(dialog).getByRole('button', { name: 'Confirm & invest' })
    );
    await screen.findByText('You now own a share.');
    expect(screen.getByText(/1 unit in Test Property/)).toBeInTheDocument();
    expect(send.mock.calls[1][2].idempotencyKey).toBe(key);
    expect(send.mock.calls[1][2]).toEqual({
      propertyId: property._id,
      units: 1,
      idempotencyKey: key,
    });
    expect(localStorage.getItem('estora-invest:user:property-1:1')).toBeNull();
  });
});
describe('sale distribution review', () => {
  it('blocks execution until a checked preview exists, and invalidates preview when price changes', async () => {
    get.mockResolvedValue({
      salePrice: 10000000,
      platformFee: 200000,
      distributable: 9800000,
      check: true,
      items: [
        {
          investorId: 'u1',
          investorName: 'Investor',
          units: 1000,
          ownershipPct: 100,
          payoutAmount: 9800000,
        },
      ],
    });
    const user = userEvent.setup();
    wrap(<SaleForm property={{ ...property, status: 'HOLDING' }} />);
    expect(
      screen.getByRole('button', { name: 'Preview distribution' })
    ).toBeDisabled();
    await user.type(screen.getByLabelText('Actual sale price (₹)'), '100000');
    await user.click(
      screen.getByRole('button', { name: 'Preview distribution' })
    );
    await screen.findByText(
      'Distribution verified: all investor payouts equal the distributable amount exactly.'
    );
    expect(
      screen.getByRole('button', { name: 'Confirm & execute payout' })
    ).toBeEnabled();
    await user.type(screen.getByLabelText('Actual sale price (₹)'), '1');
    expect(
      screen.getByRole('button', { name: 'Confirm & execute payout' })
    ).toBeDisabled();
    expect(send).not.toHaveBeenCalled();
  });
});
describe('data screen feedback', () => {
  it('renders loading, empty, error/retry and real content states', async () => {
    const retry = vi.fn();
    const { rerender } = render(<QueryState query={{ isPending: true }} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(
      <QueryState
        query={{ isError: true, error: new Error('Offline'), refetch: retry }}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Offline');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
    rerender(<QueryState query={{ data: [] }} empty />);
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    rerender(
      <QueryState query={{ data: { title: 'API value' } }}>
        {(data) => <p>{data.title}</p>}
      </QueryState>
    );
    expect(screen.getByText('API value')).toBeInTheDocument();
  });
  it('communicates funding as an accessible percentage', () => {
    render(<Progress value={75} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '75'
    );
  });
});
