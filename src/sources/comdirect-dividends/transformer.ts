import type { ComdirectDividend } from './types.js';
import type { AccountTransactionRow } from '../../pp/types.js';

/**
 * Convert a parsed {@link ComdirectDividend} into a
 * {@link AccountTransactionRow} suitable for Portfolio Performance's
 * "Account Transactions" CSV import with `type: 'Dividend'`.
 *
 * The `value` field carries the gross distribution amount (Bruttobetrag).
 * Any withholding taxes are documented on a separate Steuermitteilung issued
 * by comdirect and should be entered separately in PP if desired.
 */
export function toDividendAccountTransactionRow(dividend: ComdirectDividend): AccountTransactionRow {
  return {
    date: dividend.paymentDate,
    type: 'Dividend',
    value: dividend.grossAmount,
    shares: dividend.shares,
    transactionCurrency: dividend.currency,
    ...(dividend.isin !== undefined && { isin: dividend.isin }),
    ...(dividend.wkn !== undefined && { wkn: dividend.wkn }),
    ...(dividend.securityName && { securityName: dividend.securityName }),
    ...(dividend.cashAccount !== undefined && { cashAccount: dividend.cashAccount }),
    ...(dividend.securitiesAccount !== undefined && { securitiesAccount: dividend.securitiesAccount }),
  };
}
