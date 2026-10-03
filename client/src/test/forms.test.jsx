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
  const mediaDraft = {
    ...property,
    status: 'DRAFT',
    savedStep: 3,
    images: [{ url: '/image-1.jpg', name: 'Saved image' }],
    documents: [
      { url: '/document-1.jpg', name: 'Supporting one.jpg' },
      { url: '/document-2.jpg', name: 'Supporting two.jpg' },
    ],
  };
  const image = (name) => new File(['image'], name, { type: 'image/jpeg' });
  it('Save draft adds selected photos to the saved property gallery and Continue advances without another upload', async () => {
    const uploaded = {
      ...mediaDraft,
      images: [
        ...mediaDraft.images,
        { url: '/photo-2.jpg', name: 'second.jpg' },
        { url: '/photo-3.jpg', name: 'third.jpg' },
      ],
    };
    let saved = false;
    send.mockImplementation(async (method, path) => {
      if (path.endsWith('/media')) saved = true;
      return { property: saved ? uploaded : mediaDraft };
    });
    const user = userEvent.setup();
    wrap(<WizardForm initial={mediaDraft} storageKey="test-draft" />);
    expect(
      screen.getByText('Property images — minimum 3 required')
    ).toBeInTheDocument();
    await user.upload(screen.getByLabelText('Property images'), [
      image('second.jpg'),
      image('third.jpg'),
    ]);
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await screen.findByRole('heading', { name: 'Saved property images (3)' });
    const gallery = screen.getByLabelText('Saved property images');
    expect(within(gallery).getAllByRole('img')).toHaveLength(3);
    expect(within(gallery).getByText('second.jpg')).toBeInTheDocument();
    expect(screen.getByLabelText('Property images')).toBeInTheDocument();
    const media = send.mock.calls.find(([, path]) =>
      path.endsWith('/media')
    )[2];
    expect(media.getAll('images')).toHaveLength(2);
    expect(media.getAll('documents')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Save & continue →' }));
    await screen.findByText('Ready for a considered review.');
    expect(
      send.mock.calls.filter(([, path]) => path.endsWith('/media'))
    ).toHaveLength(1);
  });
  it('moves saved supporting photos into the property gallery without reupload and clears obsolete missing-image errors', async () => {
    const doc = {
      publicId: '123456789012345678901234',
      url: '/misplaced.jpg',
      name: 'misplaced.jpg',
    };
    const initial = {
      ...mediaDraft,
      documents: [doc],
      images: [mediaDraft.images[0], { url: '/image-2.jpg' }],
    };
    const moved = {
      ...initial,
      images: [...initial.images, doc],
      documents: [],
    };
    send.mockImplementation(async (method, path) => ({
      property: path.endsWith('/move-to-images') ? moved : initial,
    }));
    const user = userEvent.setup();
    wrap(<WizardForm initial={initial} storageKey="test-draft" />);
    await user.click(screen.getByRole('button', { name: 'Save & continue →' }));
    await screen.findByRole('alert');
    await user.click(
      screen.getByRole('button', {
        name: 'Move misplaced.jpg to property images',
      })
    );
    await screen.findByRole('heading', { name: 'Saved property images (3)' });
    expect(
      within(screen.getByLabelText('Saved property images')).getByRole('img', {
        name: 'misplaced.jpg',
      })
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Move misplaced/ })
    ).not.toBeInTheDocument();
    expect(send).toHaveBeenLastCalledWith(
      'post',
      '/properties/property-1/media/move-to-images',
      { mediaId: doc.publicId }
    );
    expect(send.mock.calls.some(([, path]) => path.endsWith('/media'))).toBe(
      false
    );
  });
  it('accumulates image selections, allows removal, and saves all images before review', async () => {
    const uploaded = {
      ...mediaDraft,
      images: [
        ...mediaDraft.images,
        { url: '/image-2.jpg' },
        { url: '/image-3.jpg' },
      ],
    };
    send.mockImplementation(async (method, path, body) => ({
      property:
        path.endsWith('/media') || body.savedStep === 4 ? uploaded : mediaDraft,
    }));
    const user = userEvent.setup();
    wrap(<WizardForm initial={mediaDraft} storageKey="test-draft" />);
    const input = screen.getByLabelText('Property images');
    const second = image('second.jpg'),
      third = image('third.jpg');
    await user.upload(input, second);
    await user.upload(input, third);
    await user.upload(input, second);
    expect(screen.getByText('1 saved · 2 selected')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Remove image third.jpg' })
    );
    expect(screen.getByText('1 saved · 1 selected')).toBeInTheDocument();
    await user.upload(input, third);
    await user.click(screen.getByRole('button', { name: 'Save & continue →' }));
    expect(
      await screen.findByText('Ready for a considered review.')
    ).toBeInTheDocument();
    const upload = send.mock.calls.find(([, path]) => path.endsWith('/media'));
    expect(upload[2].getAll('images').map((file) => file.name)).toEqual([
      'second.jpg',
      'third.jpg',
    ]);
    expect(send.mock.calls[0][2]).toEqual({ savedStep: 3 });
    expect(send.mock.calls[2][2]).toEqual({ savedStep: 4 });
    expect(
      screen.getByRole('button', { name: 'Submit for approval' })
    ).toBeEnabled();
    expect(send.mock.calls.some(([, path]) => path.endsWith('/submit'))).toBe(
      false
    );
  });
  it('saves an incomplete draft on Media and explains why documents do not count', async () => {
    send.mockResolvedValue({ property: mediaDraft });
    const user = userEvent.setup();
    wrap(<WizardForm initial={mediaDraft} storageKey="test-draft" />);
    await user.click(screen.getByRole('button', { name: 'Save & continue →' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Draft saved. Add 2 more property images'
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Supporting documents do not count.'
    );
    expect(screen.getByLabelText('Property images')).toBeInTheDocument();
    expect(send).toHaveBeenCalledExactlyOnceWith(
      'patch',
      '/properties/property-1',
      { savedStep: 3 }
    );
  });
  it('preserves selected files and the Media resume step when uploading fails', async () => {
    send.mockImplementation(async (method, path) => {
      if (path.endsWith('/media'))
        throw new Error('Upload temporarily unavailable');
      return { property: mediaDraft };
    });
    const user = userEvent.setup();
    wrap(<WizardForm initial={mediaDraft} storageKey="test-draft" />);
    await user.upload(screen.getByLabelText('Property images'), [
      image('second.jpg'),
      image('third.jpg'),
    ]);
    await user.click(screen.getByRole('button', { name: 'Save & continue →' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Upload temporarily unavailable'
    );
    expect(screen.getByText('1 saved · 2 selected')).toBeInTheDocument();
    expect(
      send.mock.calls
        .filter(([method]) => method === 'patch')
        .map(([, , body]) => body.savedStep)
    ).toEqual([3]);
  });
  it('does not upload saved images twice when saving the Review resume point fails', async () => {
    const uploaded = {
      ...mediaDraft,
      images: [1, 2, 3].map((i) => ({ url: `/image-${i}.jpg` })),
    };
    let mediaSaved = false,
      failReview = true;
    send.mockImplementation(async (method, path, body) => {
      if (path.endsWith('/media')) mediaSaved = true;
      if (body.savedStep === 4 && failReview) {
        failReview = false;
        throw new Error('Save interrupted');
      }
      return { property: mediaSaved ? uploaded : mediaDraft };
    });
    const user = userEvent.setup();
    wrap(<WizardForm initial={mediaDraft} storageKey="test-draft" />);
    await user.upload(screen.getByLabelText('Property images'), [
      image('second.jpg'),
      image('third.jpg'),
    ]);
    await user.click(screen.getByRole('button', { name: 'Save & continue →' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Save interrupted'
    );
    expect(screen.getByText('3 saved · 0 selected')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save & continue →' }));
    await screen.findByText('Ready for a considered review.');
    expect(
      send.mock.calls.filter(([, path]) => path.endsWith('/media'))
    ).toHaveLength(1);
  });
  it('shows submission failures and preserves the draft for an explicit retry', async () => {
    const initial = {
      ...mediaDraft,
      savedStep: 4,
      images: [1, 2, 3].map((i) => ({ url: `/image-${i}.jpg` })),
    };
    localStorage.setItem('test-draft', initial._id);
    send
      .mockRejectedValueOnce(new Error('Review service unavailable'))
      .mockResolvedValueOnce({
        property: { ...initial, status: 'PENDING_APPROVAL' },
      });
    const user = userEvent.setup();
    wrap(<WizardForm initial={initial} storageKey="test-draft" />);
    await user.click(
      screen.getByRole('button', { name: 'Submit for approval' })
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Review service unavailable'
    );
    expect(localStorage.getItem('test-draft')).toBe(initial._id);
    await user.click(
      screen.getByRole('button', { name: 'Submit for approval' })
    );
    await vi.waitFor(() =>
      expect(localStorage.getItem('test-draft')).toBeNull()
    );
    expect(send.mock.calls.map(([, path]) => path)).toEqual([
      '/properties/property-1/submit',
      '/properties/property-1/submit',
    ]);
  });
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
    expect(withdrawalAmountSchema(10_000).safeParse('100.01').success).toBe(
      false
    );
    expect(withdrawalAmountSchema(10_000).safeParse('100.00').success).toBe(
      true
    );
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
    expect(
      sessionStorage.getItem('estora-invest:user:property-1:1')
    ).toBeNull();
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
