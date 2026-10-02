import { describe, test, expect } from '@jest/globals';
import fc from 'fast-check';
import { computePayouts } from '../src/services/payout.service.js';
import { VALID_TRANSITIONS, validateTransition } from '../src/services/property.service.js';
import { toPaise, toRupees, floorDiv, percent } from '../src/utils/money.js';
import { statuses } from '../src/models/index.js';
describe('Exact integer money and lifecycle', () => {
  test('money conversion preserves paise and rejects fractions below paise', () => {
    expect(toPaise('123.45')).toBe(12345);
    expect(toRupees(100)).toBe(1);
    expect(floorDiv(10, 3)).toBe(3);
    expect(() => toPaise('1.001')).toThrow();
    expect(percent(Number.MAX_SAFE_INTEGER, 2)).toBe(
      Number((BigInt(Number.MAX_SAFE_INTEGER) * 2n) / 100n)
    );
  });
  test('CP3: payouts sum to exactly distributable across 100 random allocations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
        fc.integer({ min: 0, max: 10000 }),
        fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 30 }),
        (salePrice, rate, units) => {
          const allocations = units.map((n, i) => ({
            investorId: String(i),
            investorName: `User ${i}`,
            units: n,
            createdAt: new Date(i),
          }));
          const result = computePayouts(
            salePrice,
            rate / 100,
            units.reduce((a, b) => a + b, 0),
            allocations
          );
          expect(result.check).toBe(true);
          expect(result.items.reduce((sum, p) => sum + p.payoutAmount, 0)).toBe(
            result.distributable
          );
          expect(result.distributable + result.platformFee).toBe(salePrice);
          result.items.forEach((p) => expect(Number.isSafeInteger(p.payoutAmount)).toBe(true));
        }
      ),
      { numRuns: 100 }
    );
  });
  test('remainder belongs to largest holder, with earliest timestamp breaking ties', () => {
    const items = [
      { investorId: 'late', units: 2, createdAt: new Date(10) },
      { investorId: 'early', units: 2, createdAt: new Date(0) },
      { investorId: 'small', units: 1, createdAt: new Date(0) },
    ];
    const result = computePayouts(7, 0, 5, items);
    expect(result.items.find((p) => p.investorId === 'early').payoutAmount).toBe(4);
    expect(result.items.find((p) => p.investorId === 'late').payoutAmount).toBe(2);
  });
  test('100% fee and one paise payout are valid', () => {
    expect(computePayouts(1, 100, 1, [{ investorId: 'a', units: 1 }]).items[0].payoutAmount).toBe(
      0
    );
    expect(computePayouts(1, 0, 1, [{ investorId: 'a', units: 1 }]).items[0].payoutAmount).toBe(1);
  });
  test('CP5: every lifecycle pair is checked, plus 100 generated pairs', () => {
    const check = (from, to) => {
      if (VALID_TRANSITIONS[from].includes(to))
        expect(() => validateTransition(from, to)).not.toThrow();
      else
        expect(() => validateTransition(from, to)).toThrow(
          expect.objectContaining({ statusCode: 409, code: 'INVALID_TRANSITION' })
        );
    };
    for (const from of statuses) for (const to of statuses) check(from, to);
    fc.assert(fc.property(fc.constantFrom(...statuses), fc.constantFrom(...statuses), check), {
      numRuns: 100,
    });
  });
});
