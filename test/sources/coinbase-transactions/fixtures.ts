import type { CoinbaseTransaction } from '../../../src/sources/coinbase-transactions/types.js';
import type { AccountTransactionRow } from '../../../src/pp/types.js';

// ---------------------------------------------------------------------------
// Sample CSV
// ---------------------------------------------------------------------------

/**
 * Minimal Coinbase "Standard CSV" export covering every transaction type:
 *   - Staking Income (SOL, with fees)
 *   - Staking Income (ETH2, zero fees)
 *   - Reward Income (SOL, with fees)
 *   - Buy (ADA, with fees)
 *   - Sell (SOL, with fees)
 *   - Convert pair (XLM → DOGE, negative source + positive target)
 *   - Deposit (EUR, no fees)
 *   - Receive (ADA, no fees — on-chain inbound)
 *   - Retail Staking Transfer pair (SOL internal rebalancing — should be skipped)
 *   - Learning Reward (BTC, no fees — Coinbase Learn/Earn)
 *   - Retail Eth2 Deprecation pair (ETH2→ETH migration)
 *   - Send (SOL, no fees — on-chain outbound)
 */
export const SAMPLE_CSV = `Transactions
User,Test User,00000000-0000-0000-0000-000000000000
ID,Timestamp,Transaction Type,Asset,Quantity Transacted,Price Currency,Price at Transaction,Subtotal,Total (inclusive of fees and/or spread),Fees and/or Spread,Notes,Sender Address,Recipient Address
aaa0000000000000000000001,2023-12-30 00:46:45 UTC,Staking Income,SOL,0.010379474,EUR,€96.314298,€0.99969,€1.53890,€0.539206596113556,,,
aaa0000000000000000000002,2023-12-29 16:02:00 UTC,Staking Income,ETH2,0.000328377742,EUR,€2104.4364594641681095525,€0.69105,€0.69105,€0.00,,,
aaa0000000000000000000003,2023-07-21 12:09:38 UTC,Reward Income,SOL,0.00255067,EUR,€22.731862856828647821,€0.05798,€0.08928,€0.0313029633788102,Received 0.00255067 SOL from Coinbase Rewards,,
aaa0000000000000000000004,2023-02-15 22:14:48 UTC,Buy,ADA,126.711086,EUR,€0.3768610991980342,€47.75248,€50.00,€2.24752084946335,Bought 126.711086 ADA for 50 EUR using Euro Wallet,,
aaa0000000000000000000005,2023-09-10 11:30:00 UTC,Sell,SOL,1.5,EUR,€20.00,€29.50,€30.00,€0.50,Sold 1.5 SOL,,
aaa0000000000000000000006,2023-08-01 09:06:57 UTC,Convert,XLM,-49.1542048,EUR,€0.13434213244883333824655,€6.26584,€6.43097,€0.1651325380040581575,Converted 49.1542048 XLM to 91.51829246 DOGE,,
aaa0000000000000000000007,2023-08-01 09:06:57 UTC,Convert,DOGE,91.51829246,EUR,€0.070335336056666669239,€6.43697,€6.43097,-€0.00599628370801600814888763794,Converted 49.1542048 XLM to 91.51829246 DOGE,,
aaa0000000000000000000008,2023-01-03 08:05:13 UTC,Deposit,EUR,300,EUR,€1.00,€300.00,€300.00,€0.00,Deposit from New Bank,,
aaa0000000000000000000009,2023-08-01 09:27:22 UTC,Receive,ADA,1055.15825,EUR,€0.2779047925934105,€293.23353,€293.23353,€0.00,Received 1055.15825 ADA from an external account,an external account,
aaa0000000000000000000010,2023-03-24 22:08:14 UTC,Retail Staking Transfer,SOL,35.500907945,EUR,€19.1233266836798784,€678.89546,€678.89546,€0.00,,,
aaa0000000000000000000011,2023-03-24 22:08:14 UTC,Retail Staking Transfer,SOL,-35.500907945,EUR,€19.1233266836798784,-€678.89546,-€678.89546,€0.00,,,
aaa0000000000000000000012,2022-05-15 14:30:00 UTC,Learning Reward,BTC,0.00001234,EUR,€28000.00,€0.34552,€0.34552,€0.00,Earned 0.00001234 BTC for completing a lesson,,
aaa0000000000000000000013,2025-01-10 10:00:00 UTC,Retail Eth2 Deprecation,ETH2,-0.5,EUR,€3000.00,-€1500.00,-€1500.00,€0.00,,,
aaa0000000000000000000014,2025-01-10 10:00:00 UTC,Retail Eth2 Deprecation,ETH,0.5,EUR,€3000.00,€1500.00,€1500.00,€0.00,,,
aaa0000000000000000000015,2022-06-10 15:00:00 UTC,Send,SOL,1.5,EUR,€20.00,€29.50,€29.50,€0.00,Sent 1.5 SOL to an external wallet,,
`;

