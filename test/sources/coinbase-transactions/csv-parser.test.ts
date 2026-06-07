import { describe, expect, it } from 'vitest';
import { parseCoinbaseCsv } from '../../../src/sources/coinbase-transactions/csv-parser.js';
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
  EXPECTED_SELL_SOL,
  EXPECTED_SEND_SOL,
  EXPECTED_STAKING_ETH2,
  EXPECTED_STAKING_SOL,
  SAMPLE_CSV,
} from './fixtures.js';

describe('parseCoinbaseCsv', () => {
  it('returns empty array when there are no data rows', () => {
    const headerOnly = [
      'Transactions',
      'User,Test,00000000-0000-0000-0000-000000000000',
      'ID,Timestamp,Transaction Type,Asset,Quantity Transacted,Price Currency,Price at Transaction,Subtotal,Total (inclusive of fees and/or spread),Fees and/or Spread,Notes,Sender Address,Recipient Address',
      '',
    ].join('\n');
    expect(parseCoinbaseCsv(headerOnly)).toEqual([]);
  });

  it('throws when the header row is missing', () => {
    expect(() => parseCoinbaseCsv('no valid header here\nsome data')).toThrow(
      /could not locate the header row/,
    );
  });

  it('throws for an unknown transaction type', () => {
    const bad = SAMPLE_CSV.replace('Staking Income', 'Unknown Type');
    expect(() => parseCoinbaseCsv(bad)).toThrow(/unknown transaction type/i);
  });

  it('parses all 15 sample rows (including Retail Staking Transfer, Learning Reward, Retail Eth2 Deprecation, and Send rows)', () => {
    const result = parseCoinbaseCsv(SAMPLE_CSV);
    expect(result).toHaveLength(15);
  });

  // ---------------------------------------------------------------------------
  // Staking Income – SOL (with fees)
  // ---------------------------------------------------------------------------
  describe('Staking Income (SOL, with fees)', () => {
    it('parses date and time from UTC timestamp', () => {
      const [row] = parseCoinbaseCsv(SAMPLE_CSV);
      expect(row?.date).toBe('2023-12-30');
      expect(row?.time).toBe('00:46:45');
    });

    it('parses transaction type', () => {
      const [row] = parseCoinbaseCsv(SAMPLE_CSV);
      expect(row?.type).toBe('Staking Income');
    });

    it('parses quantity as positive number', () => {
      const [row] = parseCoinbaseCsv(SAMPLE_CSV);
      expect(row?.quantityTransacted).toBeCloseTo(0.010379474, 9);
    });

    it('strips € prefix and parses monetary amounts', () => {
      const [row] = parseCoinbaseCsv(SAMPLE_CSV);
      expect(row?.subtotal).toBeCloseTo(0.99969, 5);
      expect(row?.total).toBeCloseTo(1.5389, 4);
      expect(row?.fees).toBeCloseTo(0.539206596113556, 9);
    });

    it('matches full expected object', () => {
      const [row] = parseCoinbaseCsv(SAMPLE_CSV);
      expect(row).toMatchObject(EXPECTED_STAKING_SOL);
    });
  });

  // ---------------------------------------------------------------------------
  // Staking Income – ETH2 (zero fees)
  // ---------------------------------------------------------------------------
  describe('Staking Income (ETH2, zero fees)', () => {
    it('parses zero fees correctly', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[1]?.fees).toBe(0);
    });

    it('matches full expected object', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[1]).toMatchObject(EXPECTED_STAKING_ETH2);
    });
  });

  // ---------------------------------------------------------------------------
  // Reward Income
  // ---------------------------------------------------------------------------
  describe('Reward Income (SOL, with note)', () => {
    it('parses type as Reward Income', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[2]?.type).toBe('Reward Income');
    });

    it('captures the notes field', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[2]?.notes).toBe('Received 0.00255067 SOL from Coinbase Rewards');
    });

    it('matches full expected object', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[2]).toMatchObject(EXPECTED_REWARD_SOL);
    });
  });

  // ---------------------------------------------------------------------------
  // Buy
  // ---------------------------------------------------------------------------
  describe('Buy (ADA)', () => {
    it('parses type as Buy', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[3]?.type).toBe('Buy');
    });

    it('parses positive quantity', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[3]?.quantityTransacted).toBeCloseTo(126.711086, 6);
    });

    it('matches full expected object', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[3]).toMatchObject(EXPECTED_BUY_ADA);
    });
  });

  // ---------------------------------------------------------------------------
  // Sell
  // ---------------------------------------------------------------------------
  describe('Sell (SOL)', () => {
    it('parses type as Sell', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[4]?.type).toBe('Sell');
    });

    it('matches full expected object', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[4]).toMatchObject(EXPECTED_SELL_SOL);
    });
  });

  // ---------------------------------------------------------------------------
  // Convert pair (XLM → DOGE)
  // ---------------------------------------------------------------------------
  describe('Convert (XLM → DOGE)', () => {
    it('parses source row with negative quantity', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[5]?.type).toBe('Convert');
      expect(result[5]?.quantityTransacted).toBeCloseTo(-49.1542048, 7);
    });

    it('parses monetary amounts on source row as positive', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[5]?.subtotal).toBeCloseTo(6.26584, 5);
      expect(result[5]?.total).toBeCloseTo(6.43097, 5);
    });

    it('parses target row with positive quantity', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[6]?.type).toBe('Convert');
      expect(result[6]?.quantityTransacted).toBeCloseTo(91.51829246, 8);
    });

    it('parses negative fees on target row as absolute value', () => {
      // Coinbase uses negative spread on the target row
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[6]?.fees).toBeCloseTo(0.005996283708016008, 9);
    });

    it('source row matches full expected object', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[5]).toMatchObject(EXPECTED_CONVERT_XLM);
    });

    it('target row matches full expected object', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[6]).toMatchObject(EXPECTED_CONVERT_DOGE);
    });
  });

  // ---------------------------------------------------------------------------
  // Deposit
  // ---------------------------------------------------------------------------
  describe('Deposit (EUR)', () => {
    it('parses type as Deposit', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[7]?.type).toBe('Deposit');
    });

    it('matches full expected object', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[7]).toMatchObject(EXPECTED_DEPOSIT_EUR);
    });
  });

  // ---------------------------------------------------------------------------
  // Receive
  // ---------------------------------------------------------------------------
  describe('Receive (ADA, with sender address)', () => {
    it('parses type as Receive', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[8]?.type).toBe('Receive');
    });

    it('captures sender address', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[8]?.senderAddress).toBe('an external account');
    });

    it('matches full expected object', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[8]).toMatchObject(EXPECTED_RECEIVE_ADA);
    });
  });

  // ---------------------------------------------------------------------------
  // Retail Staking Transfer
  // ---------------------------------------------------------------------------
  describe('Retail Staking Transfer', () => {
    it('parses both rows as Retail Staking Transfer type', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[9]?.type).toBe('Retail Staking Transfer');
      expect(result[10]?.type).toBe('Retail Staking Transfer');
    });

    it('parses negative-total row with positive absolute amounts', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      const negativeRow = result[10];
      expect(negativeRow?.subtotal).toBeCloseTo(678.89546, 5);
      expect(negativeRow?.total).toBeCloseTo(678.89546, 5);
    });
  });

  // ---------------------------------------------------------------------------
  // Learning Reward
  // ---------------------------------------------------------------------------
  describe('Learning Reward (BTC, with note)', () => {
    it('parses type as Learning Reward', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[11]?.type).toBe('Learning Reward');
    });

    it('parses quantity as positive number', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[11]?.quantityTransacted).toBeCloseTo(0.00001234, 8);
    });

    it('captures the notes field', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[11]?.notes).toBe('Earned 0.00001234 BTC for completing a lesson');
    });

    it('parses zero fees correctly', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[11]?.fees).toBe(0);
    });

    it('matches full expected object', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[11]).toMatchObject(EXPECTED_LEARNING_REWARD_BTC);
    });
  });

  // ---------------------------------------------------------------------------
  // Retail Eth2 Deprecation pair
  // ---------------------------------------------------------------------------
  describe('Retail Eth2 Deprecation (ETH2 → ETH migration pair)', () => {
    it('parses both rows as Retail Eth2 Deprecation type', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[12]?.type).toBe('Retail Eth2 Deprecation');
      expect(result[13]?.type).toBe('Retail Eth2 Deprecation');
    });

    it('removal row (ETH2) has negative quantity', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[12]?.quantityTransacted).toBeCloseTo(-0.5, 1);
      expect(result[12]?.asset).toBe('ETH2');
    });

    it('credit row (ETH) has positive quantity', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[13]?.quantityTransacted).toBeCloseTo(0.5, 1);
      expect(result[13]?.asset).toBe('ETH');
    });

    it('parses negative monetary values as positive absolute amounts', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[12]?.subtotal).toBeCloseTo(1500.00, 2);
      expect(result[12]?.total).toBeCloseTo(1500.00, 2);
    });

    it('removal row matches full expected object', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[12]).toMatchObject(EXPECTED_ETH2_DEPRECATION_ETH2);
    });

    it('credit row matches full expected object', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[13]).toMatchObject(EXPECTED_ETH2_DEPRECATION_ETH);
    });
  });

  // ---------------------------------------------------------------------------
  // Send
  // ---------------------------------------------------------------------------
  describe('Send (SOL, no fees — on-chain outbound)', () => {
    it('parses type as Send', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[14]?.type).toBe('Send');
    });

    it('parses quantity as positive number', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[14]?.quantityTransacted).toBeCloseTo(1.5, 1);
    });

    it('captures the notes field', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[14]?.notes).toBe('Sent 1.5 SOL to an external wallet');
    });

    it('matches full expected object', () => {
      const result = parseCoinbaseCsv(SAMPLE_CSV);
      expect(result[14]).toMatchObject(EXPECTED_SEND_SOL);
    });
  });

  // ---------------------------------------------------------------------------
  // Integration – real example file
  // ---------------------------------------------------------------------------
  describe('integration – 2023-transactions.csv', () => {
    it('parses all 385 rows without error', async () => {
      const { readFile } = await import('node:fs/promises');
      const csvText = await readFile(
        'test/sources/coinbase-transactions/examples/2023-transactions.csv',
        'utf-8',
      );
      const result = parseCoinbaseCsv(csvText);
      expect(result.length).toBe(385);
    });

    it('every row has a non-empty asset and a valid date', async () => {
      const { readFile } = await import('node:fs/promises');
      const csvText = await readFile(
        'test/sources/coinbase-transactions/examples/2023-transactions.csv',
        'utf-8',
      );
      for (const row of parseCoinbaseCsv(csvText)) {
        expect(row.asset).toBeTruthy();
        expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('every row has non-negative total and fees', async () => {
      const { readFile } = await import('node:fs/promises');
      const csvText = await readFile(
        'test/sources/coinbase-transactions/examples/2023-transactions.csv',
        'utf-8',
      );
      for (const row of parseCoinbaseCsv(csvText)) {
        expect(row.total).toBeGreaterThanOrEqual(0);
        expect(row.fees).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
