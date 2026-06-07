import type { CoinbaseTransaction, CoinbaseTransactionType } from './types.js';

// ---------------------------------------------------------------------------
// Column indices for the Coinbase CSV data rows
// (rows after the 3-line header block)
// ---------------------------------------------------------------------------
//  0  ID
//  1  Timestamp           "YYYY-MM-DD HH:MM:SS UTC"
//  2  Transaction Type
//  3  Asset               ticker symbol
//  4  Quantity Transacted  may be negative for Convert source rows
//  5  Price Currency       e.g. "EUR"
//  6  Price at Transaction "€1234.56" or "€0.123456789…"
//  7  Subtotal             "€47.75" or "-€678.89"
//  8  Total (inclusive of fees and/or spread)
//  9  Fees and/or Spread   "€2.24" or "-€0.005…"
// 10  Notes
// 11  Sender Address
// 12  Recipient Address

const COL = {
  ID: 0,
  TIMESTAMP: 1,
  TYPE: 2,
  ASSET: 3,
  QUANTITY: 4,
  PRICE_CURRENCY: 5,
  PRICE: 6,
  SUBTOTAL: 7,
  TOTAL: 8,
  FEES: 9,
  NOTES: 10,
  SENDER: 11,
  RECIPIENT: 12,
} as const;

/** Known transaction types from the Coinbase CSV. */
const KNOWN_TYPES = new Set<string>([
  'Buy',
  'Sell',
  'Convert',
  'Deposit',
  'Withdrawal',
  'Receive',
  'Send',
  'Staking Income',
  'Reward Income',
  'Learning Reward',
  'Retail Staking Transfer',
  'Retail Eth2 Deprecation',
]);

/**
 * Strip the leading `€` (or `-€`) from a Coinbase monetary string and parse
 * it as a floating-point number.  The sign is preserved.
 *
 * Examples:
 *   "€96.314298"                → 96.314298
 *   "-€0.00599628370801600814" → -0.005996...
 *   "€0.00"                    → 0
 */
function parseCoinbaseAmount(raw: string): number {
  const trimmed = raw.trim();
  const normalized = trimmed.replace(/^-€/, '-').replace(/^€/, '');
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) {
    throw new TypeError(`Cannot parse Coinbase amount: "${raw}"`);
  }
  return value;
}

/**
 * Parse the Coinbase "Standard CSV" transaction export into an array of
 * {@link CoinbaseTransaction} objects.
 *
 * The export file begins with three metadata lines:
 *   1. `Transactions`
 *   2. `User,<name>,<uuid>`
 *   3. Column headers
 *
 * Data rows follow from line 4 onward.
 *
 * @param csvText - Raw CSV file content as a UTF-8 string.
 * @returns Array of parsed transactions (empty array if the file contains no
 *          data rows).
 * @throws {Error} If a data row has an unexpected format or an unrecognised
 *         transaction type.
 */
export function parseCoinbaseCsv(csvText: string): CoinbaseTransaction[] {
  const lines = csvText.split(/\r?\n/);

  // Skip the three-line header block (metadata + column header row).
  // The column header row starts with "ID,".
  let dataStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.trimStart().startsWith('ID,')) {
      dataStartIndex = i + 1;
      break;
    }
  }

  if (dataStartIndex === -1) {
    throw new Error('Coinbase CSV: could not locate the header row starting with "ID,".');
  }

  const transactions: CoinbaseTransaction[] = [];

  for (let lineIdx = dataStartIndex; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]?.trim() ?? '';
    if (line === '') continue;

    const fields = splitCsvLine(line);

    const rawType = fields[COL.TYPE]?.trim() ?? '';
    if (!KNOWN_TYPES.has(rawType)) {
      throw new Error(
        `Coinbase CSV line ${lineIdx + 1}: unknown transaction type "${rawType}".`,
      );
    }
    const type = rawType as CoinbaseTransactionType;

    const rawTimestamp = (fields[COL.TIMESTAMP] ?? '').trim();
    // Timestamp format: "YYYY-MM-DD HH:MM:SS UTC"
    const tsPattern = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s+UTC$/;
    const tsParts = tsPattern.exec(rawTimestamp);
    if (!tsParts) {
      throw new TypeError(
        `Coinbase CSV line ${lineIdx + 1}: cannot parse timestamp "${rawTimestamp}".`,
      );
    }
    const date = tsParts[1] ?? '';
    const time = tsParts[2] ?? '';

    const quantity = Number.parseFloat((fields[COL.QUANTITY] ?? '').trim());
    if (Number.isNaN(quantity)) {
      throw new TypeError(
        `Coinbase CSV line ${lineIdx + 1}: cannot parse quantity "${fields[COL.QUANTITY]}".`,
      );
    }

    const subtotalRaw = (fields[COL.SUBTOTAL] ?? '').trim();
    const totalRaw = (fields[COL.TOTAL] ?? '').trim();
    const feesRaw = (fields[COL.FEES] ?? '').trim();

    const subtotal = Math.abs(parseCoinbaseAmount(subtotalRaw));
    const total = Math.abs(parseCoinbaseAmount(totalRaw));
    const fees = Math.abs(parseCoinbaseAmount(feesRaw));

    const sender = (fields[COL.SENDER] ?? '').trim() || undefined;
    const recipient = (fields[COL.RECIPIENT] ?? '').trim() || undefined;

    transactions.push({
      id: (fields[COL.ID] ?? '').trim(),
      date,
      time,
      type,
      asset: (fields[COL.ASSET] ?? '').trim(),
      quantityTransacted: quantity,
      priceCurrency: (fields[COL.PRICE_CURRENCY] ?? '').trim(),
      priceAtTransaction: Math.abs(parseCoinbaseAmount((fields[COL.PRICE] ?? '').trim())),
      subtotal,
      total,
      fees,
      notes: (fields[COL.NOTES] ?? '').trim(),
      ...(sender !== undefined && { senderAddress: sender }),
      ...(recipient !== undefined && { recipientAddress: recipient }),
    });
  }

  return transactions;
}

/**
 * Split a single CSV line into fields, respecting RFC 4180 double-quote
 * escaping.  Commas inside quoted fields are treated as literal characters.
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i] ?? '';
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}
