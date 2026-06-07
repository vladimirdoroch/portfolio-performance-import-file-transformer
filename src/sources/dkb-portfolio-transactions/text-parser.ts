/**
 * Parser for DKB Darlehen (loan) annual account statement PDFs.
 *
 * Two PDF layout variants are supported:
 *
 * **Old format** ("JAHRESKONTOAUSZUG", used up to ~2022):
 *   - Columns: `Datum  Erläuterungen  Wert  Betrag`
 *   - Amount ends with `+` (credit) or `-` (debit).
 *   - Value date is given as `DD.MM` (year inferred from booking date).
 *   - Example line:  `15.03.2022 Darlehenszins 15.03 102,50-`
 *
 * **New format** ("Jahreskontoauszug für den Zeitraum", used from ~2024):
 *   - Columns: `Datum  Erläuterung  Betrag Soll EUR  Betrag Haben EUR`
 *   - Amount has a leading minus for debits; credits are unsigned.
 *   - Value date optionally appended as `/ Wert: DD.MM.YYYY`.
 *   - Example line:  `14.06.2024 Darlehenszins / Wert: 15.06.2024 -70,34`
 */

import type { DkbDarlehenEntry, DkbDarlehenEntryType, DkbDarlehenStatement, DkbStatementFormat } from './types.js';
import { normalizeText, parseGermanDate, parseGermanNumber } from './utils.js';

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

function detectFormat(text: string): DkbStatementFormat | null {
  // Check the more specific new-format phrase first so that the case-insensitive
  // old-format check below does not accidentally match the new-format heading.
  if (/Jahreskontoauszug\s+für\s+den\s+Zeitraum/i.test(text)) return 'new';
  // Old format uses "JAHRESKONTOAUSZUG" as a standalone all-caps heading line.
  if (/^JAHRESKONTOAUSZUG$/m.test(text)) return 'old';
  return null;
}

// ---------------------------------------------------------------------------
// Description → entry type mapping
// ---------------------------------------------------------------------------

function inferType(description: string): DkbDarlehenEntryType {
  const d = description.toLowerCase();
  if (d.startsWith('darlehensauszahlung')) return 'Darlehensauszahlung';
  if (d.startsWith('darlehensleistung'))   return 'Darlehensleistung';
  if (d.startsWith('darlehenszins'))       return 'Darlehenszins';
  if (d.startsWith('dauerauftrag'))        return 'Dauerauftrag';
  if (d.startsWith('sondertilgung'))       return 'Sondertilgung';
  if (d.startsWith('verzugszins'))         return 'Verzugszins';
  if (d.startsWith('storno'))              return 'Storno';
  if (d.startsWith('sonstige lastschrift'))return 'sonstige Lastschrift';
  if (d.startsWith('überweisung'))         return 'Überweisung';
  return 'other';
}

// ---------------------------------------------------------------------------
// Old format parser
// ---------------------------------------------------------------------------

// Transaction line:  DD.MM.YYYY  <description>  DD.MM  <amount>[+|-]
// The value date column is only DD.MM (year = booking year).
const RX_OLD_LINE = /^(\d{2}\.\d{2}\.\d{4})\s+(.+?)\s+(\d{2}\.\d{2})\s+([\d.]+,\d{2})([+-])$/;

// Opening balance:  "Kontostand in EUR am DD.MM.YYYY  <amount>[+|-]"
const _RX_OLD_OPEN_BALANCE = /Kontostand\s+in\s+EUR\s+am\s+(\d{2}\.\d{2}\.\d{4})\s+([\d.]+,\d{2})([+-])/i;

// Closing balance:  same pattern
const RX_OLD_CLOSE_BALANCE = /Kontostand\s+in\s+EUR\s+am\s+(\d{2}\.\d{2}\.\d{4})\s+([\d.]+,\d{2})([+-])/gi;

