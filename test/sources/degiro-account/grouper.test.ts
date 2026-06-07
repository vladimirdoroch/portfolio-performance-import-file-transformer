import { describe, expect, it } from 'vitest';
import { parseAccountCsv } from '../../../src/sources/degiro-account/csv-parser.js';
import { groupAccountRows } from '../../../src/sources/degiro-account/grouper.js';
import type {
  CashSweepTransaction,
  CorporateActionTransaction,
  DepositTransaction,
  DividendTransaction,
  InterestTransaction,
  MarketAccessFeeTransaction,
  PaymentFeeTransaction,
  StockSplitTransaction,
  TradeTransaction,
} from '../../../src/sources/degiro-account/types.js';
import {
  CASH_SWEEP_CSV,
  COMPOSITE_CSV,
  DIVIDEND_BUNDLED_FX_CSV,
  DIVIDEND_CSV,
  DIVIDEND_SAME_NET_DIFFERENT_QUARTER_CSV,
  DIVIDEND_WITH_ADR_AND_CORRECTION_CSV,
  EUR_BUY_CSV,
  EUR_SELL_MULTI_FILL_CSV,
  FLATEX_DEPOSIT_CSV,
  FUSION_CSV,
  HEADER,
  IDEAL_DEPOSIT_CSV,
  IDEAL_PENDING_RESERVATION_CSV,
  INTEREST_CHARGE_CSV,
  INTEREST_INCOME_CSV,
  MARKET_ACCESS_FEE_CSV,
  STOCK_SPLIT_CSV,
  USD_BUY_SINGLE_FILL_CSV,
  USD_SELL_CSV,
} from './fixtures.js';

/** Parse CSV text and group the result in one step. */
function parse(csv: string) {
  return groupAccountRows(parseAccountCsv(csv));
}

