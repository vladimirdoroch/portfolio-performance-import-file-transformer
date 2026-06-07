import type { DkbDarlehenEntry, DkbDarlehenEntryType, DkbDarlehenStatement } from './types.js';
import type { AccountTransactionRow, AccountTransactionType } from '../../pp/types.js';

/**
 * Maps a DKB Darlehen entry type to the corresponding Portfolio Performance
 * Account Transaction type.
 *
 * | DKB entry type      | PP Account Transaction type |
 * |---------------------|-----------------------------|
 * | Darlehensauszahlung | Transfer (Outbound)         |
 * | Darlehensleistung   | Deposit                     |
 * | Darlehenszins       | Interest Charge             |
 * | Dauerauftrag        | Deposit                     |
 * | Sondertilgung       | Deposit                     |
 * | Verzugszins         | Interest Charge             |
 * | Storno              | Withdrawal                  |
 * | (others, positive)  | Deposit                     |
 * | (others, negative)  | Withdrawal                  |
 */
const ENTRY_TYPE_MAP: Partial<Record<DkbDarlehenEntryType, AccountTransactionType>> = {
  Darlehensauszahlung: 'Transfer (Outbound)',
  Darlehensleistung: 'Deposit',
  Darlehenszins: 'Interest Charge',
  Dauerauftrag: 'Deposit',
  Sondertilgung: 'Deposit',
  Verzugszins: 'Interest Charge',
  Storno: 'Withdrawal',
};

function toAccountTransactionType(entry: DkbDarlehenEntry): AccountTransactionType {
  return ENTRY_TYPE_MAP[entry.type] ?? (entry.amount >= 0 ? 'Deposit' : 'Withdrawal');
}

/**
 * Convert a parsed {@link DkbDarlehenStatement} into an array of
 * {@link AccountTransactionRow} objects for the Portfolio Performance
 * "Account Transactions" CSV import.
 *
 * Each entry is emitted with the semantically correct transaction type rather
 * than the generic Delivery model. Storno entries are kept and mapped to
 * Withdrawal so that PP can reflect the reversal naturally.
 *
 * | DKB entry type      | PP type             | Meaning                      |
 * |---------------------|---------------------|------------------------------|
 * | Darlehensauszahlung | Transfer (Outbound) | Initial loan disbursement    |
 * | Dauerauftrag        | Deposit             | Regular standing-order repay |
 * | Sondertilgung       | Deposit             | Extra / special repayment    |
 * | Darlehensleistung   | Deposit             | Regular repayment (old fmt)  |
 * | Darlehenszins       | Interest Charge     | Regular loan interest        |
 * | Verzugszins         | Interest Charge     | Late-payment interest        |
 * | Storno              | Withdrawal          | Reversal of a prior entry    |
 *
 * @param statement - Parsed DKB Darlehen statement.
 * @returns Array of account transaction rows, one per entry.
 */
export function toDarlehenAccountTransactionRows(
  statement: DkbDarlehenStatement,
): AccountTransactionRow[] {
  return statement.entries.map((entry): AccountTransactionRow => ({
    date: entry.valueDate,
    type: toAccountTransactionType(entry),
    value: Math.abs(entry.amount),
    transactionCurrency: 'EUR',
    cashAccount: statement.iban,
    note: entry.description,
  }));
}
