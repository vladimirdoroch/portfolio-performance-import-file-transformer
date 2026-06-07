import { describe, it, expect } from 'vitest';
import { parseDkbDarlehenText } from '../../../src/sources/dkb-portfolio-transactions/text-parser.js';
import { OLD_FORMAT_TEXT, NEW_FORMAT_TEXT, NON_DKB_TEXT } from './fixtures.js';

// ---------------------------------------------------------------------------
// Unrecognised documents
// ---------------------------------------------------------------------------

describe('parseDkbDarlehenText – unrecognised documents', () => {
  it('returns null for unrecognised document', () => {
    expect(parseDkbDarlehenText(NON_DKB_TEXT)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseDkbDarlehenText('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Old format ("JAHRESKONTOAUSZUG")
// ---------------------------------------------------------------------------

describe('parseDkbDarlehenText – old format', () => {
  const result = parseDkbDarlehenText(OLD_FORMAT_TEXT);

  it('returns a non-null result', () => {
    expect(result).not.toBeNull();
  });

  it('detects the old format', () => {
    expect(result?.format).toBe('old');
  });

  it('extracts the account number', () => {
    expect(result?.accountNumber).toBe('1234567890');
  });

  it('extracts the IBAN without spaces', () => {
    expect(result?.iban).toBe('DE12120300001234567890');
  });

  it('extracts the period start', () => {
    expect(result?.periodStart).toBe('2022-01-18');
  });

  it('extracts the period end', () => {
    expect(result?.periodEnd).toBe('2022-12-31');
  });

  it('extracts the opening balance', () => {
    expect(result?.openingBalance).toBe(0);
  });

  it('extracts the closing balance (negative = outstanding loan)', () => {
    expect(result?.closingBalance).toBe(-44488.65);
  });

  it('parses the loan disbursement entry', () => {
    const entry = result?.entries.find((e) => e.type === 'Darlehensauszahlung');
    expect(entry).toBeDefined();
    expect(entry?.amount).toBe(-50000);
    expect(entry?.bookingDate).toBe('2022-01-18');
    expect(entry?.valueDate).toBe('2022-01-18');
  });

  it('parses Darlehenszins as negative amount', () => {
    const entry = result?.entries.find(
      (e) => e.type === 'Darlehenszins' && e.bookingDate === '2022-03-15',
    );
    expect(entry).toBeDefined();
    expect(entry?.amount).toBe(-102.5);
    expect(entry?.valueDate).toBe('2022-03-15');
  });

  it('parses Darlehensleistung as positive amount', () => {
    const entry = result?.entries.find(
      (e) => e.type === 'Darlehensleistung' && e.bookingDate === '2022-03-15',
    );
    expect(entry).toBeDefined();
    expect(entry?.amount).toBe(648.57);
  });

  it('parses Verzugszins entry', () => {
    const entry = result?.entries.find((e) => e.type === 'Verzugszins');
    expect(entry).toBeDefined();
    expect(entry?.amount).toBe(-0.45);
    expect(entry?.description).toBe('Verzugszins lfd. Jahr');
  });

  it('uses DD.MM value date with booking year', () => {
    // 14.04.2022 booking date, value date column "15.04" → 2022-04-15
    const entry = result?.entries.find(
      (e) => e.type === 'Darlehenszins' && e.bookingDate === '2022-04-14',
    );
    expect(entry?.valueDate).toBe('2022-04-15');
  });

  it('parses the correct total number of entries', () => {
    // 1 Darlehensauszahlung + 4×Darlehenszins + 4×Darlehensleistung + 1×Verzugszins = 10
    expect(result?.entries).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// New format ("Jahreskontoauszug für den Zeitraum")
// ---------------------------------------------------------------------------

describe('parseDkbDarlehenText – new format', () => {
  const result = parseDkbDarlehenText(NEW_FORMAT_TEXT);

  it('returns a non-null result', () => {
    expect(result).not.toBeNull();
  });

  it('detects the new format', () => {
    expect(result?.format).toBe('new');
  });

  it('extracts the account number', () => {
    expect(result?.accountNumber).toBe('1234567890');
  });

  it('extracts the IBAN without spaces', () => {
    expect(result?.iban).toBe('DE12120300001234567890');
  });

  it('extracts the period start', () => {
    expect(result?.periodStart).toBe('2024-01-01');
  });

  it('extracts the period end', () => {
    expect(result?.periodEnd).toBe('2024-12-31');
  });

  it('extracts the opening balance', () => {
    expect(result?.openingBalance).toBe(-38094.82);
  });

  it('extracts the closing balance', () => {
    expect(result?.closingBalance).toBe(-30564.3);
  });

  it('parses Dauerauftrag as positive amount', () => {
    const entry = result?.entries.find(
      (e) => e.type === 'Dauerauftrag' && e.bookingDate === '2024-01-03',
    );
    expect(entry).toBeDefined();
    expect(entry?.amount).toBe(700);
    expect(entry?.valueDate).toBe('2024-01-03');
  });

  it('parses Verzugszins Vorj. as negative amount', () => {
    const entry = result?.entries.find(
      (e) => e.type === 'Verzugszins' && e.description === 'Verzugszins Vorj.',
    );
    expect(entry).toBeDefined();
    expect(entry?.amount).toBe(-2.2);
  });

  it('parses Darlehenszins as negative amount', () => {
    const entry = result?.entries.find(
      (e) => e.type === 'Darlehenszins' && e.bookingDate === '2024-01-15',
    );
    expect(entry).toBeDefined();
    expect(entry?.amount).toBe(-76.72);
    expect(entry?.valueDate).toBe('2024-01-15');
  });

  it('parses explicit value date from "/ Wert:" notation', () => {
    const entry = result?.entries.find(
      (e) => e.type === 'Darlehenszins' && e.bookingDate === '2024-06-14',
    );
    expect(entry?.valueDate).toBe('2024-06-15');
  });

  it('parses Dauerauftrag with explicit value date', () => {
    const entry = result?.entries.find(
      (e) => e.type === 'Dauerauftrag' && e.bookingDate === '2024-10-04',
    );
    expect(entry?.valueDate).toBe('2024-10-03');
    expect(entry?.amount).toBe(700);
  });

  it('includes Sondertilgung and Storno as individual entries', () => {
    const sondertilgung = result?.entries.find((e) => e.type === 'Sondertilgung');
    const storno = result?.entries.find((e) => e.type === 'Storno');
    expect(sondertilgung).toBeDefined();
    expect(storno).toBeDefined();
  });

  it('parses the correct total number of entries (before storno removal)', () => {
    // 3×Dauerauftrag + 2×Verzugszins + 3×Darlehenszins + 1×Sondertilgung + 1×Storno = 10
    expect(result?.entries).toHaveLength(10);
  });
});
