/**
 * Parser for comdirect "Ertragsgutschrift" (dividend / income distribution)
 * PDF text.
 *
 * Relevant sections in the normalised text (tabs → single space):
 *
 *   Ertragsgutschrift
 *   Depotbestand Wertpapier-Bezeichnung WKN/ISIN
 *   per 06.07.2021 LYX0CB Lyxor NEW ENERGY(DR)UCITS ETF
 *   STK 9,930 FR0010524777 Actions au Port.Dist o.N.
 *   Emissionsland: FRANKREICH
 *   EUR 0,13 Ausschüttung pro Stück für Geschäftsjahr …
 *   zahlbar ab 09.07.2021
 *   Abrechnung Ertragsgutschrift
 *   Bruttobetrag: EUR 1,29
 *   Verrechnungskonto (IBAN) Valuta Zu Ihren Gunsten vor Steuern
 *   DE67 2004 1111 0773 5590 00 EUR 09.07.2021 EUR 1,29
 *   Depotnr.: 7735590 00
 */

import type { ComdirectDividend } from './types.js';
import { parseGermanDate, parseGermanNumber } from './utils.js';

// ---------------------------------------------------------------------------
// Text normalisation
// ---------------------------------------------------------------------------

function normalizeText(raw: string): string {
  return raw
    .split('\n')
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .join('\n');
}

// ---------------------------------------------------------------------------
// Regex patterns (applied to normalised text)
// ---------------------------------------------------------------------------

const RX = {
  // Document-type guard
  ERTRAGSGUTSCHRIFT: /Ertragsgutschrift/,

  // Security block header signals what follows
  SEC_BLOCK_HEADER: /Depotbestand\s+Wertpapier-Bezeichnung\s+WKN\/ISIN/i,

  // "per DD.MM.YYYY <WKN> <name part 1>"
  PER_LINE: /^per\s+(\d{2}\.\d{2}\.\d{4})\s+([A-Z0-9]{6})\s+(.+)$/,

  // "STK <shares> <ISIN> <name part 2>"
  STK_LINE: /^STK\s+([\d.,]+)\s+([A-Z]{2}[A-Z0-9]{9}[0-9])\s*(.*)$/,

  // Amount per share: "EUR 0,13 Ausschüttung pro Stück …"
  PER_SHARE: /^([A-Z]{3})\s+([\d.,]+)\s+(?:Ausschüttung|Dividende|Ertrag|Zinsen)\s+pro\s+St/i,

  // Payment date: "zahlbar ab DD.MM.YYYY"
  PAYMENT_DATE: /zahlbar\s+ab\s+(\d{2}\.\d{2}\.\d{4})/i,

  // Gross amount: "Bruttobetrag: EUR 1,29"
  GROSS: /\bBruttobetrag\s*:\s*([A-Z]{3})\s+([\d.,]+)/,

  // IBAN line: "DE67 2004 … EUR DD.MM.YYYY EUR 1,29"
  IBAN_LINE: /(DE\d{2}(?:\s+\d+)+)\s+[A-Z]{3}\s+\d{2}\.\d{2}\.\d{4}\s+[A-Z]{3}\s+[\d.,]+/,

  // Depot number: "Depotnr.: 7735590 00"
  DEPOT: /Depotnr\.\s*:\s*([\d][\d\s]*[\d])/,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse text extracted from a comdirect "Ertragsgutschrift" PDF.
 *
 * @param rawText - Raw text as returned by `pdf-parse`.
 * @returns Parsed {@link ComdirectDividend}, or `null` when the text is not a
 *          recognised Ertragsgutschrift document.
 * @throws {Error} when the document is recognised but required fields cannot be extracted.
 */
export function parseComdirectDividendText(rawText: string): ComdirectDividend | null {
  const text = normalizeText(rawText);

  // Quick guard
  if (!RX.ERTRAGSGUTSCHRIFT.test(text)) return null;

  const lines = text.split('\n');

  // ── Security block ────────────────────────────────────────────────────────
  // Find the header line index, then grab the next two data lines.
  const headerIdx = lines.findIndex((l) => RX.SEC_BLOCK_HEADER.test(l));
  if (headerIdx === -1) {
    throw new Error('Could not locate "Depotbestand Wertpapier-Bezeichnung WKN/ISIN" block.');
  }

  const perLine = lines[headerIdx + 1] ?? '';
  const stkLine = lines[headerIdx + 2] ?? '';

  const perMatch = perLine.match(RX.PER_LINE);
  const stkMatch = stkLine.match(RX.STK_LINE);

  if (!perMatch || !stkMatch) {
    throw new Error('Could not parse security block from Ertragsgutschrift.');
  }

  const exDate = parseGermanDate(perMatch[1]!);
  const wkn = perMatch[2]!;
  const namePart1 = perMatch[3]!.trim();

  const shares = parseGermanNumber(stkMatch[1]!);
  const isin = stkMatch[2]!;
  const namePart2 = stkMatch[3]!.trim();

  const securityName = namePart2 ? `${namePart1} ${namePart2}`.trim() : namePart1;

  // ── Amount per share ──────────────────────────────────────────────────────
  let currency = 'EUR';
  let grossPerShare = 0;
  for (const line of lines) {
    const m = line.match(RX.PER_SHARE);
    if (m) {
      currency = m[1]!;
      grossPerShare = parseGermanNumber(m[2]!);
      break;
    }
  }

  // ── Payment date ──────────────────────────────────────────────────────────
  const paymentDateMatch = text.match(RX.PAYMENT_DATE);
  if (!paymentDateMatch) {
    throw new Error('Could not find payment date ("zahlbar ab") in Ertragsgutschrift.');
  }
  const paymentDate = parseGermanDate(paymentDateMatch[1]!)!;

  // ── Gross amount ──────────────────────────────────────────────────────────
  const grossMatch = text.match(RX.GROSS);
  if (!grossMatch) {
    throw new Error('Could not find Bruttobetrag in Ertragsgutschrift.');
  }
  const grossAmount = parseGermanNumber(grossMatch[2]!);

  // ── Cash account (IBAN) ───────────────────────────────────────────────────
  let cashAccount: string | undefined;
  const ibanMatch = text.match(RX.IBAN_LINE);
  if (ibanMatch) {
    cashAccount = ibanMatch[1]!.replace(/\s+/g, '');
  }

  // ── Depot (securities account) ────────────────────────────────────────────
  let securitiesAccount: string | undefined;
  const depotMatch = text.match(RX.DEPOT);
  if (depotMatch) {
    securitiesAccount = depotMatch[1]!.replace(/\s+/g, '');
  }

  return {
    paymentDate,
    ...(exDate !== undefined && { exDate }),
    securityName,
    isin,
    wkn,
    shares,
    grossPerShare,
    currency,
    grossAmount,
    ...(cashAccount !== undefined && { cashAccount }),
    ...(securitiesAccount !== undefined && { securitiesAccount }),
  };
}