// ---------------------------------------------------------------------------
// Expected parsed CoinbaseTransaction objects
// ---------------------------------------------------------------------------

export const EXPECTED_STAKING_SOL: CoinbaseTransaction = {
  id: 'aaa0000000000000000000001',
  date: '2023-12-30',
  time: '00:46:45',
  type: 'Staking Income',
  asset: 'SOL',
  quantityTransacted: 0.010379474,
  priceCurrency: 'EUR',
  priceAtTransaction: 96.314298,
  subtotal: 0.99969,
  total: 1.5389,
  fees: 0.539206596113556,
  notes: '',
};

export const EXPECTED_STAKING_ETH2: CoinbaseTransaction = {
  id: 'aaa0000000000000000000002',
  date: '2023-12-29',
  time: '16:02:00',
  type: 'Staking Income',
  asset: 'ETH2',
  quantityTransacted: 0.000328377742,
  priceCurrency: 'EUR',
  priceAtTransaction: 2104.436459464168,
  subtotal: 0.69105,
  total: 0.69105,
  fees: 0,
  notes: '',
};

export const EXPECTED_REWARD_SOL: CoinbaseTransaction = {
  id: 'aaa0000000000000000000003',
  date: '2023-07-21',
  time: '12:09:38',
  type: 'Reward Income',
  asset: 'SOL',
  quantityTransacted: 0.00255067,
  priceCurrency: 'EUR',
  priceAtTransaction: 22.73186285682865,
  subtotal: 0.05798,
  total: 0.08928,
  fees: 0.0313029633788102,
  notes: 'Received 0.00255067 SOL from Coinbase Rewards',
};

export const EXPECTED_BUY_ADA: CoinbaseTransaction = {
  id: 'aaa0000000000000000000004',
  date: '2023-02-15',
  time: '22:14:48',
  type: 'Buy',
  asset: 'ADA',
  quantityTransacted: 126.711086,
  priceCurrency: 'EUR',
  priceAtTransaction: 0.3768610991980342,
  subtotal: 47.75248,
  total: 50.0,
  fees: 2.24752084946335,
  notes: 'Bought 126.711086 ADA for 50 EUR using Euro Wallet',
};

export const EXPECTED_SELL_SOL: CoinbaseTransaction = {
  id: 'aaa0000000000000000000005',
  date: '2023-09-10',
  time: '11:30:00',
  type: 'Sell',
  asset: 'SOL',
  quantityTransacted: 1.5,
  priceCurrency: 'EUR',
  priceAtTransaction: 20.0,
  subtotal: 29.5,
  total: 30.0,
  fees: 0.5,
  notes: 'Sold 1.5 SOL',
};

/** Source side of the XLM→DOGE convert (negative quantity). */
export const EXPECTED_CONVERT_XLM: CoinbaseTransaction = {
  id: 'aaa0000000000000000000006',
  date: '2023-08-01',
  time: '09:06:57',
  type: 'Convert',
  asset: 'XLM',
  quantityTransacted: -49.1542048,
  priceCurrency: 'EUR',
  priceAtTransaction: 0.13434213244883333,
  subtotal: 6.26584,
  total: 6.43097,
  fees: 0.16513253800405817,
  notes: 'Converted 49.1542048 XLM to 91.51829246 DOGE',
};

