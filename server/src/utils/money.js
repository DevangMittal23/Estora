import { ensure } from './ApiError.js';
export function integer(value, allowZero = false) {
  ensure(
    Number.isSafeInteger(value) && value >= (allowZero ? 0 : 1),
    400,
    'INVALID_AMOUNT',
    'Amount must be a safe integer in paise'
  );
  return value;
}
export function toPaise(rupees) {
  const text = String(rupees);
  ensure(/^\d+(\.\d{1,2})?$/.test(text), 400, 'INVALID_AMOUNT');
  const [whole, fraction = ''] = text.split('.');
  return integer(Number(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))), true);
}
export const toRupees = (paise) => integer(paise, true) / 100;
export function floorDiv(a, b) {
  return Number(BigInt(integer(a, true)) / BigInt(integer(b)));
}
export function multiply(a, b) {
  return integer(Number(BigInt(integer(a, true)) * BigInt(integer(b, true))), true);
}
export function percent(amount, rate) {
  // Rates are limited to two decimal places, so integer basis points avoid float money math.
  const basisPoints = Math.round(rate * 100);
  ensure(
    Number.isSafeInteger(basisPoints) && basisPoints >= 0 && basisPoints <= 10000,
    400,
    'INVALID_RATE'
  );
  return Number((BigInt(integer(amount, true)) * BigInt(basisPoints)) / 10000n);
}