// Statement period: "DD.MM.YYYY - DD.MM.YYYY" on the JAHRESKONTOAUSZUG section
const RX_OLD_PERIOD = /JAHRESKONTOAUSZUG\s*\n(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/i;

// Account number:  "Darlehen <number>"
const RX_ACCOUNT = /Darlehen\s+(\d+)/;

// IBAN in old format:  "IBAN: <iban-with-spaces>"
const RX_OLD_IBAN = /IBAN:\s*(DE\d{2}(?:\s+\d+)+)/i;

function parseOldFormat(text: string): DkbDarlehenStatement {
  // Period
  const periodMatch = RX_OLD_PERIOD.exec(text);
  if (!periodMatch) throw new Error('DKB old format: cannot find statement period');
  const periodStart = parseGermanDate(periodMatch[1]!);
  const periodEnd   = parseGermanDate(periodMatch[2]!);

  // Account number
  const accountMatch = RX_ACCOUNT.exec(text);
  if (!accountMatch) throw new Error('DKB old format: cannot find loan account number');
  const accountNumber = accountMatch[1]!;

  // IBAN (remove spaces)
  const ibanMatch = RX_OLD_IBAN.exec(text);
  if (!ibanMatch) throw new Error('DKB old format: cannot find IBAN');
  const iban = ibanMatch[1]!.replace(/\s+/g, '');

  // Balances: first match = opening, last match = closing
  const allBalances = [...text.matchAll(RX_OLD_CLOSE_BALANCE)];
  if (allBalances.length < 1) throw new Error('DKB old format: cannot find balance lines');
  const firstBalance = allBalances[0]!;
  const lastBalance  = allBalances[allBalances.length - 1]!;

  const openAmt  = parseGermanNumber(firstBalance[2]!);
  const openSign = firstBalance[3] === '+' ? 1 : -1;
  const openingBalance = openSign * openAmt;

  const closeAmt  = parseGermanNumber(lastBalance[2]!);
  const closeSign = lastBalance[3] === '+' ? 1 : -1;
  const closingBalance = closeSign * closeAmt;

  // Transaction entries
  const entries: DkbDarlehenEntry[] = [];
  for (const line of text.split('\n')) {
    if (/Kontostand/i.test(line)) continue; // skip balance lines

    const m = RX_OLD_LINE.exec(line.trim());
    if (!m) continue;

    const [, bookingRaw, description, valueDayMonth, amountRaw, sign] = m;
    const bookingDate = parseGermanDate(bookingRaw!);

    // Value date: DD.MM, year taken from booking date
    const bookingYear = bookingRaw!.slice(6); // "YYYY"
    const [vDay, vMonth] = valueDayMonth!.split('.');
    const valueDate = `${bookingYear}-${vMonth}-${vDay}`;

    const absAmount = parseGermanNumber(amountRaw!);
    const amount    = sign === '+' ? absAmount : -absAmount;

    entries.push({
      bookingDate,
      valueDate,
      description: description!.trim(),
      type: inferType(description!.trim()),
      amount,
    });
  }

  return { accountNumber, iban, periodStart, periodEnd, openingBalance, closingBalance, entries, format: 'old' };
}

// ---------------------------------------------------------------------------
// New format parser
// ---------------------------------------------------------------------------

// Transaction line:  DD.MM.YYYY  <description>[ / Wert: DD.MM.YYYY]  [-]<amount>
const RX_NEW_LINE =
  /^(\d{2}\.\d{2}\.\d{4})\s+(.*?)(?:\s*\/\s*Wert:\s*(\d{2}\.\d{2}\.\d{4}))?\s+(-?[\d.]+,\d{2})$/;

// Opening / closing balance:  "Kontostand am DD.MM.YYYY  [-]<amount>"
const RX_NEW_BALANCE = /Kontostand\s+am\s+(\d{2}\.\d{2}\.\d{4})\s+(-?[\d.]+,\d{2})/gi;

// Statement period:  "Jahreskontoauszug für den Zeitraum DD.MM.YYYY - DD.MM.YYYY"
const RX_NEW_PERIOD =
  /Jahreskontoauszug\s+für\s+den\s+Zeitraum\s+(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/i;

// Account + IBAN on the same line:  "Darlehen <number>, <iban-with-spaces>[,...]"
// Use [ ]+ (space only, not \s) so the greedy digit groups cannot cross a newline.
const RX_NEW_ACCOUNT_LINE =
  /Darlehen\s+(\d+),\s*(DE\d{2}(?:[ ]+\d+)+)/i;

function parseNewFormat(text: string): DkbDarlehenStatement {
  // Period
  const periodMatch = RX_NEW_PERIOD.exec(text);
  if (!periodMatch) throw new Error('DKB new format: cannot find statement period');
  const periodStart = parseGermanDate(periodMatch[1]!);
  const periodEnd   = parseGermanDate(periodMatch[2]!);

  // Account number + IBAN
  const accountLineMatch = RX_NEW_ACCOUNT_LINE.exec(text);
  if (!accountLineMatch) throw new Error('DKB new format: cannot find account/IBAN line');
  const accountNumber = accountLineMatch[1]!;
  const iban          = accountLineMatch[2]!.replace(/\s+/g, '');

  // Balances: first match = opening, last match = closing
  const allBalances = [...text.matchAll(RX_NEW_BALANCE)];
  if (allBalances.length < 1) throw new Error('DKB new format: cannot find balance lines');
  const firstBalance = allBalances[0]!;
  const lastBalance  = allBalances[allBalances.length - 1]!;
  const openingBalance = parseGermanNumber(firstBalance[2]!);
  const closingBalance = parseGermanNumber(lastBalance[2]!);

  // Transaction entries
  const entries: DkbDarlehenEntry[] = [];
  for (const line of text.split('\n')) {
    if (/Kontostand/i.test(line)) continue; // skip balance lines

    const m = RX_NEW_LINE.exec(line.trim());
    if (!m) continue;

    const [, bookingRaw, descriptionRaw, valueDateRaw, amountRaw] = m;
    const bookingDate = parseGermanDate(bookingRaw!);
    const valueDate   = valueDateRaw ? parseGermanDate(valueDateRaw) : bookingDate;
    const amount      = parseGermanNumber(amountRaw!);
    const description = descriptionRaw!.trim();

    entries.push({
      bookingDate,
      valueDate,
      description,
      type: inferType(description),
      amount,
    });
  }

  return { accountNumber, iban, periodStart, periodEnd, openingBalance, closingBalance, entries, format: 'new' };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse text extracted from a DKB Darlehen annual account statement PDF.
 *
 * Supports both the old layout (up to ~2022, "JAHRESKONTOAUSZUG") and the
 * new layout (from ~2024, "Jahreskontoauszug für den Zeitraum").
 *
 * @param rawText - Raw text content returned by a PDF extractor.
 * @returns Parsed {@link DkbDarlehenStatement}, or `null` when the document
 *          is not a recognised DKB Darlehen statement.
 * @throws {Error} when the document matches a known format but required
 *         fields cannot be extracted.
 */
export function parseDkbDarlehenText(rawText: string): DkbDarlehenStatement | null {
  const text = normalizeText(rawText);
  const format = detectFormat(text);

  if (format === null) return null;
  if (format === 'old') return parseOldFormat(text);
  return parseNewFormat(text);
}
