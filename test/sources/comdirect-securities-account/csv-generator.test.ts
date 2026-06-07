import { describe, it, expect } from 'vitest';
import { generateCsv } from '../../../src/sources/comdirect-securities-account/csv-generator.js';
import type { PortfolioTransactionRow } from '../../../src/pp/types.js';

const NVIDIA_BUY: PortfolioTransactionRow = {
  date: '2024-03-15',
  type: 'Buy',
  shares: 2,
  value: 1900,
  securityName: 'NVIDIA Corp.',
  isin: 'US67066G1040',
  wkn: '918422',
  transactionCurrency: 'EUR',
  time: '15:30',
  cashAccount: 'DE12345678901234567890',
  securitiesAccount: '2345678901',
};

const NVIDIA_SELL: PortfolioTransactionRow = {
  date: '2024-04-10',
  type: 'Sell',
  shares: 2,
  value: 2100,
  securityName: 'NVIDIA Corp.',
  isin: 'US67066G1040',
  wkn: '918422',
  transactionCurrency: 'EUR',
  time: '09:15',
  cashAccount: 'DE12345678901234567890',
  securitiesAccount: '2345678901',
};

const BASF_BUY: PortfolioTransactionRow = {
  date: '2026-04-05',
  type: 'Buy',
  shares: 20,
  value: 900,
  securityName: 'BASF SE',
  isin: 'DE000BASF111',
  wkn: 'BASF11',
  transactionCurrency: 'EUR',
};

describe('generateCsv – empty input', () => {
  it('returns an empty string for an empty array', () => {
    expect(generateCsv([])).toBe('');
  });
});

describe('generateCsv – single buy row (locale en)', () => {
  const csv = generateCsv([NVIDIA_BUY], 'en');
  const lines = csv.split('\n');

  it('produces exactly two lines (header + one data row)', () => {
    expect(lines).toHaveLength(2);
  });

  it('uses semicolons as delimiter', () => {
    expect(lines[0]).toContain(';');
  });

  it('includes mandatory column headers', () => {
    expect(lines[0]).toContain('Date');
    expect(lines[0]).toContain('Shares');
    expect(lines[0]).toContain('Value');
  });

  it('includes Type column header', () => {
    expect(lines[0]).toContain('Type');
  });

  it('includes optional column headers that are present in the row', () => {
    expect(lines[0]).toContain('Security Name');
    expect(lines[0]).toContain('ISIN');
    expect(lines[0]).toContain('WKN');
    expect(lines[0]).toContain('Transaction Currency');
    expect(lines[0]).toContain('Time');
    expect(lines[0]).toContain('Cash Account');
    expect(lines[0]).toContain('Securities Account');
  });

  it('writes correct date', () => {
    expect(lines[1]).toContain('2024-03-15');
  });

  it('writes type Buy', () => {
    expect(lines[1]).toContain('Buy');
  });

  it('writes correct shares value', () => {
    expect(lines[1]).toContain('2');
  });

  it('writes correct value', () => {
    expect(lines[1]).toContain('1900');
  });

  it('writes ISIN', () => {
    expect(lines[1]).toContain('US67066G1040');
  });
});

describe('generateCsv – German locale (default)', () => {
  const csvBuy = generateCsv([NVIDIA_BUY]);
  const csvSell = generateCsv([NVIDIA_SELL]);

  it('uses German column headers', () => {
    const lines = csvBuy.split('\n');
    expect(lines[0]).toContain('Datum');
    expect(lines[0]).toContain('Typ');
    expect(lines[0]).toContain('Stück');
    expect(lines[0]).toContain('Wert');
  });

  it('translates Buy to Kauf', () => {
    const lines = csvBuy.split('\n');
    expect(lines[1]).toContain('Kauf');
    expect(lines[1]).not.toContain('Buy');
  });

  it('translates Sell to Verkauf', () => {
    const lines = csvSell.split('\n');
    expect(lines[1]).toContain('Verkauf');
    expect(lines[1]).not.toContain('Sell');
  });
});

describe('generateCsv – buy and sell rows (locale en)', () => {
  const csv = generateCsv([NVIDIA_BUY, NVIDIA_SELL], 'en');
  const lines = csv.split('\n');

  it('produces header + two data rows', () => {
    expect(lines).toHaveLength(3);
  });

  it('first data row contains Buy type', () => {
    expect(lines[1]).toContain('Buy');
  });

  it('second data row contains Sell type', () => {
    expect(lines[2]).toContain('Sell');
  });
});

describe('generateCsv – multiple rows', () => {
  const csv = generateCsv([NVIDIA_BUY, BASF_BUY]);
  const lines = csv.split('\n');

  it('produces header + two data rows', () => {
    expect(lines).toHaveLength(3);
  });

  it('second data row contains BASF ISIN', () => {
    expect(lines[2]).toContain('DE000BASF111');
  });

  it('omits columns that are absent in all rows (e.g. Ticker Symbol)', () => {
    expect(lines[0]).not.toContain('Ticker Symbol');
  });
});

describe('generateCsv – RFC 4180 quoting', () => {
  it('quotes a field that contains a semicolon', () => {
    const row: PortfolioTransactionRow = {
      date: '2024-03-15',
      shares: 1,
      value: 100,
      note: 'note; with semicolon',
    };
    const csv = generateCsv([row]);
    expect(csv).toContain('"note; with semicolon"');
  });

  it('escapes double-quotes within a quoted field', () => {
    const row: PortfolioTransactionRow = {
      date: '2024-03-15',
      shares: 1,
      value: 100,
      note: 'say "hello"',
    };
    const csv = generateCsv([row]);
    expect(csv).toContain('"say ""hello"""');
  });
});
