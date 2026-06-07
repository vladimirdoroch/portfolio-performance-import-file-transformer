import { describe, it, expect } from 'vitest';
import { toDarlehenAccountTransactionRows } from '../../../src/sources/dkb-portfolio-transactions/transformer.js';
import type { DkbDarlehenStatement } from '../../../src/sources/dkb-portfolio-transactions/types.js';
import { generateAccountTransactionCsv } from '../../../src/pp/csv-generator.js';

const BASE_STATEMENT: DkbDarlehenStatement = {
  accountNumber: '1234567890',
  iban: 'DE12120300001234567890',
  periodStart: '2024-01-01',
  periodEnd: '2024-12-31',
  openingBalance: -38094.82,
  closingBalance: -30564.3,
  format: 'new',
  entries: [],
};

// ---------------------------------------------------------------------------
// Entry-type → Account Transaction type mapping
// ---------------------------------------------------------------------------

describe('toDarlehenAccountTransactionRows – type mapping', () => {
  const cases: Array<[string, string, number, string]> = [
    ['Darlehensauszahlung', 'Darlehensauszahlung', -50000, 'Transfer (Outbound)'],
    ['Dauerauftrag',        'Dauerauftrag',          700,   'Deposit'],
    ['Sondertilgung',       'Sondertilgung',          97.33, 'Deposit'],
    ['Darlehensleistung',   'Darlehensleistung',     648.57, 'Deposit'],
    ['Darlehenszins',       'Darlehenszins',          -76.72, 'Interest Charge'],
    ['Verzugszins',         'Verzugszins lfd. Jahr',  -0.45, 'Interest Charge'],
    ['Storno',              'Storno',                 -97.33, 'Withdrawal'],
  ];

  for (const [entryType, description, amount, expectedType] of cases) {
    it(`maps ${entryType} to ${expectedType}`, () => {
      const stmt: DkbDarlehenStatement = {
        ...BASE_STATEMENT,
        entries: [{ bookingDate: '2024-01-03', valueDate: '2024-01-03', description, type: entryType as never, amount }],
      };
      const rows = toDarlehenAccountTransactionRows(stmt);
      expect(rows[0]?.type).toBe(expectedType);
    });
  }

  it('falls back to Deposit for unknown positive entry', () => {
    const stmt: DkbDarlehenStatement = {
      ...BASE_STATEMENT,
      entries: [{ bookingDate: '2024-01-03', valueDate: '2024-01-03', description: 'other', type: 'other', amount: 50 }],
    };
    expect(toDarlehenAccountTransactionRows(stmt)[0]?.type).toBe('Deposit');
  });

  it('falls back to Withdrawal for unknown negative entry', () => {
    const stmt: DkbDarlehenStatement = {
      ...BASE_STATEMENT,
      entries: [{ bookingDate: '2024-01-03', valueDate: '2024-01-03', description: 'other', type: 'other', amount: -50 }],
    };
    expect(toDarlehenAccountTransactionRows(stmt)[0]?.type).toBe('Withdrawal');
  });
});

// ---------------------------------------------------------------------------
// Field mapping
// ---------------------------------------------------------------------------

