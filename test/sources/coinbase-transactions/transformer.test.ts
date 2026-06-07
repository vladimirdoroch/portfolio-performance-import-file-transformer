import { describe, expect, it } from 'vitest';
import { toCoinbaseAccountTransactionRows } from '../../../src/sources/coinbase-transactions/transformer.js';
import type { CoinbaseTransaction } from '../../../src/sources/coinbase-transactions/types.js';
import {
  EXPECTED_BUY_ADA,
  EXPECTED_CONVERT_DOGE,
  EXPECTED_CONVERT_XLM,
  EXPECTED_DEPOSIT_EUR,
  EXPECTED_ETH2_DEPRECATION_ETH,
  EXPECTED_ETH2_DEPRECATION_ETH2,
  EXPECTED_LEARNING_REWARD_BTC,
  EXPECTED_RECEIVE_ADA,
  EXPECTED_REWARD_SOL,
  EXPECTED_ROW_BUY_ADA,
  EXPECTED_ROW_CONVERT_DOGE_BUY,
  EXPECTED_ROW_CONVERT_XLM_SELL,
  EXPECTED_ROW_DEPOSIT_EUR,
  EXPECTED_ROW_ETH2_DEPRECATION_BUY,
  EXPECTED_ROW_ETH2_DEPRECATION_SELL,
  EXPECTED_ROW_LEARNING_REWARD_BTC,
  EXPECTED_ROW_LEARNING_REWARD_BTC_BUY,
  EXPECTED_ROW_RECEIVE_ADA,
  EXPECTED_ROW_RECEIVE_ADA_DEPOSIT,
  EXPECTED_ROW_SELL_SOL,
  EXPECTED_ROW_SEND_SOL_SELL,
  EXPECTED_ROW_SEND_SOL_WITHDRAWAL,
  EXPECTED_ROW_STAKING_ETH2,
  EXPECTED_ROW_STAKING_ETH2_BUY,
  EXPECTED_ROW_STAKING_SOL,
  EXPECTED_ROW_STAKING_SOL_BUY,
  EXPECTED_SELL_SOL,
  EXPECTED_SEND_SOL,
  EXPECTED_STAKING_ETH2,
  EXPECTED_STAKING_SOL,
} from './fixtures.js';