describe('groupAccountRows', () => {
  it('returns empty array for header-only input', () => {
    expect(parse(HEADER)).toEqual([]);
  });

  // ── EUR Buy ────────────────────────────────────────────────────────────────

  describe('EUR Buy (single fill)', () => {
    it('produces exactly one TradeTransaction', () => {
      const txs = parse(EUR_BUY_CSV);
      expect(txs).toHaveLength(1);
      expect(txs[0]?.type).toBe('Trade');
    });

    it('sets side to Buy', () => {
      const tx = parse(EUR_BUY_CSV)[0] as TradeTransaction;
      expect(tx.side).toBe('Buy');
    });

    it('captures the correct orderId', () => {
      const tx = parse(EUR_BUY_CSV)[0] as TradeTransaction;
      expect(tx.orderId).toBe('c4375bad-3681-460c-8685-bd4bd36ac690');
    });

    it('has one fill row', () => {
      const tx = parse(EUR_BUY_CSV)[0] as TradeTransaction;
      expect(tx.fills).toHaveLength(1);
    });

    it('has no FX conversions for EUR trade', () => {
      const tx = parse(EUR_BUY_CSV)[0] as TradeTransaction;
      expect(tx.fxConversions).toHaveLength(0);
    });

    it('extracts fee row', () => {
      const tx = parse(EUR_BUY_CSV)[0] as TradeTransaction;
      expect(tx.fee?.bookingType).toBe('TransactionFee');
      expect(tx.fee?.changeAmount).toBeCloseTo(-3, 2);
    });

    it('parses fill detail (shares, price, currency)', () => {
      const tx = parse(EUR_BUY_CSV)[0] as TradeTransaction;
      const detail = tx.fillDetails[0];
      expect(detail?.shares).toBe(250);
      expect(detail?.pricePerShare).toBeCloseTo(9.923, 3);
      expect(detail?.currency).toBe('EUR');
    });

    it('sets product and isin', () => {
      const tx = parse(EUR_BUY_CSV)[0] as TradeTransaction;
      expect(tx.product).toBe('ISHARES MSCI SCREENED UCITS ETF (ACC)');
      expect(tx.isin).toBe('IE00BFNM3J75');
    });
  });

  // ── EUR Sell (multi-fill) ──────────────────────────────────────────────────

  describe('EUR Sell (3 fills, same Order-ID)', () => {
    it('produces one TradeTransaction with side Sell', () => {
      const txs = parse(EUR_SELL_MULTI_FILL_CSV);
      expect(txs).toHaveLength(1);
      const tx = txs[0] as TradeTransaction;
      expect(tx.type).toBe('Trade');
      expect(tx.side).toBe('Sell');
    });

    it('has three fill rows', () => {
      const tx = parse(EUR_SELL_MULTI_FILL_CSV)[0] as TradeTransaction;
      expect(tx.fills).toHaveLength(3);
    });

    it('has three fill details with correct totals', () => {
      const tx = parse(EUR_SELL_MULTI_FILL_CSV)[0] as TradeTransaction;
      expect(tx.fillDetails).toHaveLength(3);
      const totalShares = tx.fillDetails.reduce((s, d) => s + d.shares, 0);
      expect(totalShares).toBe(450); // 75 + 125 + 250
    });

    it('has no FX conversions for EUR trade', () => {
      const tx = parse(EUR_SELL_MULTI_FILL_CSV)[0] as TradeTransaction;
      expect(tx.fxConversions).toHaveLength(0);
    });
  });

  // ── USD Buy (2 fills + FX pairs) ──────────────────────────────────────────

  describe('USD Buy (2 fills, 2 FX pairs)', () => {
    it('produces one TradeTransaction', () => {
      const txs = parse(USD_BUY_SINGLE_FILL_CSV);
      expect(txs).toHaveLength(1);
      const tx = txs[0] as TradeTransaction;
      expect(tx.type).toBe('Trade');
      expect(tx.side).toBe('Buy');
    });

    it('has two fills', () => {
      const tx = parse(USD_BUY_SINGLE_FILL_CSV)[0] as TradeTransaction;
      expect(tx.fills).toHaveLength(2);
    });

    it('has two FX conversion pairs', () => {
      const tx = parse(USD_BUY_SINGLE_FILL_CSV)[0] as TradeTransaction;
      expect(tx.fxConversions).toHaveLength(2);
    });

    it('each FX pair has a debit (FxDebit) and credit (FxCredit)', () => {
      const tx = parse(USD_BUY_SINGLE_FILL_CSV)[0] as TradeTransaction;
      for (const pair of tx.fxConversions) {
        expect(pair.debit.bookingType).toBe('FxDebit');
        expect(pair.credit.bookingType).toBe('FxCredit');
      }
    });

    it('captures FX rate on credit rows', () => {
      const tx = parse(USD_BUY_SINGLE_FILL_CSV)[0] as TradeTransaction;
      for (const pair of tx.fxConversions) {
        expect(pair.credit.fxRate).toBeCloseTo(1.1667, 4);
      }
    });
  });

  // ── USD Sell ───────────────────────────────────────────────────────────────

  describe('USD Sell (single fill)', () => {
    it('sets side to Sell', () => {
      const tx = parse(USD_SELL_CSV)[0] as TradeTransaction;
      expect(tx.side).toBe('Sell');
    });

    it('FX debit carries the FX rate for sell', () => {
      const tx = parse(USD_SELL_CSV)[0] as TradeTransaction;
      const debit = tx.fxConversions[0]?.debit;
      expect(debit?.fxRate).toBeCloseTo(1.1643, 4);
    });
  });

  // ── Dividend ───────────────────────────────────────────────────────────────

  describe('Dividend (gross + tax + standalone FX)', () => {
    it('produces exactly one DividendTransaction and no standalone FxConversionTransaction', () => {
      const txs = parse(DIVIDEND_CSV);
      expect(txs.filter((t) => t.type === 'Dividend')).toHaveLength(1);
      expect(txs.filter((t) => t.type === 'FxConversion')).toHaveLength(0);
    });

    it('groups dividend and tax under the same exDate', () => {
      const tx = txs_dividend()[0] as DividendTransaction;
      expect(tx.exDate).toBe('2026-03-12');
      expect(tx.dividends).toHaveLength(1);
      expect(tx.taxes).toHaveLength(1);
      expect(tx.adrFees).toHaveLength(0);
    });

    it('net dividend equals gross minus tax', () => {
      const tx = txs_dividend()[0] as DividendTransaction;
      const gross = tx.dividends.reduce((s, r) => s + (r.changeAmount ?? 0), 0);
      const tax = tx.taxes.reduce((s, r) => s + (r.changeAmount ?? 0), 0);
      expect(gross + tax).toBeCloseTo(38.67, 2); // 45.50 - 6.83
    });

    it('fxConversion is linked on the DividendTransaction', () => {
      const tx = txs_dividend()[0] as DividendTransaction;
      expect(tx.fxConversion).toBeDefined();
      expect(tx.fxConversion?.debit.changeCurrency).toBe('USD');
      expect(tx.fxConversion?.credit.changeCurrency).toBe('EUR');
    });

    it('linked fxConversion carries the FX rate', () => {
      const tx = txs_dividend()[0] as DividendTransaction;
      expect(tx.fxConversion?.debit.fxRate).toBeCloseTo(1.1445, 4);
    });

    function txs_dividend() {
      return parse(DIVIDEND_CSV).filter((t) => t.type === 'Dividend');
    }
  });

  // ── Dividend with ADR fee and corrections ─────────────────────────────────

  describe('Dividend with ADR fee and correction rounds', () => {
    it('collects all 6 rows into one DividendTransaction (same isin + valueDate)', () => {
      const txs = parse(DIVIDEND_WITH_ADR_AND_CORRECTION_CSV);
      expect(txs).toHaveLength(1);
      const tx = txs[0] as DividendTransaction;
      expect(tx.type).toBe('Dividend');
    });

    it('splits rows into dividends (2), taxes (2), adrFees (2)', () => {
      const tx = parse(DIVIDEND_WITH_ADR_AND_CORRECTION_CSV)[0] as DividendTransaction;
      expect(tx.dividends).toHaveLength(2);
      expect(tx.taxes).toHaveLength(2);
      expect(tx.adrFees).toHaveLength(2);
    });

    it('net amounts sum to zero after reversal + correction', () => {
      const tx = parse(DIVIDEND_WITH_ADR_AND_CORRECTION_CSV)[0] as DividendTransaction;
      const netDiv = tx.dividends.reduce((s, r) => s + (r.changeAmount ?? 0), 0);
      const netTax = tx.taxes.reduce((s, r) => s + (r.changeAmount ?? 0), 0);
      const netAdr = tx.adrFees.reduce((s, r) => s + (r.changeAmount ?? 0), 0);
      expect(netDiv).toBeCloseTo(0, 2);
      expect(netTax).toBeCloseTo(0, 2);
      expect(netAdr).toBeCloseTo(0, 2);
    });
  });

  // ── Corporate Action (FUSION) ─────────────────────────────────────────────

  describe('Corporate action — FUSION (merger)', () => {
    it('produces one CorporateActionTransaction', () => {
      const txs = parse(FUSION_CSV);
      expect(txs).toHaveLength(1);
      expect(txs[0]?.type).toBe('CorporateAction');
    });

    it('has one sell leg and one buy leg', () => {
      const tx = parse(FUSION_CSV)[0] as CorporateActionTransaction;
      expect(tx.sells).toHaveLength(1);
      expect(tx.buys).toHaveLength(1);
    });

    it('sell leg has FusionSell bookingType', () => {
      const tx = parse(FUSION_CSV)[0] as CorporateActionTransaction;
      expect(tx.sells[0]?.bookingType).toBe('FusionSell');
    });

    it('buy leg has FusionBuy bookingType', () => {
      const tx = parse(FUSION_CSV)[0] as CorporateActionTransaction;
      expect(tx.buys[0]?.bookingType).toBe('FusionBuy');
    });
  });

  // ── Stock Split ────────────────────────────────────────────────────────────

  describe('Stock Split (AKTIENSPLIT)', () => {
    it('produces one StockSplitTransaction', () => {
      const txs = parse(STOCK_SPLIT_CSV);
      expect(txs).toHaveLength(1);
      expect(txs[0]?.type).toBe('StockSplit');
    });

    it('debit row has negative changeAmount', () => {
      const tx = parse(STOCK_SPLIT_CSV)[0] as StockSplitTransaction;
      expect((tx.debit.changeAmount ?? 0)).toBeLessThan(0);
    });

    it('credit row has positive changeAmount', () => {
      const tx = parse(STOCK_SPLIT_CSV)[0] as StockSplitTransaction;
      expect((tx.credit.changeAmount ?? 0)).toBeGreaterThan(0);
    });

    it('sets isin and product from the rows', () => {
      const tx = parse(STOCK_SPLIT_CSV)[0] as StockSplitTransaction;
      expect(tx.isin).toBe('US88160R1014');
      expect(tx.product).toBe('TESLA INC');
    });
  });

  // ── Cash Sweep ────────────────────────────────────────────────────────────

  describe('Cash Sweep pair', () => {
    it('produces one CashSweepTransaction', () => {
      const txs = parse(CASH_SWEEP_CSV);
      expect(txs).toHaveLength(1);
      expect(txs[0]?.type).toBe('CashSweep');
    });

    it('sweep row has CashSweep bookingType with a change amount', () => {
      const tx = parse(CASH_SWEEP_CSV)[0] as CashSweepTransaction;
      expect(tx.sweep.bookingType).toBe('CashSweep');
      expect(tx.sweep.changeAmount).toBeCloseTo(-10433.49, 2);
    });

    it('bankEntry row has FlatexTransfer bookingType and no changeAmount', () => {
      const tx = parse(CASH_SWEEP_CSV)[0] as CashSweepTransaction;
      expect(tx.bankEntry.bookingType).toBe('FlatexTransfer');
      expect(tx.bankEntry.changeAmount).toBeUndefined();
    });
  });

  // ── Deposit ───────────────────────────────────────────────────────────────

  describe('flatex Einzahlung deposit', () => {
    it('produces one DepositTransaction', () => {
      const txs = parse(FLATEX_DEPOSIT_CSV);
      expect(txs).toHaveLength(1);
      expect(txs[0]?.type).toBe('Deposit');
    });

    it('deposit row has FlatexDeposit bookingType', () => {
      const tx = parse(FLATEX_DEPOSIT_CSV)[0] as DepositTransaction;
      expect(tx.deposit.bookingType).toBe('FlatexDeposit');
      expect(tx.deposit.changeAmount).toBeCloseTo(10000, 2);
    });

    it('has no reservation for a simple flatex deposit', () => {
      const tx = parse(FLATEX_DEPOSIT_CSV)[0] as DepositTransaction;
      expect(tx.reservation).toBeUndefined();
    });
  });

  describe('iDEAL instant deposit pair', () => {
    it('produces one DepositTransaction with a reservation', () => {
      const txs = parse(IDEAL_DEPOSIT_CSV);
      expect(txs).toHaveLength(1);
      const tx = txs[0] as DepositTransaction;
      expect(tx.type).toBe('Deposit');
      expect(tx.deposit.bookingType).toBe('InstantDeposit');
      expect(tx.reservation?.bookingType).toBe('PaymentReservation');
    });
  });

  // ── iDEAL two-phase deposit (pending reservation suppression) ─────────────

  describe('iDEAL two-phase deposit — pending reservation is not double-counted', () => {
    it('produces exactly one DepositTransaction (not two)', () => {
      const txs = parse(IDEAL_PENDING_RESERVATION_CSV);
      expect(txs.filter((t) => t.type === 'Deposit')).toHaveLength(1);
    });

    it('deposit amount is the settled 7000 EUR from Soforteinzahlung', () => {
      const txs = parse(IDEAL_PENDING_RESERVATION_CSV);
      const deposit = txs.find((t) => t.type === 'Deposit') as DepositTransaction;
      expect(deposit.deposit.bookingType).toBe('InstantDeposit');
      expect(deposit.deposit.changeAmount).toBeCloseTo(7000, 2);
    });

    it('SOFORT payment fee is emitted as a PaymentFee transaction', () => {
      const txs = parse(IDEAL_PENDING_RESERVATION_CSV);
      expect(txs.filter((t) => t.type === 'PaymentFee')).toHaveLength(1);
      const fee = txs.find((t) => t.type === 'PaymentFee') as PaymentFeeTransaction;
      expect(fee.row.changeAmount).toBeCloseTo(-1, 2);
    });

    it('total transaction count is 2 (one Deposit + one PaymentFee)', () => {
      const txs = parse(IDEAL_PENDING_RESERVATION_CSV);
      expect(txs).toHaveLength(2);
    });
  });

  // ── Market-Access Fee ─────────────────────────────────────────────────────

  describe('Market Access Fee', () => {
    it('produces one MarketAccessFeeTransaction', () => {
      const txs = parse(MARKET_ACCESS_FEE_CSV);
      expect(txs).toHaveLength(1);
      expect(txs[0]?.type).toBe('MarketAccessFee');
    });

    it('extracts exchange name and year', () => {
      const tx = parse(MARKET_ACCESS_FEE_CSV)[0] as MarketAccessFeeTransaction;
      expect(tx.exchange).toBe('Nasdaq - NDQ');
      expect(tx.year).toBe(2026);
    });

    it('fee row has negative EUR change amount', () => {
      const tx = parse(MARKET_ACCESS_FEE_CSV)[0] as MarketAccessFeeTransaction;
      expect(tx.row.changeAmount).toBeCloseTo(-2.5, 2);
    });
  });

  // ── Interest ──────────────────────────────────────────────────────────────

  describe('Interest transactions', () => {
    it('produces InterestTransaction for Flatex Interest Income (zero amount)', () => {
      const txs = parse(INTEREST_INCOME_CSV);
      expect(txs).toHaveLength(1);
      const tx = txs[0] as InterestTransaction;
      expect(tx.type).toBe('Interest');
      expect(tx.row.bookingType).toBe('InterestIncome');
      expect(tx.row.changeAmount).toBeCloseTo(0, 2);
    });

    it('produces InterestTransaction for Zinsen (negative charge)', () => {
      const txs = parse(INTEREST_CHARGE_CSV);
      expect(txs).toHaveLength(1);
      const tx = txs[0] as InterestTransaction;
      expect(tx.type).toBe('Interest');
      expect(tx.row.bookingType).toBe('InterestCharge');
      expect((tx.row.changeAmount ?? 0)).toBeLessThan(0);
    });
  });

  // ── Composite end-to-end ──────────────────────────────────────────────────

  describe('Composite CSV (end-to-end grouping)', () => {
    it('produces the correct number of transactions', () => {
      // 1 USD buy + 1 dividend (FX absorbed) + 1 CashSweep + 1 Deposit + 1 Interest = 5
      const txs = parse(COMPOSITE_CSV);
      expect(txs).toHaveLength(5);
    });

    it('contains exactly one Trade, Dividend, CashSweep, Deposit, Interest and no standalone FxConversion', () => {
      const txs = parse(COMPOSITE_CSV);
      const byType = Object.fromEntries(
        ['Trade', 'Dividend', 'FxConversion', 'CashSweep', 'Deposit', 'Interest'].map(
          (t) => [t, txs.filter((tx) => tx.type === t).length],
        ),
      );
      expect(byType).toEqual({
        Trade: 1,
        Dividend: 1,
        FxConversion: 0,
        CashSweep: 1,
        Deposit: 1,
        Interest: 1,
      });
    });

    it('USD buy has 2 fills and 2 FX pairs', () => {
      const txs = parse(COMPOSITE_CSV);
      const trade = txs.find((t) => t.type === 'Trade') as TradeTransaction;
      expect(trade.fills).toHaveLength(2);
      expect(trade.fxConversions).toHaveLength(2);
    });
  });

  // ── Dividend FX date-proximity constraint ─────────────────────────────────

  describe('Dividend FX matching — same net amount across different quarters', () => {
    it('each dividend gets its own fxConversion (both are matched)', () => {
      const txs = parse(DIVIDEND_SAME_NET_DIFFERENT_QUARTER_CSV);
      const dividends = txs.filter((t) => t.type === 'Dividend');
      expect(dividends).toHaveLength(2);
      for (const d of dividends) {
        expect(d.fxConversion).toBeDefined();
      }
    });

    it('no standalone FxConversionTransaction remains in the output', () => {
      const txs = parse(DIVIDEND_SAME_NET_DIFFERENT_QUARTER_CSV);
      expect(txs.filter((t) => t.type === 'FxConversion')).toHaveLength(0);
    });

    it('newer dividend (June) is matched to its nearby FX, not the March one', () => {
      const txs = parse(DIVIDEND_SAME_NET_DIFFERENT_QUARTER_CSV);
      const dividends = txs.filter((t) => t.type === 'Dividend');
      const june = dividends.find((d) => d.exDate === '2026-06-12')!;
      expect(june.fxConversion?.debit.date).toBe('2026-06-14');
    });

    it('older dividend (March) is matched to its nearby FX, not the June one', () => {
      const txs = parse(DIVIDEND_SAME_NET_DIFFERENT_QUARTER_CSV);
      const dividends = txs.filter((t) => t.type === 'Dividend');
      const march = dividends.find((d) => d.exDate === '2026-03-12')!;
      expect(march.fxConversion?.debit.date).toBe('2026-03-14');
    });
  });

  // ── Dividend FX rate-borrowing from combined FX conversion ────────────────

  describe('Dividend FX rate-borrowing — dividend proceeds bundled in a larger combined FX', () => {
    it('DividendTransaction has fxConversion linked via rate-borrowing', () => {
      const txs = parse(DIVIDEND_BUNDLED_FX_CSV);
      const dividend = txs.find((t) => t.type === 'Dividend') as DividendTransaction;
      expect(dividend.fxConversion).toBeDefined();
    });

    it('borrowed FX rate matches the combined conversion rate (not 1:1)', () => {
      const txs = parse(DIVIDEND_BUNDLED_FX_CSV);
      const dividend = txs.find((t) => t.type === 'Dividend') as DividendTransaction;
      // Rate field on the Ausbuchung row: 1.1387 USD/EUR (debit is the USD row)
      expect(dividend.fxConversion?.debit.fxRate).toBeCloseTo(1.1387, 3);
    });

    it('the combined FxConversionTransaction is NOT consumed (amount ≠ dividend net)', () => {
      const txs = parse(DIVIDEND_BUNDLED_FX_CSV);
      // Rate is only borrowed; the FxConversion is not marked matched, so it remains
      expect(txs.filter((t) => t.type === 'FxConversion')).toHaveLength(1);
    });
  });
});
