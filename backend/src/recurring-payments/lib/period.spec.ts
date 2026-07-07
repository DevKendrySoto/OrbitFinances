import {
  computeDueDate,
  formatPeriod,
  isPeriodWithinRange,
  nextPeriod,
} from './period';

describe('period helpers', () => {
  describe('computeDueDate', () => {
    it('combines a period and day into a UTC date', () => {
      expect(computeDueDate('2026-07', 5).toISOString()).toBe(
        '2026-07-05T00:00:00.000Z',
      );
    });

    it('clamps the day to the last day of the month when it does not exist', () => {
      expect(computeDueDate('2026-02', 31).toISOString()).toBe(
        '2026-02-28T00:00:00.000Z',
      );
    });

    it('handles leap years correctly', () => {
      expect(computeDueDate('2028-02', 31).toISOString()).toBe(
        '2028-02-29T00:00:00.000Z',
      );
    });
  });

  describe('nextPeriod', () => {
    it('increments the month within the same year', () => {
      expect(nextPeriod('2026-07')).toBe('2026-08');
    });

    it('rolls over to January of the next year', () => {
      expect(nextPeriod('2026-12')).toBe('2027-01');
    });
  });

  describe('isPeriodWithinRange', () => {
    it('rejects a period before startDate', () => {
      expect(isPeriodWithinRange('2026-06', new Date('2026-07-01'), null)).toBe(
        false,
      );
    });

    it('accepts a period with no endDate limit', () => {
      expect(isPeriodWithinRange('2030-01', new Date('2026-07-01'), null)).toBe(
        true,
      );
    });

    it('rejects a period after endDate', () => {
      expect(
        isPeriodWithinRange(
          '2026-09',
          new Date('2026-07-01'),
          new Date('2026-08-01'),
        ),
      ).toBe(false);
    });

    it('accepts the exact startDate period', () => {
      expect(isPeriodWithinRange('2026-07', new Date('2026-07-01'), null)).toBe(
        true,
      );
    });
  });

  describe('formatPeriod', () => {
    it('formats a date as YYYY-MM', () => {
      expect(formatPeriod(new Date('2026-01-15T00:00:00.000Z'))).toBe(
        '2026-01',
      );
    });
  });
});
