import { describe, expect, it } from 'vitest';
import { parseAccountCsv } from '../../../src/sources/degiro-account/csv-parser.js';
import {
  CASH_SWEEP_CSV,
  DIVIDEND_CSV,
  EUR_BUY_CSV,
  EUR_SELL_MULTI_FILL_CSV,
  FLATEX_DEPOSIT_CSV,
  FUSION_CSV,
  HEADER,
  IDEAL_DEPOSIT_CSV,
  INTEREST_CHARGE_CSV,
  INTEREST_INCOME_CSV,
  MARKET_ACCESS_FEE_CSV,
  STOCK_SPLIT_CSV,
  USD_BUY_SINGLE_FILL_CSV,
  USD_SELL_CSV,
} from './fixtures.js';

describe('parseAccountCsv', () => {
  it('returns empty array for header-only input', () => {
    expect(parseAccountCsv(HEADER)).toEqual([]);
  });

  it('skips blank lines', () => {
    const csv = HEADER + '\n';
    expect(parseAccountCsv(csv)).toHaveLength(0);
  });

  // ── Date & time parsing ────────────────────────────────────────────────────

  it('converts DD-MM-YYYY dates to YYYY-MM-DD', () => {
    const [row] = parseAccountCsv(EUR_BUY_CSV);
    expect(row?.date).toBe('2025-01-06');
    expect(row?.valueDate).toBe('2025-01-06');
  });

  it('preserves HH:MM time as-is', () => {
    const [row] = parseAccountCsv(EUR_BUY_CSV);
    expect(row?.time).toBe('10:28');
  });

  // ── German number parsing ──────────────────────────────────────────────────

  it('parses German decimal number with comma separator', () => {
    const rows = parseAccountCsv(EUR_BUY_CSV);
    const fill = rows.find((r) => r.bookingType === 'Buy');
    expect(fill?.changeAmount).toBeCloseTo(-2480.75, 2);
    expect(fill?.balance).toBeCloseTo(193.35, 2);
  });

  it('parses German number with thousands separator', () => {
    const rows = parseAccountCsv(USD_BUY_SINGLE_FILL_CSV);
    const fxCredit = rows.find((r) => r.bookingType === 'FxCredit');
    expect(fxCredit?.changeAmount).toBeCloseTo(11095.2, 1);
  });

  it('parses FX rate from col 6', () => {
    const rows = parseAccountCsv(USD_BUY_SINGLE_FILL_CSV);
    const fxCredit = rows.find((r) => r.bookingType === 'FxCredit');
    expect(fxCredit?.fxRate).toBeCloseTo(1.1667, 4);
  });

  // ── Field population ───────────────────────────────────────────────────────

  it('populates product and isin for security rows', () => {
    const rows = parseAccountCsv(USD_BUY_SINGLE_FILL_CSV);
    const fill = rows.find((r) => r.bookingType === 'Buy');
    expect(fill?.product).toBe('IONQ INC');
    expect(fill?.isin).toBe('US46222L1089');
  });

  it('leaves product and isin undefined for cash rows', () => {
    const rows = parseAccountCsv(FLATEX_DEPOSIT_CSV);
    const row = rows[0];
    expect(row?.product).toBeUndefined();
    expect(row?.isin).toBeUndefined();
  });

  it('populates orderId for trade rows', () => {
    const rows = parseAccountCsv(EUR_BUY_CSV);
    for (const row of rows) {
      expect(row.orderId).toBe('c4375bad-3681-460c-8685-bd4bd36ac690');
    }
  });

  it('leaves orderId undefined for non-trade rows', () => {
    const rows = parseAccountCsv(FLATEX_DEPOSIT_CSV);
    expect(rows[0]?.orderId).toBeUndefined();
  });

  it('leaves changeCurrency and changeAmount undefined for flatex bank-entry rows', () => {
    const rows = parseAccountCsv(CASH_SWEEP_CSV);
    const bankEntry = rows.find(
      (r) => r.bookingType === 'FlatexTransfer' || r.bookingType === 'FlatexWithdrawal',
    );
    expect(bankEntry?.changeCurrency).toBeUndefined();
    expect(bankEntry?.changeAmount).toBeUndefined();
  });

  // ── BookingType classification ─────────────────────────────────────────────

  describe('BookingType classification', () => {
    it('classifies Buy rows', () => {
      const rows = parseAccountCsv(EUR_BUY_CSV);
      expect(rows.some((r) => r.bookingType === 'Buy')).toBe(true);
    });

    it('classifies Sell rows', () => {
      const rows = parseAccountCsv(EUR_SELL_MULTI_FILL_CSV);
      expect(rows.filter((r) => r.bookingType === 'Sell')).toHaveLength(3);
    });

    it('classifies FxCredit and FxDebit rows', () => {
      const rows = parseAccountCsv(USD_BUY_SINGLE_FILL_CSV);
      expect(rows.filter((r) => r.bookingType === 'FxCredit')).toHaveLength(2);
      expect(rows.filter((r) => r.bookingType === 'FxDebit')).toHaveLength(2);
    });

    it('classifies TransactionFee rows', () => {
      const rows = parseAccountCsv(EUR_BUY_CSV);
      expect(rows.some((r) => r.bookingType === 'TransactionFee')).toBe(true);
    });

    it('classifies Dividend rows', () => {
      const rows = parseAccountCsv(DIVIDEND_CSV);
      expect(rows.some((r) => r.bookingType === 'Dividend')).toBe(true);
    });

    it('classifies DividendTax rows', () => {
      const rows = parseAccountCsv(DIVIDEND_CSV);
      expect(rows.some((r) => r.bookingType === 'DividendTax')).toBe(true);
    });

    it('classifies CashSweep rows', () => {
      const rows = parseAccountCsv(CASH_SWEEP_CSV);
      expect(rows.some((r) => r.bookingType === 'CashSweep')).toBe(true);
    });

    it('classifies FlatexTransfer rows (Überweisung)', () => {
      const rows = parseAccountCsv(CASH_SWEEP_CSV);
      expect(rows.some((r) => r.bookingType === 'FlatexTransfer')).toBe(true);
    });

    it('classifies FlatexDeposit rows', () => {
      const rows = parseAccountCsv(FLATEX_DEPOSIT_CSV);
      expect(rows[0]?.bookingType).toBe('FlatexDeposit');
    });

    it('classifies InstantDeposit and PaymentReservation rows', () => {
      const rows = parseAccountCsv(IDEAL_DEPOSIT_CSV);
      expect(rows.some((r) => r.bookingType === 'InstantDeposit')).toBe(true);
      expect(rows.some((r) => r.bookingType === 'PaymentReservation')).toBe(true);
    });

    it('classifies MarketAccessFee rows', () => {
      const rows = parseAccountCsv(MARKET_ACCESS_FEE_CSV);
      expect(rows[0]?.bookingType).toBe('MarketAccessFee');
    });

    it('classifies InterestIncome rows', () => {
      const rows = parseAccountCsv(INTEREST_INCOME_CSV);
      expect(rows[0]?.bookingType).toBe('InterestIncome');
    });

    it('classifies InterestCharge (Zinsen) rows', () => {
      const rows = parseAccountCsv(INTEREST_CHARGE_CSV);
      expect(rows[0]?.bookingType).toBe('InterestCharge');
    });

    it('classifies FusionSell and FusionBuy rows', () => {
      const rows = parseAccountCsv(FUSION_CSV);
      expect(rows.some((r) => r.bookingType === 'FusionSell')).toBe(true);
      expect(rows.some((r) => r.bookingType === 'FusionBuy')).toBe(true);
    });

    it('classifies StockSplitDebit (negative change) and StockSplitCredit (positive change)', () => {
      const rows = parseAccountCsv(STOCK_SPLIT_CSV);
      expect(rows.some((r) => r.bookingType === 'StockSplitDebit')).toBe(true);
      expect(rows.some((r) => r.bookingType === 'StockSplitCredit')).toBe(true);
    });

    it('classifies USD sell FxDebit with FX rate', () => {
      const rows = parseAccountCsv(USD_SELL_CSV);
      const fxDebit = rows.find(
        (r) => r.bookingType === 'FxDebit' && r.fxRate !== undefined,
      );
      expect(fxDebit?.fxRate).toBeCloseTo(1.1643, 4);
    });
  });

  // ── Row count sanity checks ────────────────────────────────────────────────

  it('parses correct number of rows for EUR buy', () => {
    expect(parseAccountCsv(EUR_BUY_CSV)).toHaveLength(2); // 1 fee + 1 fill
  });

  it('parses correct number of rows for multi-fill EUR sell', () => {
    expect(parseAccountCsv(EUR_SELL_MULTI_FILL_CSV)).toHaveLength(4); // 3 fills + 1 fee
  });

  it('parses correct number of rows for USD buy with 2 fills', () => {
    // 2 FxCredit + 2 FxDebit + 1 fee + 2 fills = 7
    expect(parseAccountCsv(USD_BUY_SINGLE_FILL_CSV)).toHaveLength(7);
  });
});
