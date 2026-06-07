/**
 * All transaction types that appear in a Coinbase CSV export.
 *
 * - `Buy`                    – Fiat-to-crypto purchase
 * - `Sell`                   – Crypto-to-fiat sale
 * - `Convert`                – Crypto-to-crypto swap (comes in pairs: negative source + positive
 *                              target row sharing the same timestamp)
 * - `Deposit`                – Fiat or crypto deposit from an external account
 * - `Withdrawal`             – Fiat or crypto withdrawal to an external account
 * - `Receive`                – Inbound transfer from an external crypto address
 * - `Send`                   – Outbound transfer to an external crypto address
 * - `Staking Income`         – Staking reward credited in crypto
 * - `Reward Income`          – Coinbase-promotional or on-chain reward credited in crypto
 * - `Learning Reward`        – Crypto earned via Coinbase Learn/Earn; treated like a reward
 * - `Retail Staking Transfer`– Internal rebalancing movement when Coinbase moves staked
 *                              assets between internal accounts; appears as paired +/− rows
 *                              and carries no tax or cost-basis implications.
 * - `Retail Eth2 Deprecation`– Coinbase ETH2→ETH migration; paired rows like Convert
 *                              (negative qty = ETH2 removed, positive qty = ETH credited)
 */
export type CoinbaseTransactionType =
  | 'Buy'
  | 'Sell'
  | 'Convert'
  | 'Deposit'
  | 'Withdrawal'
  | 'Receive'
  | 'Send'
  | 'Staking Income'
  | 'Reward Income'
  | 'Learning Reward'
  | 'Retail Staking Transfer'
  | 'Retail Eth2 Deprecation';

/**
 * Intermediate representation of a single row from a Coinbase
 * "Standard CSV" transaction export (downloadable from
 * https://accounts.coinbase.com/statements).
 *
 * All monetary values are stored as positive numbers; negative quantities for
 * `Convert` source rows are preserved in {@link quantityTransacted}.
 */
export interface CoinbaseTransaction {
  /** Coinbase internal transaction ID. */
  id: string;
  /** Trade date in YYYY-MM-DD format. */
  date: string;
  /** Trade time in HH:MM:SS format. */
  time: string;
  /** Transaction type as reported by Coinbase. */
  type: CoinbaseTransactionType;
  /**
   * Ticker symbol of the asset, e.g. `"SOL"`, `"ETH2"`, `"ADA"`, `"EUR"`.
   * ETH2 is used for staked Ether on Coinbase.
   */
  asset: string;
  /**
   * Number of units transacted.  For `Convert` source rows this is negative;
   * for all other types it is positive.
   */
  quantityTransacted: number;
  /** ISO 4217 currency code used for all monetary fields, e.g. `"EUR"`. */
  priceCurrency: string;
  /** Market price per unit of {@link asset} in {@link priceCurrency} at the time of the transaction. */
  priceAtTransaction: number;
  /** Gross transaction value (quantity × price) before fees, in {@link priceCurrency}. Always positive. */
  subtotal: number;
  /** Total transaction value inclusive of fees and spread, in {@link priceCurrency}. Always positive. */
  total: number;
  /** Fees and/or spread charged, in {@link priceCurrency}. Always ≥ 0. */
  fees: number;
  /** Free-text description provided by Coinbase (e.g. "Bought 2.5 SOL for 50 EUR using Euro Wallet"). */
  notes: string;
  /** Sending address for on-chain transfers, if present. */
  senderAddress?: string;
  /** Receiving address for on-chain transfers, if present. */
  recipientAddress?: string;
}
