import type { DeGiroTransaction } from './types.js';
import { parseCsvText, parseDegiroDate, parseGermanNumber } from './utils.js';

/**
 * Fixed column indices for the DeGiro Transactions CSV export.
 *
 * The export uses a comma delimiter. Two columns have no header name (they
 * carry the currency code that accompanies the numeric columns before them):
 *   - Column 8:  currency of the execution price  ("Kurs" currency)
 *   - Column 10: currency of the local value       ("Wert in Lokalwährung" currency)
 *
 * Full header (0-indexed):
 *  0  Datum
 *  1  Uhrzeit
 *  2  Produkt
 *  3  ISIN
 *  4  Referenzbörse
 *  5  Ausführungsort
 *  6  Anzahl
 *  7  Kurs
 *  8  (unnamed – Kurs currency)
 *  9  Wert in Lokalwährung
 * 10  (unnamed – local currency)
 * 11  Wert EUR
 * 12  Wechselkurs
 * 13  AutoFX-Gebühr
 * 14  Transaktionsgebühren und/oder Fremdkosten
 * 15  Gesamt EUR
 * 16  Order-ID
 * 17  (unnamed – sometimes holds a second UUID)
 */
const COL = {
  DATUM: 0,
  UHRZEIT: 1,
  PRODUKT: 2,
  ISIN: 3,
  REFERENZ_BOERSE: 4,
  AUSFUEHRUNGS_ORT: 5,
  ANZAHL: 6,
  KURS: 7,
  KURS_WAEHRUNG: 8,
  WERT_LOKAL: 9,
  LOKAL_WAEHRUNG: 10,
  WERT_EUR: 11,
  WECHSELKURS: 12,
  AUTOFX_GEBUEHR: 13,
  TRANSAKTIONS_GEBUEHREN: 14,
  GESAMT_EUR: 15,
  ORDER_ID: 16,
  /** Extra unnamed column present on some rows (typically non-EUR), may carry the UUID. */
  EXTRA_UUID: 17,
} as const;

/** Return the trimmed value at `index`, or `undefined` if absent or empty. */
function optField(fields: string[], index: number): string | undefined {
  const val = fields[index]?.trim();
  return val !== undefined && val !== '' ? val : undefined;
}

/** Return the trimmed value at `index`, throwing if absent or empty. */
function reqField(fields: string[], index: number, name: string): string {
  const val = fields[index]?.trim();
  if (!val) {
    throw new Error(`Missing required field "${name}" at column ${index}`);
  }
  return val;
}

/**
 * Parse the contents of a DeGiro Transactions CSV export into an array of
 * {@link DeGiroTransaction} objects.
 *
 * DeGiro-specific quirks handled:
 * - Date format DD-MM-YYYY is converted to ISO 8601 (YYYY-MM-DD).
 * - Numbers use German locale formatting (comma decimal, dot thousands).
 * - The sign of the "Anzahl" (shares) field encodes buy vs. sell:
 *   negative = Sell, positive = Buy.
 * - All monetary amounts are stored as positive values; the transaction
 *   direction is captured in {@link DeGiroTransaction.type}.
 * - AutoFX and brokerage fees are reported as negative numbers in the CSV
 *   but stored as positive values in the result.
 * - Rows with all-empty fields (e.g. trailing newlines) are silently skipped.
 *
 * @param csvText - Raw UTF-8 content of the DeGiro Transactions.csv file.
 * @returns Array of parsed transactions, one per data row.
 * @throws If a required field is missing or cannot be parsed.
 */
export function parseDeGiroTransactionsCsv(csvText: string): DeGiroTransaction[] {
  const allRows = parseCsvText(csvText);
  if (allRows.length < 2) return [];

  // Skip the header row.
  // Also skip "continuation" rows DeGiro emits when a security name is too long to
  // fit on a single line: those rows have an empty Datum field (col 0) and carry
  // only a name fragment starting from col 2 (e.g. ",,CORP. V CLASS A,,,,…").
  const DATE_PATTERN = /^\d{2}-\d{2}-\d{4}$/;
  const dataRows = allRows
    .slice(1)
    .filter((row) => DATE_PATTERN.test(row[COL.DATUM]?.trim() ?? ''));

  return dataRows.map((fields, idx): DeGiroTransaction => {
    const rowNum = idx + 2; // 1-based row number relative to original file
    try {
      const rawAnzahl = reqField(fields, COL.ANZAHL, 'Anzahl');
      const anzahl = parseGermanNumber(rawAnzahl);
      const type = anzahl < 0 ? 'Sell' : 'Buy';
      const shares = Math.abs(anzahl);

      const rawKurs = reqField(fields, COL.KURS, 'Kurs');
      const pricePerShare = parseGermanNumber(rawKurs);

      const rawWertLokal = reqField(fields, COL.WERT_LOKAL, 'Wert in Lokalwährung');
      const valueLocal = Math.abs(parseGermanNumber(rawWertLokal));

      const rawWertEur = reqField(fields, COL.WERT_EUR, 'Wert EUR');
      const valueEur = Math.abs(parseGermanNumber(rawWertEur));

      const rawGesamtEur = reqField(fields, COL.GESAMT_EUR, 'Gesamt EUR');
      const totalEur = Math.abs(parseGermanNumber(rawGesamtEur));

      const rawWechselkurs = optField(fields, COL.WECHSELKURS);
      const exchangeRate = rawWechselkurs ? parseGermanNumber(rawWechselkurs) : undefined;

      const rawAutoFx = optField(fields, COL.AUTOFX_GEBUEHR);
      const autoFxFeeRaw = rawAutoFx ? parseGermanNumber(rawAutoFx) : undefined;
      // Store as positive; DeGiro reports fees as negative values
      const autoFxFee = autoFxFeeRaw !== undefined ? Math.abs(autoFxFeeRaw) : undefined;

      const rawTransFees = optField(fields, COL.TRANSAKTIONS_GEBUEHREN);
      const transFeesRaw = rawTransFees ? parseGermanNumber(rawTransFees) : undefined;
      const transactionFees = transFeesRaw !== undefined ? Math.abs(transFeesRaw) : undefined;

      const orderId = optField(fields, COL.ORDER_ID) || optField(fields, COL.EXTRA_UUID) || undefined;

      return {
        date: parseDegiroDate(reqField(fields, COL.DATUM, 'Datum')),
        time: reqField(fields, COL.UHRZEIT, 'Uhrzeit'),
        securityName: reqField(fields, COL.PRODUKT, 'Produkt'),
        isin: reqField(fields, COL.ISIN, 'ISIN'),
        referenceExchange: optField(fields, COL.REFERENZ_BOERSE) ?? '',
        executionVenue: optField(fields, COL.AUSFUEHRUNGS_ORT) ?? '',
        shares,
        pricePerShare,
        priceCurrency: reqField(fields, COL.KURS_WAEHRUNG, 'Kurs Währung'),
        valueLocal,
        localCurrency: reqField(fields, COL.LOKAL_WAEHRUNG, 'Lokal Währung'),
        valueEur,
        ...(exchangeRate !== undefined && { exchangeRate }),
        ...(autoFxFee !== undefined && { autoFxFee }),
        ...(transactionFees !== undefined && { transactionFees }),
        totalEur,
        ...(orderId !== undefined && { orderId }),
        type,
      };
    } catch (err) {
      throw new Error(
        `Row ${rowNum}: ${err instanceof Error ? err.message : String(err)}`,
        { cause: err },
      );
    }
  });
}
