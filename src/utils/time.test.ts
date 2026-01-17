import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatTimestamp, oneMonthAgo, formatTime } from './time';

describe('time utility functions', () => {
  describe('formatTimestamp', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "Just now" for timestamps less than 1 minute ago', () => {
      const now = Date.now();
      const result = formatTimestamp(now);
      expect(result).toMatch(/^Just now - /);
      expect(result).toMatch(/12:00 PM$/);
    });

    it('should return "Just now" for timestamps 30 seconds ago', () => {
      const thirtySecondsAgo = Date.now() - 30 * 1000;
      const result = formatTimestamp(thirtySecondsAgo);
      expect(result).toMatch(/^Just now - /);
    });

    it('should return minutes ago for timestamps 1-59 minutes ago', () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const result = formatTimestamp(fiveMinutesAgo);
      expect(result).toMatch(/^5m ago - /);
      expect(result).toMatch(/11:55 AM$/);
    });

    it('should return hours ago for timestamps 1-23 hours ago', () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      const result = formatTimestamp(twoHoursAgo);
      expect(result).toMatch(/^2h ago - /);
      expect(result).toMatch(/10:00 AM$/);
    });

    it('should return formatted date for timestamps more than 24 hours ago', () => {
      const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
      const result = formatTimestamp(twoDaysAgo);
      expect(result).toBe('Jun 13, 2024 - 12:00 PM');
    });

    it('should handle edge case at exactly 1 minute', () => {
      const oneMinuteAgo = Date.now() - 60 * 1000;
      const result = formatTimestamp(oneMinuteAgo);
      expect(result).toMatch(/^1m ago - /);
    });

    it('should handle edge case at exactly 1 hour', () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const result = formatTimestamp(oneHourAgo);
      expect(result).toMatch(/^1h ago - /);
    });

    it('should handle edge case at exactly 24 hours (1440 minutes)', () => {
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const result = formatTimestamp(twentyFourHoursAgo);
      expect(result).toBe('Jun 14, 2024 - 12:00 PM');
    });
  });

  describe('oneMonthAgo', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return a timestamp from one month ago', () => {
      const result = oneMonthAgo();
      const expectedDate = new Date('2024-05-15T12:00:00').getTime();

      expect(result).toBe(expectedDate);
    });

    it('should return a number', () => {
      const result = oneMonthAgo();
      expect(typeof result).toBe('number');
    });

    it('should return a timestamp less than current time', () => {
      const result = oneMonthAgo();
      expect(result).toBeLessThan(Date.now());
    });
  });

  describe('formatTime', () => {
    it('should format 0 seconds', () => {
      expect(formatTime(0)).toBe('00:00');
    });

    it('should format seconds only', () => {
      expect(formatTime(5)).toBe('00:05');
      expect(formatTime(45)).toBe('00:45');
    });

    it('should format minutes and seconds', () => {
      expect(formatTime(60)).toBe('01:00');
      expect(formatTime(65)).toBe('01:05');
      expect(formatTime(125)).toBe('02:05');
    });

    it('should format with hours', () => {
      expect(formatTime(3600)).toBe('1:00:00');
      expect(formatTime(3661)).toBe('1:01:01');
      expect(formatTime(7325)).toBe('2:02:05');
    });

    it('should pad seconds and minutes correctly', () => {
      expect(formatTime(61)).toBe('01:01');
      expect(formatTime(3601)).toBe('1:00:01');
    });

    it('should handle decimal seconds by flooring', () => {
      expect(formatTime(65.7)).toBe('01:05');
      expect(formatTime(65.2)).toBe('01:05');
    });

    it('should handle large durations', () => {
      expect(formatTime(86400)).toBe('24:00:00');
    });

    it('should not show hours prefix when hours is 0', () => {
      expect(formatTime(599)).toBe('09:59');
      expect(formatTime(3599)).toBe('59:59');
    });
  });
});
