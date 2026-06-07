import type { DeGiroTransaction } from './types.js';
import type { PortfolioTransactionRow } from '../../pp/types.js';

/**
 * Convert a parsed {@link DeGiroTransaction} into a
 * {@link PortfolioTransactionRow} suitable for Portfolio Performance's
 * "Portfolio Transactions" CSV import.
 *
 * For non-EUR securities the cross-currency fields are populated so that
 * Portfolio Performance can show the original trade value alongside the EUR
 * settlement amount. Note that DeGiro's `Wechselkurs` is quoted as
 * `foreign per EUR` (e.g. 1.1696 USD = 1 EUR), whereas Portfolio Performance
 * expects `EUR per foreign` — the inverse. The transformer inverts the rate
 * automatically.
 *
 * Mapping:
 *
 * | PP field              | DeGiro source                                                    |
 * |-----------------------|------------------------------------------------------------------|
 * | date                  | transaction.date          (already YYYY-MM-DD)                   |
 * | time                  | transaction.time          (HH:MM)                                |
 * | type                  | transaction.type          ('Buy' | 'Sell')                        |
 * | shares                | transaction.shares        (always positive)                      |
 * | value                 | transaction.valueEur      (abs share value in EUR)               |
 * | transactionCurrency   | "EUR"                     (DeGiro settles in EUR)                |
 * | grossAmount           | transaction.valueLocal    (only for non-EUR securities)          |
 * | currencyGrossAmount   | transaction.localCurrency (only for non-EUR securities)          |
 * | exchangeRate          | 1 / transaction.exchangeRate  (inverted; non-EUR only)           |
 * | fees                  | autoFxFee + transactionFees (both in EUR, summed)                |
 * |                       |   → only emitted when the sum is > 0                            |
 * | securityName          | transaction.securityName                                         |
 * | isin                  | transaction.isin                                                 |
 * | note                  | transaction.orderId       (DeGiro Order-ID)                      |
 */
export function toPortfolioTransactionRow(
  transaction: DeGiroTransaction,
): PortfolioTransactionRow {
  const totalFees = (transaction.autoFxFee ?? 0) + (transaction.transactionFees ?? 0);
  const isCrossCurrency =
    transaction.localCurrency !== 'EUR' && transaction.exchangeRate !== undefined;

  return {
    date: transaction.date,
    time: transaction.time,
    type: transaction.type,
    shares: transaction.shares,
    value: transaction.valueEur,
    transactionCurrency: 'EUR',
    ...(isCrossCurrency && {
      grossAmount: transaction.valueLocal,
      currencyGrossAmount: transaction.localCurrency,
      // PP exchangeRate = EUR/foreign = 1 / DeGiro Wechselkurs (foreign/EUR)
      exchangeRate: 1 / transaction.exchangeRate!,
    }),
    ...(totalFees > 0 && { fees: totalFees }),
    securityName: transaction.securityName,
    isin: transaction.isin,
    ...(transaction.orderId && { note: transaction.orderId }),
  };
}
