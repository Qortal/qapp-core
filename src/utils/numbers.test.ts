import { describe, it, expect } from 'vitest';
import { formatBytes, formatDuration } from './numbers';

describe('numbers utility functions', () => {
  describe('formatBytes', () => {
    it('should return "0 Bytes" for 0', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('should format bytes correctly', () => {
      expect(formatBytes(500)).toBe('500 Bytes');
    });

    it('should format kilobytes correctly (binary)', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('should format megabytes correctly (binary)', () => {
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1572864)).toBe('1.5 MB');
    });

    it('should format gigabytes correctly (binary)', () => {
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should format terabytes correctly (binary)', () => {
      expect(formatBytes(1099511627776)).toBe('1 TB');
    });

    it('should respect decimal places parameter', () => {
      expect(formatBytes(1536, 0)).toBe('2 KB');
      expect(formatBytes(1536, 1)).toBe('1.5 KB');
      expect(formatBytes(1536, 3)).toBe('1.5 KB');
    });

    it('should handle negative decimals as 0', () => {
      expect(formatBytes(1536, -1)).toBe('2 KB');
    });

    it('should format using decimal (1000) when specified', () => {
      expect(formatBytes(1000, 2, 'Decimal')).toBe('1 KB');
      expect(formatBytes(1500, 2, 'Decimal')).toBe('1.5 KB');
      expect(formatBytes(1000000, 2, 'Decimal')).toBe('1 MB');
    });

    it('should handle large values', () => {
      expect(formatBytes(1125899906842624)).toBe('1 PB');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds only', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(5)).toBe('0:05');
      expect(formatDuration(45)).toBe('0:45');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(65)).toBe('1:05');
      expect(formatDuration(125)).toBe('2:05');
      expect(formatDuration(599)).toBe('9:59');
    });

    it('should format hours, minutes and seconds', () => {
      expect(formatDuration(3600)).toBe('1:00:00');
      expect(formatDuration(3661)).toBe('1:01:01');
      expect(formatDuration(7325)).toBe('2:02:05');
    });

    it('should pad minutes when hours are present', () => {
      expect(formatDuration(3665)).toBe('1:01:05');
    });

    it('should not pad minutes when no hours', () => {
      expect(formatDuration(65)).toBe('1:05');
    });

    it('should always pad seconds', () => {
      expect(formatDuration(5)).toBe('0:05');
      expect(formatDuration(3605)).toBe('1:00:05');
    });

    it('should handle decimal seconds by flooring', () => {
      expect(formatDuration(65.7)).toBe('1:05');
      expect(formatDuration(65.2)).toBe('1:05');
    });

    it('should handle large durations', () => {
      expect(formatDuration(86400)).toBe('24:00:00');
      expect(formatDuration(90061)).toBe('25:01:01');
    });
  });
});
