import type { AccountBookingRow } from './types.js';
import {
  classifyBookingType,
  parseCsvText,
  parseDegiroDate,
  parseGermanNumber,
} from './utils.js';

/**
 * Fixed column indices for the DEGIRO Account.csv export.
 *
 * The file uses a comma delimiter and has 12 columns, two of which are
 * unnamed (they hold the currency code for the adjacent numeric column):
 *
 *  0  Datum
 *  1  Uhrze(it)          (header truncated in the export)
 *  2  Valutadatum
 *  3  Produkt
 *  4  ISIN
 *  5  Beschreibung
 *  6  FX                 (exchange rate, German decimal; empty if not applicable)
 *  7  Änderung           (change currency, e.g. "EUR", "USD")
 *  8  (unnamed)          (change amount, German decimal, signed; empty for bank-entry rows)
 *  9  Saldo              (balance currency)
 * 10  (unnamed)          (balance amount, German decimal)
 * 11  Order-ID           (UUID; empty for non-trade rows)
 */
const COL = {
  DATE: 0,
  TIME: 1,
  VALUE_DATE: 2,
  PRODUCT: 3,
  ISIN: 4,
  DESCRIPTION: 5,
  FX: 6,
  CHANGE_CURRENCY: 7,
  CHANGE_AMOUNT: 8,
  BALANCE_CURRENCY: 9,
  BALANCE: 10,
  ORDER_ID: 11,
} as const;

/** Return trimmed value or `undefined` when absent / empty. */
function opt(fields: string[], index: number): string | undefined {
  const v = fields[index]?.trim();
  return v !== undefined && v !== '' ? v : undefined;
}

/** Return trimmed value, throwing when absent or empty. */
function req(fields: string[], index: number, name: string): string {
  const v = fields[index]?.trim();
  if (!v) throw new Error(`Missing required field "${name}" at column ${index}`);
  return v;
}

/**
 * Parse the contents of a DEGIRO Account.csv export into an array of
 * {@link AccountBookingRow} objects.
 *
 * The rows are returned in the same order as they appear in the file
 * (newest first, as DEGIRO exports them).
 *
 * DEGIRO-specific quirks handled:
 * - Date format DD-MM-YYYY converted to ISO 8601.
 * - Numbers use German locale (comma decimal, dot thousands separator).
 * - "FlatexWithdrawal" and "FlatexTransfer" rows have no change currency /
 *   amount columns — only the balance column is populated.
 * - AKTIENSPLIT rows carry the split direction in the sign of changeAmount;
 *   a positive value is reclassified as `StockSplitCredit`.
 *
 * @param csvText - Raw CSV file contents as a string.
 * @returns Parsed rows, header excluded.
 */
export function parseAccountCsv(csvText: string): AccountBookingRow[] {
  const rows = parseCsvText(csvText);
  if (rows.length === 0) return [];

  // Skip the header row
  const dataRows = rows.slice(1);
  const result: AccountBookingRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const fields = dataRows[i];
    if (!fields) continue;

    // Skip completely blank lines (parseCsvText emits [] for an empty line)
    if (fields.length === 0 || (fields.length === 1 && (fields[0] ?? '').trim() === '')) continue;
    // Skip rows where the date column is empty (e.g. ,,,,,,,,,,, separator rows)
    if (!fields[COL.DATE]?.trim()) continue;

    try {
      const description = req(fields, COL.DESCRIPTION, 'Beschreibung');
      let bookingType = classifyBookingType(description);

      const changeCurrency = opt(fields, COL.CHANGE_CURRENCY);
      const changeAmountRaw = opt(fields, COL.CHANGE_AMOUNT);
      const changeAmount = changeAmountRaw !== undefined
        ? parseGermanNumber(changeAmountRaw)
        : undefined;

      // Refine AKTIENSPLIT direction from the sign of the change amount
      if (bookingType === 'StockSplitDebit' && changeAmount !== undefined && changeAmount > 0) {
        bookingType = 'StockSplitCredit';
      }

      const fxRaw = opt(fields, COL.FX);
      const fxRate = fxRaw !== undefined ? parseGermanNumber(fxRaw) : undefined;

      const product = opt(fields, COL.PRODUCT);
      const isin = opt(fields, COL.ISIN);
      const orderId = opt(fields, COL.ORDER_ID);

      result.push({
        date: parseDegiroDate(req(fields, COL.DATE, 'Datum')),
        time: req(fields, COL.TIME, 'Uhrzeit'),
        valueDate: parseDegiroDate(req(fields, COL.VALUE_DATE, 'Valutadatum')),
        ...(product !== undefined && { product }),
        ...(isin !== undefined && { isin }),
        description,
        bookingType,
        ...(fxRate !== undefined && { fxRate }),
        ...(changeCurrency !== undefined && { changeCurrency }),
        ...(changeAmount !== undefined && { changeAmount }),
        balanceCurrency: req(fields, COL.BALANCE_CURRENCY, 'Saldo (Währung)'),
        balance: parseGermanNumber(req(fields, COL.BALANCE, 'Saldo')),
        ...(orderId !== undefined && { orderId }),
      });
    } catch (err) {
      throw new Error(
        `Failed to parse Account.csv row ${i + 2}: ${(err as Error).message}`,
        { cause: err },
      );
    }
  }

  return result;
}
