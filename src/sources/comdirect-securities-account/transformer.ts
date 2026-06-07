import type { ComdirectTransaction } from './types.js';
import type { PortfolioTransactionRow } from '../../pp/types.js';

/**
 * Convert a parsed {@link ComdirectTransaction} into a
 * {@link PortfolioTransactionRow} that can be written to a Portfolio Performance
 * "Portfolio Transactions" import CSV.
 *
 * Mapping:
 * - date                ← transaction.tradeDate
 * - type                ← 'Buy' | 'Sell'  (from transaction.type)
 * - shares              ← transaction.shares
 * - value               ← transaction.totalValue  (Kurswert, fees excluded)
 * - securityName        ← transaction.securityName
 * - isin                ← transaction.isin
 * - wkn                 ← transaction.wkn
 * - transactionCurrency ← transaction.currency
 * - time                ← transaction.tradeTime
 * - fees                ← transaction.fees  (Provision + Entgelte, if present)
 * - cashAccount         ← transaction.cashAccount
 * - securitiesAccount   ← transaction.securitiesAccount
 */
export function toPortfolioTransactionRow(
  transaction: ComdirectTransaction,
): PortfolioTransactionRow {
  return {
    date: transaction.tradeDate,
    type: transaction.type === 'buy' ? 'Buy' : 'Sell',
    shares: transaction.shares,
    value: transaction.totalValue,
    ...(transaction.securityName && { securityName: transaction.securityName }),
    ...(transaction.isin !== undefined && { isin: transaction.isin }),
    ...(transaction.wkn !== undefined && { wkn: transaction.wkn }),
    ...(transaction.currency && { transactionCurrency: transaction.currency }),
    ...(transaction.fees !== undefined && { fees: transaction.fees }),
    ...(transaction.tradeTime !== undefined && { time: transaction.tradeTime }),
    ...(transaction.cashAccount !== undefined && { cashAccount: transaction.cashAccount }),
    ...(transaction.securitiesAccount !== undefined && {
      securitiesAccount: transaction.securitiesAccount,
    }),
  };
}