/** Target side of the XLM→DOGE convert (positive quantity). */
export const EXPECTED_CONVERT_DOGE: CoinbaseTransaction = {
  id: 'aaa0000000000000000000007',
  date: '2023-08-01',
  time: '09:06:57',
  type: 'Convert',
  asset: 'DOGE',
  quantityTransacted: 91.51829246,
  priceCurrency: 'EUR',
  priceAtTransaction: 0.07033533605666667,
  subtotal: 6.43697,
  total: 6.43097,
  fees: 0.0059962837080160085,
  notes: 'Converted 49.1542048 XLM to 91.51829246 DOGE',
};

export const EXPECTED_DEPOSIT_EUR: CoinbaseTransaction = {
  id: 'aaa0000000000000000000008',
  date: '2023-01-03',
  time: '08:05:13',
  type: 'Deposit',
  asset: 'EUR',
  quantityTransacted: 300,
  priceCurrency: 'EUR',
  priceAtTransaction: 1.0,
  subtotal: 300.0,
  total: 300.0,
  fees: 0,
  notes: 'Deposit from New Bank',
};

export const EXPECTED_RECEIVE_ADA: CoinbaseTransaction = {
  id: 'aaa0000000000000000000009',
  date: '2023-08-01',
  time: '09:27:22',
  type: 'Receive',
  asset: 'ADA',
  quantityTransacted: 1055.15825,
  priceCurrency: 'EUR',
  priceAtTransaction: 0.2779047925934105,
  subtotal: 293.23353,
  total: 293.23353,
  fees: 0,
  notes: 'Received 1055.15825 ADA from an external account',
  senderAddress: 'an external account',
};

export const EXPECTED_SEND_SOL: CoinbaseTransaction = {
  id: 'aaa0000000000000000000015',
  date: '2022-06-10',
  time: '15:00:00',
  type: 'Send',
  asset: 'SOL',
  quantityTransacted: 1.5,
  priceCurrency: 'EUR',
  priceAtTransaction: 20.00,
  subtotal: 29.50,
  total: 29.50,
  fees: 0,
  notes: 'Sent 1.5 SOL to an external wallet',
};

export const EXPECTED_LEARNING_REWARD_BTC: CoinbaseTransaction = {
  id: 'aaa0000000000000000000012',
  date: '2022-05-15',
  time: '14:30:00',
  type: 'Learning Reward',
  asset: 'BTC',
  quantityTransacted: 0.00001234,
  priceCurrency: 'EUR',
  priceAtTransaction: 28000.00,
  subtotal: 0.34552,
  total: 0.34552,
  fees: 0,
  notes: 'Earned 0.00001234 BTC for completing a lesson',
};

/** ETH2-removal side of the Eth2 deprecation migration (negative quantity). */
export const EXPECTED_ETH2_DEPRECATION_ETH2: CoinbaseTransaction = {
  id: 'aaa0000000000000000000013',
  date: '2025-01-10',
  time: '10:00:00',
  type: 'Retail Eth2 Deprecation',
  asset: 'ETH2',
  quantityTransacted: -0.5,
  priceCurrency: 'EUR',
  priceAtTransaction: 3000.00,
  subtotal: 1500.00,
  total: 1500.00,
  fees: 0,
  notes: '',
};

/** ETH-credit side of the Eth2 deprecation migration (positive quantity). */
export const EXPECTED_ETH2_DEPRECATION_ETH: CoinbaseTransaction = {
  id: 'aaa0000000000000000000014',
  date: '2025-01-10',
  time: '10:00:00',
  type: 'Retail Eth2 Deprecation',
  asset: 'ETH',
  quantityTransacted: 0.5,
  priceCurrency: 'EUR',
  priceAtTransaction: 3000.00,
  subtotal: 1500.00,
  total: 1500.00,
  fees: 0,
  notes: '',
};

