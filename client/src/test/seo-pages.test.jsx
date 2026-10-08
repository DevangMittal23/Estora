import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import {
  CalculatorPage,
  CityInvestmentPage,
  Insights,
  InsightArticle,
  FractionalGuide,
} from '../pages/public/SeoPages';
import { useData } from '../api';
import { trackSeoEvent } from '../analytics';
import { articles } from '../seo/articles';

vi.mock('../api', async (original) => ({
  ...(await original()),
  useData: vi.fn(),
}));
vi.mock('../analytics', async (original) => ({
  ...(await original()),
  trackSeoEvent: vi.fn(),
}));

function page(element, path, route = path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={element} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useData.mockReturnValue({
    data: { items: [], total: 0, totalPages: 1 },
    isPending: false,
    isError: false,
  });
});

describe('public calculator interactions', () => {
  it('starts blank, validates missing inputs, computes a loss and tracks only calculator identity', async () => {
    const user = userEvent.setup();
    page(<CalculatorPage />, '/calculators/real-estate-roi');
    const initial = screen.getByLabelText('Initial investment (₹)');
    expect(initial).toHaveValue('');
    expect(screen.queryByText('Your results')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Calculate ROI/ }));
    expect(initial).toHaveAttribute('aria-invalid', 'true');
    expect(trackSeoEvent).not.toHaveBeenCalled();
    await user.type(initial, '100000');
    await user.type(screen.getByLabelText('Sale value / proceeds (₹)'), '0');
    await user.type(screen.getByLabelText('Holding period (years)'), '2');
    await user.click(screen.getByRole('button', { name: /Calculate ROI/ }));
    expect(screen.getByText('Your results')).toBeInTheDocument();
    expect(screen.getAllByText('-100%')).toHaveLength(2);
    expect(trackSeoEvent).toHaveBeenCalledExactlyOnceWith('calculator_used', {
      calculator: 'real-estate-roi',
    });
    expect(useData).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('Total expenses (₹)'), '10');
    expect(screen.queryByText('Your results')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(initial).toHaveValue('');
  });
  it('switches rent periods without double counting and resets the scenario', async () => {
    const user = userEvent.setup();
    page(<CalculatorPage />, '/calculators/rental-yield');
    await user.type(screen.getByLabelText('Property value (₹)'), '1000000');
    await user.type(screen.getByLabelText('Monthly rental income (₹)'), '5000');
    await user.type(screen.getByLabelText('Annual expenses (₹)'), '80000');
    await user.click(screen.getByRole('button', { name: /Calculate yield/ }));
    expect(screen.getByText('-2%')).toBeInTheDocument();
    expect(trackSeoEvent).toHaveBeenCalledWith('calculator_used', {
      calculator: 'rental-yield',
    });
    await user.selectOptions(screen.getByLabelText('Rent period'), 'annual');
    expect(screen.queryByText('Your results')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Annual rental income (₹)')).toHaveValue(
      '5000'
    );
    await user.click(screen.getByRole('button', { name: /Calculate yield/ }));
    expect(screen.getByText('0.5%')).toBeInTheDocument();
  });
  it('gives unknown calculators one not-found heading', () => {
    page(<CalculatorPage />, '/calculators/unknown', '/calculators/:type');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Calculator not found'
    );
    expect(
      screen.queryByRole('button', { name: /Calculate/ })
    ).not.toBeInTheDocument();
  });
});

describe('published education and city pages', () => {
  it('does not expose unpublished articles in either hub or detail', () => {
    const draft = {
      ...articles[0],
      slug: 'private-draft',
      title: 'Unpublished title',
      published: false,
    };
    articles.push(draft);
    try {
      page(<Insights />, '/insights');
      expect(screen.queryByText('Unpublished title')).not.toBeInTheDocument();
      cleanup();
      page(<InsightArticle />, '/insights/private-draft', '/insights/:slug');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Article not found'
      );
    } finally {
      articles.pop();
    }
  });
  it('renders full dated article content and related reading', () => {
    page(
      <InsightArticle />,
      `/insights/${articles[0].slug}`,
      '/insights/:slug'
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      articles[0].title
    );
    expect(screen.getByText(/By Estora/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Distinguish evidence from estimates',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: /Understanding real estate ROI assumptions/,
      })
    ).toBeInTheDocument();
  });
  it('keeps the city useful when no published properties match and uses the public projection', () => {
    page(<CityInvestmentPage />, '/real-estate-investment-in-lucknow');
    expect(useData).toHaveBeenCalledWith('/seo/properties', {
      city: 'Lucknow',
      page: 1,
      limit: 9,
    });
    expect(
      screen.getByText('No published opportunities in Lucknow yet')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Lucknow Development Authority/ })
    ).toHaveAttribute('href', 'https://www.ldaonline.co.in/');
    expect(
      screen.getByRole('heading', { name: 'Look beyond the city label.' })
    ).toBeInTheDocument();
  });
  it('renders a load failure with retry and preserves the guide', async () => {
    const retry = vi.fn();
    useData.mockReturnValue({
      isError: true,
      isPending: false,
      error: new Error('Temporarily unavailable'),
      refetch: retry,
    });
    page(<CityInvestmentPage />, '/real-estate-investment-in-lucknow');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Temporarily unavailable'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('heading', { name: 'Check the records that matter.' })
    ).toBeInTheDocument();
  });
  it('does not query unknown cities', () => {
    page(<CityInvestmentPage />, '/real-estate-investment-in-unknown');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'City guide not found'
    );
    expect(useData).not.toHaveBeenCalled();
  });
  it('shows public listing data and requests the next city page', async () => {
    useData.mockReturnValue({
      data: {
        items: [
          {
            _id: '507f1f77bcf86cd799439011',
            title: 'Published test listing',
            city: 'Lucknow',
            type: 'RESIDENTIAL',
            status: 'LIVE',
            images: [],
            unitPrice: 1000000,
            minUnits: 2,
            totalUnits: 1000,
            unitsSold: 250,
            areaSqft: 2500,
            holdingPeriodMonths: 24,
            expectedAppreciationPct: 5,
          },
        ],
        total: 10,
        totalPages: 2,
      },
      isPending: false,
      isError: false,
    });
    page(<CityInvestmentPage />, '/real-estate-investment-in-lucknow');
    expect(
      screen.getByRole('heading', { name: 'Published test listing' })
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '25'
    );
    expect(screen.getByText('₹20,000.00')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(useData).toHaveBeenLastCalledWith('/seo/properties', {
      city: 'Lucknow',
      page: 2,
      limit: 9,
    });
  });
  it('shows a loading state while keeping the city guide visible', () => {
    useData.mockReturnValue({ isPending: true, isError: false });
    page(<CityInvestmentPage />, '/real-estate-investment-in-lucknow');
    expect(
      screen.getByRole('status', { name: 'Loading content' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Look beyond the city label.' })
    ).toBeInTheDocument();
  });
  it('contains the proportional example and explicit rental and exit boundaries', () => {
    page(<FractionalGuide />, '/fractional-real-estate');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'What is fractional real estate investment?'
    );
    expect(
      screen.getByText('20 units = 2% of the total units.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('ESTORA does not distribute rental income.')
    ).toBeInTheDocument();
    const guide = screen
      .getByRole('heading', { name: 'In this guide' })
      .closest('aside');
    expect(within(guide).getAllByRole('link')).toHaveLength(12);
  });
});
