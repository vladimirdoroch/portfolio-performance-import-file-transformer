import { describe, it, expect } from 'vitest';
import { parseGermanDate, parseGermanNumber } from '../../../src/sources/comdirect-securities-account/utils.js';

describe('parseGermanNumber', () => {
  it('parses an integer', () => {
    expect(parseGermanNumber('2')).toBe(2);
  });

  it('parses a German decimal number', () => {
    expect(parseGermanNumber('950,0000')).toBe(950);
  });

  it('parses a number with thousand separator and two decimal places', () => {
    expect(parseGermanNumber('1.900,00')).toBe(1900);
  });

  it('parses a large number with multiple thousand separators', () => {
    expect(parseGermanNumber('1.234.567,89')).toBe(1234567.89);
  });

  it('handles leading/trailing whitespace', () => {
    expect(parseGermanNumber('  42,50  ')).toBe(42.5);
  });

  it('throws on non-numeric input', () => {
    expect(() => parseGermanNumber('abc')).toThrow('Cannot parse number');
  });

  it('throws on empty string', () => {
    expect(() => parseGermanNumber('')).toThrow('Cannot parse number');
  });
});

describe('parseGermanDate', () => {
  it('converts DD.MM.YYYY to YYYY-MM-DD', () => {
    expect(parseGermanDate('15.03.2024')).toBe('2024-03-15');
  });

  it('pads single-digit day and month correctly', () => {
    expect(parseGermanDate('05.04.2026')).toBe('2026-04-05');
  });

  it('handles leading/trailing whitespace', () => {
    expect(parseGermanDate('  01.01.2000  ')).toBe('2000-01-01');
  });

  it('throws on ISO format input', () => {
    expect(() => parseGermanDate('2024-03-15')).toThrow('Cannot parse date');
  });

  it('throws on partial date', () => {
    expect(() => parseGermanDate('15.03')).toThrow('Cannot parse date');
  });

  it('throws on empty string', () => {
    expect(() => parseGermanDate('')).toThrow('Cannot parse date');
  });
});
