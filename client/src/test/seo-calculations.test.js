import { describe, expect, it } from 'vitest';
import {
  calculateRoi,
  calculateRentalYield,
  MAX_SCENARIO_AMOUNT,
} from '../seo/calculations';

const roi = {
  initialInvestment: '100000',
  saleValue: '120000',
  rentalIncome: '',
  expenses: '',
  years: '2',
};
const yieldInput = {
  propertyValue: '1000000',
  rentalIncome: '5000',
  rentFrequency: 'monthly',
  annualExpenses: '',
};

describe('educational ROI scenarios', () => {
  it('includes extra expenses in both invested capital and gain', () => {
    const result = calculateRoi({
      ...roi,
      rentalIncome: '10000',
      expenses: '10000',
    });
    expect(result.totalInvestment).toBe(110000);
    expect(result.totalGain).toBe(20000);
    expect(result.roiPercent).toBeCloseTo(18.181818);
    expect(result.annualizedPercent).toBeCloseTo(8.711461);
  });
  it('represents a complete loss even with a fractional holding year', () => {
    expect(calculateRoi({ ...roi, saleValue: '0', years: '.5' })).toBeDefined();
  });
  it('keeps negative ROI and a zero terminal receipt visible', () => {
    expect(
      calculateRoi({ ...roi, saleValue: '0', years: '0.5' })
    ).toMatchObject({
      totalGain: -100000,
      roiPercent: -100,
      annualizedPercent: -100,
    });
    expect(
      calculateRoi({ ...roi, saleValue: '80000', years: '1' })
    ).toMatchObject({
      roiPercent: -20,
      annualizedPercent: expect.closeTo(-20),
    });
  });
  it.each([
    ['initialInvestment', '0'],
    ['initialInvestment', '-1'],
    ['saleValue', ''],
    ['saleValue', '-5'],
    ['expenses', 'Infinity'],
    ['rentalIncome', 'NaN'],
    ['initialInvestment', '1e6'],
    ['saleValue', '1,000'],
    ['expenses', '1.001'],
    ['years', '0'],
    ['years', '-1'],
    ['years', 'Infinity'],
    ['years', '1001'],
    ['saleValue', String(MAX_SCENARIO_AMOUNT + 1)],
  ])('rejects invalid %s input %s', (field, value) => {
    expect(() => calculateRoi({ ...roi, [field]: value })).toThrow(RangeError);
    try {
      calculateRoi({ ...roi, [field]: value });
    } catch (error) {
      expect(error.field).toBe(field);
    }
  });
  it('accepts paise-sized decimal amounts and trims optional blanks', () => {
    const result = calculateRoi({
      ...roi,
      initialInvestment: '0.01',
      saleValue: '0.02',
      rentalIncome: ' ',
      years: '1',
    });
    expect(result).toMatchObject({
      totalGain: 0.01,
      roiPercent: 100,
      annualizedPercent: 100,
    });
  });
  it('rejects annualized overflow instead of returning infinity', () => {
    expect(() =>
      calculateRoi({
        ...roi,
        initialInvestment: '0.01',
        saleValue: String(MAX_SCENARIO_AMOUNT),
        years: '0.000001',
      })
    ).toThrow(/supported range/);
  });
});

describe('educational rental yield scenarios', () => {
  it('makes monthly and annual input represent the same year exactly once', () => {
    const monthly = calculateRentalYield(yieldInput);
    const annual = calculateRentalYield({
      ...yieldInput,
      rentalIncome: '60000',
      rentFrequency: 'annual',
    });
    expect(monthly).toEqual(annual);
    expect(monthly).toEqual({
      annualRentalIncome: 60000,
      grossYieldPercent: 6,
      netYieldPercent: 6,
    });
  });
  it('allows expenses to exceed rent and preserves a negative net yield', () => {
    expect(
      calculateRentalYield({ ...yieldInput, annualExpenses: '80000' })
    ).toMatchObject({ grossYieldPercent: 6, netYieldPercent: -2 });
    expect(
      calculateRentalYield({
        ...yieldInput,
        rentalIncome: '0',
        annualExpenses: '10000',
      })
    ).toMatchObject({
      annualRentalIncome: 0,
      grossYieldPercent: 0,
      netYieldPercent: -1,
    });
  });
  it.each([
    ['propertyValue', 0],
    ['rentalIncome', -1],
    ['annualExpenses', NaN],
    ['rentFrequency', 'weekly'],
    ['propertyValue', Infinity],
  ])('rejects invalid %s', (field, value) => {
    expect(() =>
      calculateRentalYield({ ...yieldInput, [field]: value })
    ).toThrow(RangeError);
  });
  it('supports the documented upper monetary range with finite results', () => {
    const result = calculateRentalYield({
      ...yieldInput,
      propertyValue: String(MAX_SCENARIO_AMOUNT),
      rentalIncome: String(MAX_SCENARIO_AMOUNT),
    });
    expect(result.grossYieldPercent).toBe(1200);
    expect(Object.values(result).every(Number.isFinite)).toBe(true);
  });
});