describe('toCoinbaseAccountTransactionRows', () => {
  it('returns empty array for empty input', () => {
    expect(toCoinbaseAccountTransactionRows([])).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Staking Income → Dividend + Buy (double-entry)
  // ---------------------------------------------------------------------------
  describe('Staking Income → Dividend + Buy', () => {
    it('emits two rows per staking transaction', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_STAKING_SOL]);
      expect(rows).toHaveLength(2);
    });

    it('first row is Dividend', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_STAKING_SOL]);
      expect(row?.type).toBe('Dividend');
    });

    it('second row is Buy (reinvestment)', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_STAKING_SOL]);
      expect(rows[1]?.type).toBe('Buy');
    });

    it('both rows share the same value, shares, and ticker', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_STAKING_SOL]);
      expect(rows[0]?.value).toBeCloseTo(1.5389, 4);
      expect(rows[1]?.value).toBeCloseTo(1.5389, 4);
      expect(rows[0]?.shares).toBeCloseTo(0.010379474, 9);
      expect(rows[1]?.shares).toBeCloseTo(0.010379474, 9);
      expect(rows[0]?.tickerSymbol).toBe('SOL');
      expect(rows[1]?.tickerSymbol).toBe('SOL');
    });

    it('both rows carry fees when > 0', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_STAKING_SOL]);
      expect(rows[0]?.fees).toBeCloseTo(0.539206596113556, 9);
      expect(rows[1]?.fees).toBeCloseTo(0.539206596113556, 9);
    });

    it('formats time as HH:MM', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_STAKING_SOL]);
      expect(row?.time).toBe('00:46');
    });

    it('Dividend note includes transaction ID and asset ticker', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_STAKING_SOL]);
      expect(row?.note).toBe('aaa0000000000000000000001 | SOL');
    });

    it('Buy note contains only the transaction ID', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_STAKING_SOL]);
      expect(rows[1]?.note).toBe('aaa0000000000000000000001');
    });

    it('Dividend row matches full expected fixture', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_STAKING_SOL]);
      expect(row).toMatchObject(EXPECTED_ROW_STAKING_SOL);
    });

    it('Buy row matches full expected fixture', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_STAKING_SOL]);
      expect(rows[1]).toMatchObject(EXPECTED_ROW_STAKING_SOL_BUY);
    });

    it('omits fees when zero — ETH2 Dividend row', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_STAKING_ETH2]);
      expect(row?.fees).toBeUndefined();
    });

    it('omits fees when zero — ETH2 Buy row', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_STAKING_ETH2]);
      expect(rows[1]?.fees).toBeUndefined();
    });

    it('expands ETH2 ticker to full security name on both rows', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_STAKING_ETH2]);
      expect(rows[0]?.securityName).toBe('Ethereum 2 (Staked)');
      expect(rows[1]?.securityName).toBe('Ethereum 2 (Staked)');
    });

    it('ETH2 Dividend note includes ticker, not expanded name', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_STAKING_ETH2]);
      expect(row?.note).toBe('aaa0000000000000000000002 | ETH2');
    });

    it('ETH2 Dividend row matches full expected fixture', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_STAKING_ETH2]);
      expect(row).toMatchObject(EXPECTED_ROW_STAKING_ETH2);
    });

    it('ETH2 Buy row matches full expected fixture', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_STAKING_ETH2]);
      expect(rows[1]).toMatchObject(EXPECTED_ROW_STAKING_ETH2_BUY);
    });
  });

  // ---------------------------------------------------------------------------
  // Reward Income → Dividend + Buy (double-entry)
  // ---------------------------------------------------------------------------
  describe('Reward Income → Dividend + Buy', () => {
    it('emits two rows', () => {
      expect(toCoinbaseAccountTransactionRows([EXPECTED_REWARD_SOL])).toHaveLength(2);
    });

    it('first row is Dividend, second is Buy', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_REWARD_SOL]);
      expect(rows[0]?.type).toBe('Dividend');
      expect(rows[1]?.type).toBe('Buy');
    });

    it('Dividend note includes asset ticker and original notes text', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_REWARD_SOL]);
      expect(row?.note).toBe('aaa0000000000000000000003 | SOL | Received 0.00255067 SOL from Coinbase Rewards');
    });
  });

  // ---------------------------------------------------------------------------
  // Buy → Buy
  // ---------------------------------------------------------------------------
  describe('Buy → Buy', () => {
    it('maps type to Buy', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_BUY_ADA]);
      expect(row?.type).toBe('Buy');
    });

    it('uses total as value', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_BUY_ADA]);
      expect(row?.value).toBeCloseTo(50.0, 2);
    });

    it('matches full expected row', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_BUY_ADA]);
      expect(row).toMatchObject(EXPECTED_ROW_BUY_ADA);
    });
  });

  // ---------------------------------------------------------------------------
  // Sell → Sell
  // ---------------------------------------------------------------------------
  describe('Sell → Sell', () => {
    it('maps type to Sell', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_SELL_SOL]);
      expect(row?.type).toBe('Sell');
    });

    it('uses absolute quantity as shares', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_SELL_SOL]);
      expect(row?.shares).toBeCloseTo(1.5, 1);
    });

    it('matches full expected row', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_SELL_SOL]);
      expect(row).toMatchObject(EXPECTED_ROW_SELL_SOL);
    });
  });

  // ---------------------------------------------------------------------------
  // Convert → Sell (source, negative qty) / Buy (target, positive qty)
  // ---------------------------------------------------------------------------
  describe('Convert (XLM → DOGE)', () => {
    it('source row (negative qty) becomes Sell', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_CONVERT_XLM]);
      expect(row?.type).toBe('Sell');
    });

    it('source row uses absolute quantity as shares', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_CONVERT_XLM]);
      expect(row?.shares).toBeCloseTo(49.1542048, 7);
    });

    it('target row (positive qty) becomes Buy', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_CONVERT_DOGE]);
      expect(row?.type).toBe('Buy');
    });

    it('source row matches full expected row', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_CONVERT_XLM]);
      expect(row).toMatchObject(EXPECTED_ROW_CONVERT_XLM_SELL);
    });

    it('target row matches full expected row', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_CONVERT_DOGE]);
      expect(row).toMatchObject(EXPECTED_ROW_CONVERT_DOGE_BUY);
    });
  });

  // ---------------------------------------------------------------------------
  // Deposit → Deposit (no security fields)
  // ---------------------------------------------------------------------------
  describe('Deposit → Deposit', () => {
    it('maps type to Deposit', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_DEPOSIT_EUR]);
      expect(row?.type).toBe('Deposit');
    });

    it('has no shares or ticker (cash-only row)', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_DEPOSIT_EUR]);
      expect(row?.shares).toBeUndefined();
      expect(row?.tickerSymbol).toBeUndefined();
    });

    it('matches full expected row', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_DEPOSIT_EUR]);
      expect(row).toMatchObject(EXPECTED_ROW_DEPOSIT_EUR);
    });
  });

  // ---------------------------------------------------------------------------
  // Receive → Deposit + Buy (double-entry, net cash = 0)
  // ---------------------------------------------------------------------------
  describe('Receive → Deposit + Buy', () => {
    it('emits two rows per Receive transaction', () => {
      expect(toCoinbaseAccountTransactionRows([EXPECTED_RECEIVE_ADA])).toHaveLength(2);
    });

    it('first row is Deposit (credits cash to offset the Buy)', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_RECEIVE_ADA]);
      expect(row?.type).toBe('Deposit');
    });

    it('second row is Buy (adds shares to depot)', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_RECEIVE_ADA]);
      expect(rows[1]?.type).toBe('Buy');
    });

    it('both rows use subtotal as value (no fees for Receive)', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_RECEIVE_ADA]);
      expect(rows[0]?.value).toBeCloseTo(293.23353, 5);
      expect(rows[1]?.value).toBeCloseTo(293.23353, 5);
    });

    it('both rows share the same note', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_RECEIVE_ADA]);
      expect(rows[0]?.note).toBe(rows[1]?.note);
    });

    it('Deposit row has no shares or ticker (cash-only)', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_RECEIVE_ADA]);
      expect(row?.shares).toBeUndefined();
      expect(row?.tickerSymbol).toBeUndefined();
    });

    it('Deposit row matches full expected fixture', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_RECEIVE_ADA]);
      expect(row).toMatchObject(EXPECTED_ROW_RECEIVE_ADA_DEPOSIT);
    });

    it('Buy row matches full expected fixture', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_RECEIVE_ADA]);
      expect(rows[1]).toMatchObject(EXPECTED_ROW_RECEIVE_ADA);
    });
  });

  // ---------------------------------------------------------------------------
  // Send → Sell + Withdrawal (double-entry, net cash = 0)
  // ---------------------------------------------------------------------------
  describe('Send → Sell + Withdrawal', () => {
    it('emits two rows per Send transaction', () => {
      expect(toCoinbaseAccountTransactionRows([EXPECTED_SEND_SOL])).toHaveLength(2);
    });

    it('first row is Sell (removes shares from depot)', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_SEND_SOL]);
      expect(row?.type).toBe('Sell');
    });

    it('second row is Withdrawal (debits cash to neutralise the Sell credit)', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_SEND_SOL]);
      expect(rows[1]?.type).toBe('Withdrawal');
    });

    it('both rows use subtotal as value (no fees for Send)', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_SEND_SOL]);
      expect(rows[0]?.value).toBeCloseTo(29.50, 2);
      expect(rows[1]?.value).toBeCloseTo(29.50, 2);
    });

    it('both rows share the same note', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_SEND_SOL]);
      expect(rows[0]?.note).toBe(rows[1]?.note);
    });

    it('Withdrawal row has no shares or ticker (cash-only)', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_SEND_SOL]);
      expect(rows[1]?.shares).toBeUndefined();
      expect(rows[1]?.tickerSymbol).toBeUndefined();
    });

    it('Sell row matches full expected fixture', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_SEND_SOL]);
      expect(row).toMatchObject(EXPECTED_ROW_SEND_SOL_SELL);
    });

    it('Withdrawal row matches full expected fixture', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_SEND_SOL]);
      expect(rows[1]).toMatchObject(EXPECTED_ROW_SEND_SOL_WITHDRAWAL);
    });
  });

  // ---------------------------------------------------------------------------
  // Retail Staking Transfer → skipped
  // ---------------------------------------------------------------------------
  describe('Retail Staking Transfer → skipped', () => {
    it('produces no output rows', () => {
      const transfer: CoinbaseTransaction = {
        id: 'skip001',
        date: '2023-03-24',
        time: '22:08:14',
        type: 'Retail Staking Transfer',
        asset: 'SOL',
        quantityTransacted: 35.5,
        priceCurrency: 'EUR',
        priceAtTransaction: 19.12,
        subtotal: 678.89,
        total: 678.89,
        fees: 0,
        notes: '',
      };
      expect(toCoinbaseAccountTransactionRows([transfer])).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Mixed batch – row count and ordering
  // ---------------------------------------------------------------------------
  describe('mixed batch', () => {
    const mixed: CoinbaseTransaction[] = [
      EXPECTED_STAKING_SOL,    // → 1 Interest + 1 Buy row = 2
      EXPECTED_STAKING_ETH2,   // → 1 Interest + 1 Buy row = 2
      EXPECTED_BUY_ADA,        // → 1 Buy row
      EXPECTED_SELL_SOL,       // → 1 Sell row
      EXPECTED_CONVERT_XLM,    // → 1 Sell row
      EXPECTED_CONVERT_DOGE,   // → 1 Buy row
      EXPECTED_DEPOSIT_EUR,    // → 1 Deposit row
      EXPECTED_RECEIVE_ADA,    // → 1 Deposit + 1 Buy = 2 rows
      {                        // Retail Staking Transfer → skipped
        id: 'skip001',
        date: '2023-03-24',
        time: '22:08:14',
        type: 'Retail Staking Transfer',
        asset: 'SOL',
        quantityTransacted: 35.5,
        priceCurrency: 'EUR',
        priceAtTransaction: 19.12,
        subtotal: 678.89,
        total: 678.89,
        fees: 0,
        notes: '',
      } satisfies CoinbaseTransaction,
    ];

    it('produces 11 rows (2 per staking tx, 2 for Receive, Retail Staking Transfer skipped)', () => {
      expect(toCoinbaseAccountTransactionRows(mixed)).toHaveLength(11);
    });

    it('preserves input order (Dividend before Buy for each staking tx)', () => {
      const rows = toCoinbaseAccountTransactionRows(mixed);
      expect(rows[0]?.type).toBe('Dividend');  // SOL staking Dividend
      expect(rows[1]?.type).toBe('Buy');       // SOL staking Buy
      expect(rows[2]?.type).toBe('Dividend');  // ETH2 staking Dividend
      expect(rows[3]?.type).toBe('Buy');       // ETH2 staking Buy
      expect(rows[4]?.type).toBe('Buy');       // ADA buy
      expect(rows[5]?.type).toBe('Sell');      // SOL sell
      expect(rows[6]?.type).toBe('Sell');      // XLM convert source
      expect(rows[7]?.type).toBe('Buy');       // DOGE convert target
      expect(rows[8]?.type).toBe('Deposit');   // EUR deposit
      expect(rows[9]?.type).toBe('Deposit');   // ADA receive Deposit
      expect(rows[10]?.type).toBe('Buy');      // ADA receive Buy
    });
  });

  // ---------------------------------------------------------------------------
  // Integration – real example file produces expected counts
  // ---------------------------------------------------------------------------
  describe('integration – 2023-transactions.csv', () => {
    it('produces 731 rows (381×2 for staking/reward − 4 skipped + others)', async () => {
      // 281 Staking Income × 2 + 68 Reward Income × 2 + 1 Receive × 2 + 20 Convert + 10 Buy + 1 Deposit = 731
      const { readFile } = await import('node:fs/promises');
      const { parseCoinbaseCsv } = await import('../../../src/sources/coinbase-transactions/csv-parser.js');
      const csvText = await readFile(
        'test/sources/coinbase-transactions/examples/2023-transactions.csv',
        'utf-8',
      );
      const transactions = parseCoinbaseCsv(csvText);
      const rows = toCoinbaseAccountTransactionRows(transactions);
      expect(rows).toHaveLength(731);
    });

    it('all output rows have a valid date, positive value, and a type', async () => {
      const { readFile } = await import('node:fs/promises');
      const { parseCoinbaseCsv } = await import('../../../src/sources/coinbase-transactions/csv-parser.js');
      const csvText = await readFile(
        'test/sources/coinbase-transactions/examples/2023-transactions.csv',
        'utf-8',
      );
      const transactions = parseCoinbaseCsv(csvText);
      for (const row of toCoinbaseAccountTransactionRows(transactions)) {
        expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(row.value).toBeGreaterThan(0);
        expect(row.type).toBeTruthy();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Learning Reward → Dividend + Buy (double-entry, same as staking)
  // ---------------------------------------------------------------------------
  describe('Learning Reward → Dividend + Buy', () => {
    it('emits two rows', () => {
      expect(toCoinbaseAccountTransactionRows([EXPECTED_LEARNING_REWARD_BTC])).toHaveLength(2);
    });

    it('first row is Dividend, second is Buy', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_LEARNING_REWARD_BTC]);
      expect(rows[0]?.type).toBe('Dividend');
      expect(rows[1]?.type).toBe('Buy');
    });

    it('Dividend note includes asset ticker and notes text', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_LEARNING_REWARD_BTC]);
      expect(row?.note).toBe('aaa0000000000000000000012 | BTC | Earned 0.00001234 BTC for completing a lesson');
    });

    it('Buy note contains only ID and notes text (no ticker prefix)', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_LEARNING_REWARD_BTC]);
      expect(rows[1]?.note).toBe('aaa0000000000000000000012 | Earned 0.00001234 BTC for completing a lesson');
    });

    it('omits fees when zero on both rows', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_LEARNING_REWARD_BTC]);
      expect(rows[0]?.fees).toBeUndefined();
      expect(rows[1]?.fees).toBeUndefined();
    });

    it('Dividend row matches full expected fixture', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_LEARNING_REWARD_BTC]);
      expect(row).toMatchObject(EXPECTED_ROW_LEARNING_REWARD_BTC);
    });

    it('Buy row matches full expected fixture', () => {
      const rows = toCoinbaseAccountTransactionRows([EXPECTED_LEARNING_REWARD_BTC]);
      expect(rows[1]).toMatchObject(EXPECTED_ROW_LEARNING_REWARD_BTC_BUY);
    });
  });

  // ---------------------------------------------------------------------------
  // Retail Eth2 Deprecation → Sell (ETH2 removal) / Buy (ETH credit)
  // ---------------------------------------------------------------------------
  describe('Retail Eth2 Deprecation → Sell (negative qty) / Buy (positive qty)', () => {
    it('negative quantity row becomes Sell', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_ETH2_DEPRECATION_ETH2]);
      expect(row?.type).toBe('Sell');
    });

    it('positive quantity row becomes Buy', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_ETH2_DEPRECATION_ETH]);
      expect(row?.type).toBe('Buy');
    });

    it('emits exactly one row per deprecation entry (no double-entry)', () => {
      expect(toCoinbaseAccountTransactionRows([EXPECTED_ETH2_DEPRECATION_ETH2])).toHaveLength(1);
      expect(toCoinbaseAccountTransactionRows([EXPECTED_ETH2_DEPRECATION_ETH])).toHaveLength(1);
    });

    it('ETH2 removal row expands ticker to full security name', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_ETH2_DEPRECATION_ETH2]);
      expect(row?.securityName).toBe('Ethereum 2 (Staked)');
      expect(row?.tickerSymbol).toBe('ETH2');
    });

    it('ETH credit row keeps ETH as security name', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_ETH2_DEPRECATION_ETH]);
      expect(row?.securityName).toBe('ETH');
      expect(row?.tickerSymbol).toBe('ETH');
    });

    it('uses absolute quantity as shares on the Sell row', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_ETH2_DEPRECATION_ETH2]);
      expect(row?.shares).toBeCloseTo(0.5, 1);
    });

    it('Sell (ETH2 removal) row matches full expected fixture', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_ETH2_DEPRECATION_ETH2]);
      expect(row).toMatchObject(EXPECTED_ROW_ETH2_DEPRECATION_SELL);
    });

    it('Buy (ETH credit) row matches full expected fixture', () => {
      const [row] = toCoinbaseAccountTransactionRows([EXPECTED_ETH2_DEPRECATION_ETH]);
      expect(row).toMatchObject(EXPECTED_ROW_ETH2_DEPRECATION_BUY);
    });
  });
});
