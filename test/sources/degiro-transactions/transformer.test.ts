import { describe, expect, it } from 'vitest';
import { toPortfolioTransactionRow } from '../../../src/sources/degiro-transactions/transformer.js';
import {
  EXPECTED_IONQ,
  EXPECTED_IONQ_PP_ROW,
  EXPECTED_ISHARES,
  EXPECTED_ISHARES_PP_ROW,
  EXPECTED_SELLAS,
} from './fixtures.js';

describe('toPortfolioTransactionRow', () => {
  describe('USD Buy (cross-currency)', () => {
    it('maps date, time, type, shares', () => {
      const row = toPortfolioTransactionRow(EXPECTED_IONQ);
      expect(row.date).toBe('2026-04-29');
      expect(row.time).toBe('17:33');
      expect(row.type).toBe('Buy');
      expect(row.shares).toBe(280);
    });

    it('sets value to valueEur and transactionCurrency to EUR', () => {
      const row = toPortfolioTransactionRow(EXPECTED_IONQ);
      expect(row.value).toBeCloseTo(9910.62, 2);
      expect(row.transactionCurrency).toBe('EUR');
    });

    it('sets grossAmount and currencyGrossAmount from local values', () => {
      const row = toPortfolioTransactionRow(EXPECTED_IONQ);
      expect(row.grossAmount).toBeCloseTo(11591.88, 2);
      expect(row.currencyGrossAmount).toBe('USD');
    });

    it('inverts DeGiro Wechselkurs to get PP exchangeRate (EUR/USD)', () => {
      const row = toPortfolioTransactionRow(EXPECTED_IONQ);
      // DeGiro: 1.1696 USD/EUR → PP: 1/1.1696 ≈ 0.8550 EUR/USD
      expect(row.exchangeRate).toBeCloseTo(1 / 1.1696, 4);
    });

    it('sums autoFxFee and transactionFees into fees', () => {
      const row = toPortfolioTransactionRow(EXPECTED_IONQ);
      // 24.78 + 2.00 = 26.78
      expect(row.fees).toBeCloseTo(26.78, 2);
    });

    it('sets ISIN and securityName', () => {
      const row = toPortfolioTransactionRow(EXPECTED_IONQ);
      expect(row.isin).toBe('US46222L1089');
      expect(row.securityName).toBe('IONQ INC');
    });

    it('sets note to orderId', () => {
      const row = toPortfolioTransactionRow(EXPECTED_IONQ);
      expect(row.note).toBe('3b8027f1-a4d7-4a3f-84e1-5d5e962e7a0d');
    });

    it('matches full expected PP row', () => {
      const row = toPortfolioTransactionRow(EXPECTED_IONQ);
      expect(row).toMatchObject(EXPECTED_IONQ_PP_ROW);
    });
  });

  describe('USD Sell (cross-currency)', () => {
    it('maps Sell type', () => {
      const row = toPortfolioTransactionRow(EXPECTED_SELLAS);
      expect(row.type).toBe('Sell');
    });

    it('includes grossAmount, currencyGrossAmount, and inverted exchangeRate', () => {
      const row = toPortfolioTransactionRow(EXPECTED_SELLAS);
      expect(row.grossAmount).toBeCloseTo(12150.08, 2);
      expect(row.currencyGrossAmount).toBe('USD');
      expect(row.exchangeRate).toBeCloseTo(1 / 1.1614, 4);
    });
  });

  describe('EUR Sell', () => {
    it('omits grossAmount, currencyGrossAmount, and exchangeRate', () => {
      const row = toPortfolioTransactionRow(EXPECTED_ISHARES);
      expect(row.grossAmount).toBeUndefined();
      expect(row.currencyGrossAmount).toBeUndefined();
      expect(row.exchangeRate).toBeUndefined();
    });

    it('only includes non-zero fees (autoFxFee=0 + transactionFees=3)', () => {
      const row = toPortfolioTransactionRow(EXPECTED_ISHARES);
      expect(row.fees).toBeCloseTo(3.00, 2);
    });

    it('matches full expected PP row', () => {
      const row = toPortfolioTransactionRow(EXPECTED_ISHARES);
      expect(row).toMatchObject(EXPECTED_ISHARES_PP_ROW);
    });
  });

  describe('transaction with no orderId', () => {
    it('omits note field when orderId is undefined', () => {
      const row = toPortfolioTransactionRow({ ...EXPECTED_IONQ, orderId: undefined });
      expect(row.note).toBeUndefined();
    });
  });

  describe('transaction with no fees', () => {
    it('omits fees field when all fees are zero', () => {
      const row = toPortfolioTransactionRow({
        ...EXPECTED_IONQ,
        autoFxFee: undefined,
        transactionFees: undefined,
      });
      expect(row.fees).toBeUndefined();
    });
  });
});