// ---------------------------------------------------------------------------
// Expected AccountTransactionRow output from toCoinbaseAccountTransactionRows
// ---------------------------------------------------------------------------

export const EXPECTED_ROW_STAKING_SOL: AccountTransactionRow = {
  date: '2023-12-30',
  time: '00:46',
  type: 'Dividend',
  value: 1.5389,
  shares: 0.010379474,
  securityName: 'SOL',
  tickerSymbol: 'SOL',
  transactionCurrency: 'EUR',
  fees: 0.539206596113556,
  note: 'aaa0000000000000000000001 | SOL',
};

export const EXPECTED_ROW_STAKING_SOL_BUY: AccountTransactionRow = {
  date: '2023-12-30',
  time: '00:46',
  type: 'Buy',
  value: 1.5389,
  shares: 0.010379474,
  securityName: 'SOL',
  tickerSymbol: 'SOL',
  transactionCurrency: 'EUR',
  fees: 0.539206596113556,
  note: 'aaa0000000000000000000001',
};

export const EXPECTED_ROW_STAKING_ETH2: AccountTransactionRow = {
  date: '2023-12-29',
  time: '16:02',
  type: 'Dividend',
  value: 0.69105,
  shares: 0.000328377742,
  securityName: 'Ethereum 2 (Staked)',
  tickerSymbol: 'ETH2',
  transactionCurrency: 'EUR',
  note: 'aaa0000000000000000000002 | ETH2',
};

export const EXPECTED_ROW_STAKING_ETH2_BUY: AccountTransactionRow = {
  date: '2023-12-29',
  time: '16:02',
  type: 'Buy',
  value: 0.69105,
  shares: 0.000328377742,
  securityName: 'Ethereum 2 (Staked)',
  tickerSymbol: 'ETH2',
  transactionCurrency: 'EUR',
  note: 'aaa0000000000000000000002',
};

export const EXPECTED_ROW_BUY_ADA: AccountTransactionRow = {
  date: '2023-02-15',
  time: '22:14',
  type: 'Buy',
  value: 50.0,
  shares: 126.711086,
  securityName: 'ADA',
  tickerSymbol: 'ADA',
  transactionCurrency: 'EUR',
  fees: 2.24752084946335,
  note: 'aaa0000000000000000000004 | Bought 126.711086 ADA for 50 EUR using Euro Wallet',
};

export const EXPECTED_ROW_SELL_SOL: AccountTransactionRow = {
  date: '2023-09-10',
  time: '11:30',
  type: 'Sell',
  value: 30.0,
  shares: 1.5,
  securityName: 'SOL',
  tickerSymbol: 'SOL',
  transactionCurrency: 'EUR',
  fees: 0.5,
  note: 'aaa0000000000000000000005 | Sold 1.5 SOL',
};

export const EXPECTED_ROW_CONVERT_XLM_SELL: AccountTransactionRow = {
  date: '2023-08-01',
  time: '09:06',
  type: 'Sell',
  value: 6.43097,
  shares: 49.1542048,
  securityName: 'XLM',
  tickerSymbol: 'XLM',
  transactionCurrency: 'EUR',
  fees: 0.16513253800405817,
  note: 'aaa0000000000000000000006 | Converted 49.1542048 XLM to 91.51829246 DOGE',
};

export const EXPECTED_ROW_CONVERT_DOGE_BUY: AccountTransactionRow = {
  date: '2023-08-01',
  time: '09:06',
  type: 'Buy',
  value: 6.43097,
  shares: 91.51829246,
  securityName: 'DOGE',
  tickerSymbol: 'DOGE',
  transactionCurrency: 'EUR',
  fees: 0.0059962837080160085,
  note: 'aaa0000000000000000000007 | Converted 49.1542048 XLM to 91.51829246 DOGE',
};