describe('toDarlehenAccountTransactionRows – field mapping', () => {
  const stmt: DkbDarlehenStatement = {
    ...BASE_STATEMENT,
    entries: [
      {
        bookingDate: '2024-01-03',
        valueDate: '2024-01-03',
        description: 'Dauerauftrag',
        type: 'Dauerauftrag',
        amount: 700,
      },
    ],
  };
  const row = toDarlehenAccountTransactionRows(stmt)[0]!;

  it('uses valueDate as the transaction date', () => {
    expect(row.date).toBe('2024-01-03');
  });

  it('sets value to the absolute amount', () => {
    expect(row.value).toBe(700);
  });

  it('sets transactionCurrency to EUR', () => {
    expect(row.transactionCurrency).toBe('EUR');
  });

  it('sets cashAccount to the loan IBAN', () => {
    expect(row.cashAccount).toBe('DE12120300001234567890');
  });

  it('sets note to the entry description', () => {
    expect(row.note).toBe('Dauerauftrag');
  });

  it('does not set shares or securityName', () => {
    expect(row.shares).toBeUndefined();
    expect((row as Record<string, unknown>)['securityName']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Storno is kept (no pair removal)
// ---------------------------------------------------------------------------

describe('toDarlehenAccountTransactionRows – Storno kept as Withdrawal', () => {
  const stmt: DkbDarlehenStatement = {
    ...BASE_STATEMENT,
    entries: [
      { bookingDate: '2024-02-07', valueDate: '2024-02-07', description: 'Sondertilgung', type: 'Sondertilgung', amount: 97.33 },
      { bookingDate: '2024-02-07', valueDate: '2024-02-07', description: 'Storno',         type: 'Storno',        amount: -97.33 },
      { bookingDate: '2024-02-15', valueDate: '2024-02-15', description: 'Darlehenszins',  type: 'Darlehenszins', amount: -75.53 },
    ],
  };

  const rows = toDarlehenAccountTransactionRows(stmt);

  it('emits all three entries (no pair removal)', () => {
    expect(rows).toHaveLength(3);
  });

  it('Sondertilgung becomes Deposit', () => {
    expect(rows[0]?.type).toBe('Deposit');
  });

  it('Storno becomes Withdrawal', () => {
    expect(rows[1]?.type).toBe('Withdrawal');
  });

  it('Storno value is absolute (positive)', () => {
    expect(rows[1]?.value).toBe(97.33);
  });
});

// ---------------------------------------------------------------------------
// Empty input
// ---------------------------------------------------------------------------

describe('toDarlehenAccountTransactionRows – empty statement', () => {
  it('returns an empty array when there are no entries', () => {
    const rows = toDarlehenAccountTransactionRows(BASE_STATEMENT);
    expect(rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// German CSV type translation
// ---------------------------------------------------------------------------

describe('toDarlehenAccountTransactionRows – German CSV output', () => {
  const stmt: DkbDarlehenStatement = {
    ...BASE_STATEMENT,
    entries: [
      { bookingDate: '2024-01-03', valueDate: '2024-01-03', description: 'Dauerauftrag',  type: 'Dauerauftrag',  amount: 700 },
      { bookingDate: '2024-01-15', valueDate: '2024-01-15', description: 'Darlehenszins', type: 'Darlehenszins', amount: -76.72 },
      { bookingDate: '2024-01-18', valueDate: '2024-01-18', description: 'Darlehensauszahlung', type: 'Darlehensauszahlung', amount: -50000 },
    ],
  };

  it('uses German headers (Datum, Typ, Wert, Konto)', () => {
    const csv = generateAccountTransactionCsv(toDarlehenAccountTransactionRows(stmt));
    const header = csv.split('\n')[0]!;
    expect(header).toContain('Datum');
    expect(header).toContain('Typ');
    expect(header).toContain('Wert');
    expect(header).toContain('Konto');
  });

  it('translates Deposit to Einlage', () => {
    const rows = toDarlehenAccountTransactionRows(stmt);
    const csv = generateAccountTransactionCsv(rows);
    const lines = csv.split('\n');
    const headers = lines[0]!.split(';');
    const typeIdx = headers.indexOf('Typ');
    expect(lines[1]!.split(';')[typeIdx]).toBe('Einlage');
  });

  it('translates Interest Charge to Zinsbelastung', () => {
    const rows = toDarlehenAccountTransactionRows(stmt);
    const csv = generateAccountTransactionCsv(rows);
    const lines = csv.split('\n');
    const headers = lines[0]!.split(';');
    const typeIdx = headers.indexOf('Typ');
    expect(lines[2]!.split(';')[typeIdx]).toBe('Zinsbelastung');
  });

  it('translates Transfer (Outbound) to Umbuchung (Ausgang)', () => {
    const rows = toDarlehenAccountTransactionRows(stmt);
    const csv = generateAccountTransactionCsv(rows);
    const lines = csv.split('\n');
    const headers = lines[0]!.split(';');
    const typeIdx = headers.indexOf('Typ');
    expect(lines[3]!.split(';')[typeIdx]).toBe('Umbuchung (Ausgang)');
  });

  it('keeps English type values with locale en', () => {
    const rows = toDarlehenAccountTransactionRows(stmt);
    const csv = generateAccountTransactionCsv(rows, 'en');
    const lines = csv.split('\n');
    const headers = lines[0]!.split(';');
    const typeIdx = headers.indexOf('Type');
    expect(lines[1]!.split(';')[typeIdx]).toBe('Deposit');
    expect(lines[2]!.split(';')[typeIdx]).toBe('Interest Charge');
    expect(lines[3]!.split(';')[typeIdx]).toBe('Transfer (Outbound)');
  });
});

