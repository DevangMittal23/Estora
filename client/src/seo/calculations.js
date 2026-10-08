// Educational scenarios in rupees. These values never enter the wallet ledger.
export const MAX_SCENARIO_AMOUNT = Math.floor(Number.MAX_SAFE_INTEGER / 100);

function invalid(field, message) {
  const error = new RangeError(message);
  error.field = field;
  throw error;
}

function amount(value, field, { optional = false, positive = false } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw && optional) return 0;
  if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(raw)) {
    invalid(
      field,
      'Enter an amount in rupees with at most two decimal places.'
    );
  }
  const number = Number(raw);
  if (!Number.isFinite(number) || number > MAX_SCENARIO_AMOUNT) {
    invalid(field, 'Enter a smaller finite amount.');
  }
  if (positive && number <= 0)
    invalid(field, 'Enter an amount greater than zero.');
  return number;
}

function finiteResults(result) {
  if (Object.values(result).some((value) => !Number.isFinite(value))) {
    invalid(
      'scenario',
      'These assumptions produce a result outside the supported range. Adjust the amounts or holding period.'
    );
  }
  return result;
}

export function calculateRoi({
  initialInvestment,
  saleValue,
  rentalIncome,
  expenses,
  years,
}) {
  const initial = amount(initialInvestment, 'initialInvestment', {
    positive: true,
  });
  const sale = amount(saleValue, 'saleValue');
  const rent = amount(rentalIncome, 'rentalIncome', { optional: true });
  const costs = amount(expenses, 'expenses', { optional: true });
  const rawYears = String(years ?? '').trim();
  const period = Number(rawYears);
  if (
    !/^(?:\d+(?:\.\d{1,6})?|\.\d{1,6})$/.test(rawYears) ||
    !Number.isFinite(period) ||
    period <= 0 ||
    period > 1000
  ) {
    invalid(
      'years',
      'Enter a holding period greater than zero and at most 1,000 years.'
    );
  }
  const totalInvestment = initial + costs;
  const proceeds = sale + rent;
  const totalGain = proceeds - totalInvestment;
  return finiteResults({
    totalInvestment,
    totalGain,
    roiPercent: (totalGain / totalInvestment) * 100,
    annualizedPercent:
      (Math.pow(proceeds / totalInvestment, 1 / period) - 1) * 100,
  });
}

export function calculateRentalYield({
  propertyValue,
  rentalIncome,
  rentFrequency,
  annualExpenses,
}) {
  const value = amount(propertyValue, 'propertyValue', { positive: true });
  const rent = amount(rentalIncome, 'rentalIncome');
  const expenses = amount(annualExpenses, 'annualExpenses', { optional: true });
  if (!['monthly', 'annual'].includes(rentFrequency))
    invalid('rentFrequency', 'Choose monthly or annual rent.');
  const annualRentalIncome = rent * (rentFrequency === 'monthly' ? 12 : 1);
  return finiteResults({
    annualRentalIncome,
    grossYieldPercent: (annualRentalIncome / value) * 100,
    netYieldPercent: ((annualRentalIncome - expenses) / value) * 100,
  });
}