export const EXPECTED_ROW_DEPOSIT_EUR: AccountTransactionRow = {
  date: '2023-01-03',
  time: '08:05',
  type: 'Deposit',
  value: 300.0,
  transactionCurrency: 'EUR',
  note: 'aaa0000000000000000000008 | Deposit from New Bank',
};

/** Deposit row (first of the double-entry pair for Receive). */
export const EXPECTED_ROW_RECEIVE_ADA_DEPOSIT: AccountTransactionRow = {
  date: '2023-08-01',
  time: '09:27',
  type: 'Deposit',
  value: 293.23353,
  transactionCurrency: 'EUR',
  note: 'aaa0000000000000000000009 | Received 1055.15825 ADA from an external account',
};

/** Buy row (second of the double-entry pair for Receive). */
export const EXPECTED_ROW_RECEIVE_ADA: AccountTransactionRow = {
  date: '2023-08-01',
  time: '09:27',
  type: 'Buy',
  value: 293.23353, // subtotal (no fees for Receive)
  shares: 1055.15825,
  securityName: 'ADA',
  tickerSymbol: 'ADA',
  transactionCurrency: 'EUR',
  note: 'aaa0000000000000000000009 | Received 1055.15825 ADA from an external account',
};

export const EXPECTED_ROW_LEARNING_REWARD_BTC: AccountTransactionRow = {
  date: '2022-05-15',
  time: '14:30',
  type: 'Dividend',
  value: 0.34552,
  shares: 0.00001234,
  securityName: 'BTC',
  tickerSymbol: 'BTC',
  transactionCurrency: 'EUR',
  note: 'aaa0000000000000000000012 | BTC | Earned 0.00001234 BTC for completing a lesson',
};

export const EXPECTED_ROW_LEARNING_REWARD_BTC_BUY: AccountTransactionRow = {
  date: '2022-05-15',
  time: '14:30',
  type: 'Buy',
  value: 0.34552,
  shares: 0.00001234,
  securityName: 'BTC',
  tickerSymbol: 'BTC',
  transactionCurrency: 'EUR',
  note: 'aaa0000000000000000000012 | Earned 0.00001234 BTC for completing a lesson',
};

/** ETH2 depot removal — booked as Sell. */
export const EXPECTED_ROW_ETH2_DEPRECATION_SELL: AccountTransactionRow = {
  date: '2025-01-10',
  time: '10:00',
  type: 'Sell',
  value: 1500.00,
  shares: 0.5,
  securityName: 'Ethereum 2 (Staked)',
  tickerSymbol: 'ETH2',
  transactionCurrency: 'EUR',
  note: 'aaa0000000000000000000013',
};

/** ETH depot credit — booked as Buy. */
export const EXPECTED_ROW_ETH2_DEPRECATION_BUY: AccountTransactionRow = {
  date: '2025-01-10',
  time: '10:00',
  type: 'Buy',
  value: 1500.00,
  shares: 0.5,
  securityName: 'ETH',
  tickerSymbol: 'ETH',
  transactionCurrency: 'EUR',
  note: 'aaa0000000000000000000014',
};

/** Sell row (first of the double-entry pair for Send). */
export const EXPECTED_ROW_SEND_SOL_SELL: AccountTransactionRow = {
  date: '2022-06-10',
  time: '15:00',
  type: 'Sell',
  value: 29.50,
  shares: 1.5,
  securityName: 'SOL',
  tickerSymbol: 'SOL',
  transactionCurrency: 'EUR',
  note: 'aaa0000000000000000000015 | Sent 1.5 SOL to an external wallet',
};

/** Withdrawal row (second of the double-entry pair for Send). */
export const EXPECTED_ROW_SEND_SOL_WITHDRAWAL: AccountTransactionRow = {
  date: '2022-06-10',
  time: '15:00',
  type: 'Withdrawal',
  value: 29.50,
  transactionCurrency: 'EUR',
  note: 'aaa0000000000000000000015 | Sent 1.5 SOL to an external wallet',
};
