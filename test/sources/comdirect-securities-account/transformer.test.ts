import { describe, it, expect } from 'vitest';
import { toPortfolioTransactionRow } from '../../../src/sources/comdirect-securities-account/transformer.js';
import type { ComdirectTransaction } from '../../../src/sources/comdirect-securities-account/types.js';

const BUY_FULL: ComdirectTransaction = {
  type: 'buy',
  securityName: 'NVIDIA Corp.',
  isin: 'US67066G1040',
  wkn: '918422',
  shares: 2,
  pricePerShare: 950,
  currency: 'EUR',
  totalValue: 1900,
  fees: 12.9,
  tradeDate: '2024-03-15',
  tradeTime: '15:30',
  settlementDate: '2024-03-19',
  cashAccount: 'DE12345678901234567890',
  securitiesAccount: '2345678901',
};

const BUY_MINIMAL: ComdirectTransaction = {
  type: 'buy',
  securityName: 'BASF SE',
  isin: 'DE000BASF111',
  wkn: 'BASF11',
  shares: 20,
  pricePerShare: 45,
  currency: 'EUR',
  totalValue: 900,
  tradeDate: '2026-04-05',
};

const SELL_FULL: ComdirectTransaction = {
  type: 'sell',
  securityName: 'NVIDIA Corp.',
  isin: 'US67066G1040',
  wkn: '918422',
  shares: 2,
  pricePerShare: 1050,
  currency: 'EUR',
  totalValue: 2100,
  fees: 12.9,
  tradeDate: '2024-04-10',
  tradeTime: '09:15',
  settlementDate: '2024-04-12',
  cashAccount: 'DE12345678901234567890',
  securitiesAccount: '2345678901',
};

describe('toPortfolioTransactionRow – full buy transaction', () => {
  const row = toPortfolioTransactionRow(BUY_FULL);

  it('maps date to tradeDate', () => {
    expect(row.date).toBe('2024-03-15');
  });

  it('sets type to Buy', () => {
    expect(row.type).toBe('Buy');
  });

  it('maps shares', () => {
    expect(row.shares).toBe(2);
  });

  it('maps value to totalValue', () => {
    expect(row.value).toBe(1900);
  });

  it('maps securityName', () => {
    expect(row.securityName).toBe('NVIDIA Corp.');
  });

  it('maps isin', () => {
    expect(row.isin).toBe('US67066G1040');
  });

  it('maps wkn', () => {
    expect(row.wkn).toBe('918422');
  });

  it('maps currency to transactionCurrency', () => {
    expect(row.transactionCurrency).toBe('EUR');
  });

  it('maps tradeTime to time', () => {
    expect(row.time).toBe('15:30');
  });

  it('maps cashAccount', () => {
    expect(row.cashAccount).toBe('DE12345678901234567890');
  });

  it('maps securitiesAccount', () => {
    expect(row.securitiesAccount).toBe('2345678901');
  });

  it('maps fees', () => {
    expect(row.fees).toBe(12.9);
  });
});

describe('toPortfolioTransactionRow – minimal buy transaction', () => {
  const row = toPortfolioTransactionRow(BUY_MINIMAL);

  it('uses tradeDate as date', () => {
    expect(row.date).toBe('2026-04-05');
  });

  it('sets type to Buy', () => {
    expect(row.type).toBe('Buy');
  });

  it('leaves optional fields undefined when absent', () => {
    expect(row.time).toBeUndefined();
    expect(row.cashAccount).toBeUndefined();
    expect(row.securitiesAccount).toBeUndefined();
    expect(row.fees).toBeUndefined();
  });
});

describe('toPortfolioTransactionRow – full sell transaction', () => {
  const row = toPortfolioTransactionRow(SELL_FULL);

  it('sets type to Sell', () => {
    expect(row.type).toBe('Sell');
  });

  it('maps date to tradeDate', () => {
    expect(row.date).toBe('2024-04-10');
  });

  it('maps shares', () => {
    expect(row.shares).toBe(2);
  });

  it('maps value to totalValue', () => {
    expect(row.value).toBe(2100);
  });

  it('maps tradeTime to time', () => {
    expect(row.time).toBe('09:15');
  });

  it('maps cashAccount', () => {
    expect(row.cashAccount).toBe('DE12345678901234567890');
  });

  it('maps securitiesAccount', () => {
    expect(row.securitiesAccount).toBe('2345678901');
  });

  it('maps fees', () => {
    expect(row.fees).toBe(12.9);
  });
});
