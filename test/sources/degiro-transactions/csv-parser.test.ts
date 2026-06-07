import { describe, expect, it } from 'vitest';
import { parseDeGiroTransactionsCsv } from '../../../src/sources/degiro-transactions/csv-parser.js';
import {
  EXPECTED_IONQ,
  EXPECTED_ISHARES,
  EXPECTED_SELLAS,
  SAMPLE_CSV,
} from './fixtures.js';

describe('parseDeGiroTransactionsCsv', () => {
  it('returns empty array for header-only input', () => {
    const header = 'Datum,Uhrzeit,Produkt,ISIN,Referenzbörse,Ausführungsort,Anzahl,Kurs,,Wert in Lokalwährung,,Wert EUR,Wechselkurs,AutoFX-Gebühr,Transaktionsgebühren und/oder Fremdkosten,Gesamt EUR,Order-ID,\n';
    expect(parseDeGiroTransactionsCsv(header)).toEqual([]);
  });

  it('parses all three sample rows', () => {
    const result = parseDeGiroTransactionsCsv(SAMPLE_CSV);
    expect(result).toHaveLength(3);
  });

  describe('IONQ BUY (USD, cross-currency)', () => {
    it('parses date correctly', () => {
      const [row] = parseDeGiroTransactionsCsv(SAMPLE_CSV);
      expect(row.date).toBe(EXPECTED_IONQ.date);
    });

    it('detects Buy type for positive Anzahl', () => {
      const [row] = parseDeGiroTransactionsCsv(SAMPLE_CSV);
      expect(row.type).toBe('Buy');
    });

    it('stores shares as positive absolute value', () => {
      const [row] = parseDeGiroTransactionsCsv(SAMPLE_CSV);
      expect(row.shares).toBe(280);
    });

    it('parses German decimal numbers', () => {
      const [row] = parseDeGiroTransactionsCsv(SAMPLE_CSV);
      expect(row.pricePerShare).toBe(41.3996);
      expect(row.valueLocal).toBeCloseTo(11591.88, 2);
      expect(row.valueEur).toBeCloseTo(9910.62, 2);
    });

    it('captures exchange rate', () => {
      const [row] = parseDeGiroTransactionsCsv(SAMPLE_CSV);
      expect(row.exchangeRate).toBeCloseTo(1.1696, 4);
    });

    it('stores fees as positive values', () => {
      const [row] = parseDeGiroTransactionsCsv(SAMPLE_CSV);
      expect(row.autoFxFee).toBeCloseTo(24.78, 2);
      expect(row.transactionFees).toBeCloseTo(2.00, 2);
    });

    it('captures Order-ID from the last column', () => {
      const [row] = parseDeGiroTransactionsCsv(SAMPLE_CSV);
      expect(row.orderId).toBe(EXPECTED_IONQ.orderId);
    });

    it('matches full expected object', () => {
      const [row] = parseDeGiroTransactionsCsv(SAMPLE_CSV);
      expect(row).toMatchObject(EXPECTED_IONQ);
    });
  });

  describe('SELLAS SELL (USD, quoted execution venue with comma)', () => {
    it('detects Sell type for negative Anzahl', () => {
      const result = parseDeGiroTransactionsCsv(SAMPLE_CSV);
      expect(result[1].type).toBe('Sell');
    });

    it('correctly parses quoted field containing a comma', () => {
      const result = parseDeGiroTransactionsCsv(SAMPLE_CSV);
      expect(result[1].executionVenue).toBe('BATS, JNST');
    });

    it('matches full expected object', () => {
      const result = parseDeGiroTransactionsCsv(SAMPLE_CSV);
      expect(result[1]).toMatchObject(EXPECTED_SELLAS);
    });
  });

  describe('iShares SELL (EUR, no cross-currency)', () => {
    it('parses EUR-denominated transaction', () => {
      const result = parseDeGiroTransactionsCsv(SAMPLE_CSV);
      expect(result[2].localCurrency).toBe('EUR');
      expect(result[2].exchangeRate).toBeUndefined();
    });

    it('parses zero AutoFX fee', () => {
      const result = parseDeGiroTransactionsCsv(SAMPLE_CSV);
      expect(result[2].autoFxFee).toBe(0);
    });

    it('matches full expected object', () => {
      const result = parseDeGiroTransactionsCsv(SAMPLE_CSV);
      expect(result[2]).toMatchObject(EXPECTED_ISHARES);
    });
  });
});
