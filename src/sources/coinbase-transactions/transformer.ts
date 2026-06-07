import type { CoinbaseTransaction } from './types.js';
import type { AccountTransactionRow } from '../../pp/types.js';

/**
 * Convert an array of {@link CoinbaseTransaction} objects into a single list of
 * Portfolio Performance "Account Transactions" rows suitable for a one-shot
 * import that covers both the cash account and the securities depot.
 *
 * PP's Account Transactions CSV updates *both* the cash account and the depot
 * whenever a row carries security information (ticker, shares) — so `Buy`,
 * `Sell`, and `Interest` rows work exactly like their Portfolio Transactions
 * counterparts while also recording the cash-account side.
 *
 * | Coinbase type              | PP type(s)           | Notes                                           |
 * |----------------------------|----------------------|-------------------------------------------------|
 * | `Buy`                      | `Buy`                | debits cash, adds shares to depot               |
 * | `Sell`                     | `Sell`               | credits cash, removes shares from depot         |
 * | `Convert` (qty > 0)        | `Buy`                | target side of the crypto swap                  |
 * | `Convert` (qty < 0)        | `Sell`               | source side of the crypto swap                  |
 * | `Staking Income`            | `Dividend` + `Buy`   | Dividend credits cash; Buy reinvests into depot |
 * | `Reward Income`             | `Dividend` + `Buy`   | same double-entry as staking                    |
 * | `Learning Reward`           | `Dividend` + `Buy`   | Coinbase Learn/Earn; treated like reward income |
 * | `Receive`                   | `Deposit` + `Buy`    | on-chain inbound: Deposit offsets Buy, net cash = 0 |
 * | `Send`                      | `Sell` + `Withdrawal`| on-chain outbound: Withdrawal offsets Sell, net cash = 0 |
 * | `Deposit`                   | `Deposit`            | fiat deposit to cash account                    |
 * | `Withdrawal`                | `Withdrawal`         | fiat withdrawal from cash account               |
 * | `Retail Staking Transfer`   | *(skipped)*          | internal Coinbase rebalancing; no cost basis    |
 * | `Retail Eth2 Deprecation`   | `Sell` or `Buy`      | ETH2→ETH migration; negative qty = Sell, positive = Buy |
 */
export function toCoinbaseAccountTransactionRows(
  transactions: CoinbaseTransaction[],
): AccountTransactionRow[] {
  const rows: AccountTransactionRow[] = [];

  for (const tx of transactions) {
    switch (tx.type) {
      case 'Buy':
      case 'Sell': {
        rows.push(buildSecurityRow(tx, tx.type, Math.abs(tx.quantityTransacted), tx.total));
        break;
      }
      case 'Convert':
      case 'Retail Eth2 Deprecation': {
        // Positive quantity = target asset (Buy); negative = source asset (Sell).
        const side = tx.quantityTransacted > 0 ? 'Buy' : 'Sell';
        rows.push(buildSecurityRow(tx, side, Math.abs(tx.quantityTransacted), tx.total));
        break;
      }
      case 'Staking Income':
      case 'Reward Income':
      case 'Learning Reward': {
        // Double-entry: Dividend credits the cash account with the EUR value of
        // the reward; the paired Buy immediately reinvests it into the depot.
        // Using Dividend (not Interest) lets PP group all staking income by
        // crypto currency in the dividend report.
        // The note always includes the asset ticker so users can filter in PP.
        const stakingNote = buildStakingNote(tx.id, tx.notes, tx.asset);
        rows.push({ ...buildSecurityRow(tx, 'Dividend', Math.abs(tx.quantityTransacted), tx.total), note: stakingNote });
        rows.push(buildSecurityRow(tx, 'Buy', Math.abs(tx.quantityTransacted), tx.total));
        break;
      }
      case 'Receive': {
        // On-chain inbound transfer — add shares at market value (subtotal) with
        // no cash impact. Double-entry: a Deposit first credits cash, then the
        // paired Buy immediately debits it, leaving the cash account at net 0.
        // Without the Deposit, the Buy alone would create a phantom cash debit
        // for EUR that was never actually spent.
        const receiveValue = Math.abs(tx.subtotal);
        const receiveNote = buildNote(tx.id, tx.notes);
        rows.push({
          date: tx.date,
          time: tx.time.substring(0, 5),
          type: 'Deposit',
          value: receiveValue,
          transactionCurrency: tx.priceCurrency,
          note: receiveNote,
        });
        rows.push(buildSecurityRow(tx, 'Buy', Math.abs(tx.quantityTransacted), receiveValue));
        break;
      }
      case 'Send': {
        // On-chain outbound transfer — remove shares at market value (subtotal)
        // with no cash impact. Double-entry: the Sell first credits cash, then
        // the paired Withdrawal immediately debits it, leaving net 0.
        // Without the Withdrawal, the Sell alone would create a phantom cash
        // credit for EUR that was never actually received.
        const sendValue = Math.abs(tx.subtotal);
        rows.push(buildSecurityRow(tx, 'Sell', Math.abs(tx.quantityTransacted), sendValue));
        rows.push({
          date: tx.date,
          time: tx.time.substring(0, 5),
          type: 'Withdrawal',
          value: sendValue,
          transactionCurrency: tx.priceCurrency,
          note: buildNote(tx.id, tx.notes),
        });
        break;
      }
      case 'Deposit': {
        rows.push({
          date: tx.date,
          time: tx.time.substring(0, 5),
          type: 'Deposit',
          value: tx.total,
          transactionCurrency: tx.priceCurrency,
          note: buildNote(tx.id, tx.notes),
        });
        break;
      }
      case 'Withdrawal': {
        rows.push({
          date: tx.date,
          time: tx.time.substring(0, 5),
          type: 'Withdrawal',
          value: tx.total,
          transactionCurrency: tx.priceCurrency,
          note: buildNote(tx.id, tx.notes),
        });
        break;
      }
      // Retail Staking Transfer → skip (internal Coinbase rebalancing)
      default:
        break;
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build an account transaction row that references a security (Buy/Sell/Dividend). */
import type { AccountTransactionType } from '../../pp/types.js';

function buildSecurityRow(
  tx: CoinbaseTransaction,
  type: AccountTransactionType,
  shares: number,
  value: number,
): AccountTransactionRow {
  return {
    date: tx.date,
    time: tx.time.substring(0, 5), // HH:MM
    type,
    value,
    shares,
    securityName: assetName(tx.asset),
    tickerSymbol: tx.asset,
    transactionCurrency: tx.priceCurrency,
    ...(tx.fees > 0 && { fees: tx.fees }),
    note: buildNote(tx.id, tx.notes),
  };
}

/**
 * Map a Coinbase asset ticker to a human-readable security name for PP.
 * ETH2 is expanded to "Ethereum 2 (Staked)" to clarify it represents staked ETH.
 */
function assetName(ticker: string): string {
  if (ticker === 'ETH2') return 'Ethereum 2 (Staked)';
  return ticker;
}

/** Build the note string: always includes the Coinbase transaction ID. */
function buildNote(id: string, notes: string): string {
  return notes ? `${id} | ${notes}` : id;
}

/** Build the note string for staking/reward Dividend rows, including the asset ticker. */
function buildStakingNote(id: string, notes: string, asset: string): string {
  const parts: string[] = [id, asset];
  if (notes) parts.push(notes);
  return parts.join(' | ');
}
