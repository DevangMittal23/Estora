export const money = (paise = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(paise / 100);
export const compactMoney = (paise = 0) =>
  paise >= 1000000000
    ? `₹${(paise / 1000000000).toFixed(2)} Cr`
    : paise >= 10000000
      ? `₹${(paise / 10000000).toFixed(1)} L`
      : money(paise);
export const pct = (value = 0) => `${Number(value).toFixed(2)}%`;
export const projected = (amount, rate, years) =>
  amount * (1 + rate / 100) ** years;
export const date = (value) =>
  value
    ? new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeZone: 'Asia/Kolkata',
      }).format(new Date(value))
    : '—';
export const types = ['APARTMENT', 'VILLA', 'COMMERCIAL', 'PLOT', 'WAREHOUSE'];
export const statuses = [
  'DRAFT',
  'PENDING_APPROVAL',
  'LIVE',
  'FUNDED',
  'HOLDING',
  'SOLD',
  'REJECTED',
  'CANCELLED',
];
export const label = (text) =>
  String(text || '')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
export const idOf = (value) => value?._id || value;
export const homeFor = (user) => `/${user.role.toLowerCase()}`;
export const unitLabel = (units) =>
  `${units} ${units === 1 ? 'unit' : 'units'}`;
export function toPaise(value) {
  const text = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(text))
    throw new Error('Enter a positive amount with at most two decimals.');
  const [whole, fraction = ''] = text.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount) || amount <= 0)
    throw new Error('Enter a valid positive amount.');
  return amount;
}
export function investmentKey(userId, propertyId, units) {
  const storageKey = `estora-invest:${userId}:${propertyId}:${units}`;
  let key = sessionStorage.getItem(storageKey);
  if (!key) {
    key = crypto.randomUUID();
    sessionStorage.setItem(storageKey, key);
  }
  return { key, storageKey };
}
