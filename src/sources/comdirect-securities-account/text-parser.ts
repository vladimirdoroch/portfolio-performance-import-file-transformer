/**
 * Parser for comdirect "Wertpapier-Abrechnung" (trade confirmation) PDF text.
 *
 * Actual comdirect PDFs use TAB characters between columns.  After normalising
 * tabs and multiple spaces to a single space, the first page looks like:
 *
 *   GESCHÄFTSABRECHNUNG VOM 08.03.2021
 *   Wertpapierkauf
 *   Geschäftstag : 08.03.2021 Abwicklung : Live Trading
 *   Handelszeit : 10:53 Uhr (MEZ/MESZ)
 *   Wertpapier-Bezeichnung WPKNR/ISIN
 *   Tesla Inc. A1CX3T
 *   Registered Shares DL-,001 US88160R1014
 *   Nennwert Zum Kurs von
 *   St. 10 EUR 474,80
 *   Kurswert : EUR 4.748,00
 *   IBAN Valuta Zu Ihren Lasten vor Steuern
 *   DE67 2004 1111 0773 5590 00 EUR 10.03.2021 EUR 4.764,77
 *   Depotnr.: 7735590 00
 *
 * For backward compatibility the older "Wertpapier-Abrechnung: Kauf" layout
 * (used in older exports) is also supported.
 */

import type { ComdirectTransaction } from './types.js';
import { parseGermanDate, parseGermanNumber } from './utils.js';

// ---------------------------------------------------------------------------
// Text normalisation
// ---------------------------------------------------------------------------

/**
 * Collapse runs of tabs and spaces within each line to a single space and
 * trim leading/trailing whitespace per line.  Newlines are preserved.
 */
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
  // Transaction type (new + old format)
  BUY:  /(?:Wertpapier-Abrechnung:\s*Kauf|\bWertpapierkauf\b)/,
  SELL: /(?:Wertpapier-Abrechnung:\s*Verkauf|\bWertpapierverkauf\b)/,

  // Security block: new format (WPKNR/ISIN header)
  // Captures two data lines: [name + WKN] and [description + ISIN]
  SEC_BLOCK_NEW: /Wertpapier-Bezeichnung\s+WPKNR\/ISIN\s*\n([^\n]+)\n([^\n]*)/i,
  // Split name and WKN (last 6-char alphanumeric token) from the name+WKN line
  NAME_AND_WKN: /^(.*?)\s+([A-Z0-9]{6})\s*$/,
  // ISIN (12-char code) anchored to end of a line
  ISIN_AT_END: /([A-Z]{2}[A-Z0-9]{9}[0-9])\s*$/,

  // Security block: old format (WERTPAPIER header)
  SEC_BLOCK_OLD: /Wertpapier-Bezeichnung(?:.*WERTPAPIER)?\s*\n([\s\S]*?)(?=\nISIN)/i,
  ISIN_LABELED:  /\bISIN\s+([A-Z]{2}[A-Z0-9]{9}[0-9])/,
  WKN_LABELED:   /\bWKN\s+([A-Z0-9]{6})\b/,

  // Shares + currency + price: new format "St. 10 EUR 474,80"
  SHARES_NEW: /\bSt\.\s+([\d.,]+)\s+([A-Z]{3})\s+([\d.,]+)/,
  // Old format: separate "Stück 2,0000" and "Kurs EUR 950,0000"
  SHARES_OLD: /\bStück\s+([\d.,]+)/,
  PRICE_OLD:  /\bKurs\s+([A-Z]{3})\s+([\d.,]+)/,

  // Kurswert (both formats)
  TOTAL_VALUE: /\bKurswert\s*:?\s*([A-Z]{3})\s+([\d.,]+)/,

  // Trade date (both formats)
  TRADE_DATE: /(?:Geschäftstag|Handelstag)\s*:?\s*(\d{2}\.\d{2}\.\d{4})/,

  // Trade time (optional, both formats)
  TRADE_TIME: /Handelszeit\s*:?\s*(\d{2}:\d{2})\s*Uhr/,

  // IBAN + valuta date on same line (new format)
  IBAN_VALUTA: /(DE\d{2}(?:\s+\d+)+)\s+[A-Z]{3}\s+(\d{2}\.\d{2}\.\d{4})/,

  // Settlement date + cash account (old format)
  SETTLEMENT_DATE_OLD: /\bBuchungstag\s+(\d{2}\.\d{2}\.\d{4})/,
  CASH_ACCOUNT_OLD:    /Verrechnungskonto\s*:\s*([A-Z]{2}[\d\s]{10,34})/,

  // Depot / securities account
  DEPOT_NEW: /Depotnr(?:ummer)?\.?\s*:\s*([\d][\d\s]*[\d])/,
  DEPOT_OLD: /\bDepot\s+([\d]+)/,
  // Fee section: lines between the Kurswert line and the IBAN / Buchungstag line.
  // Each fee line has the form "<label> : <CURRENCY> <amount>".
  FEE_SECTION: /\bKurswert\b[^\n]*\n([\s\S]*?)(?=\bIBAN\b|\bBuchungstag\b|$)/,};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse text extracted from a comdirect "Wertpapier-Abrechnung" PDF.
 *
 * @param text - Raw text content returned by a PDF extractor.
 * @returns Parsed {@link ComdirectTransaction}, or `null` when the document is
 *          not a recognised comdirect trade confirmation.
 * @throws {Error} when the document looks like a trade confirmation but required
 *         fields cannot be found.
 */
export function parseComdirectText(text: string): ComdirectTransaction | null {
  const norm = normalizeText(text);

  const isBuy  = RX.BUY.test(norm);
  const isSell = RX.SELL.test(norm);

  if (!isBuy && !isSell) {
    return null;
  }

  const type = isBuy ? ('buy' as const) : ('sell' as const);

  const security = extractSecurity(norm);
  if (!security.name) {
    throw new Error('Could not extract security name from PDF text');
  }

  const { shares, currency, pricePerShare } = extractSharesAndPrice(norm);

  const valueMatch = RX.TOTAL_VALUE.exec(norm);
  if (!valueMatch?.[2]) {
    throw new Error('Could not extract total value (Kurswert) from PDF text');
  }
  const totalValue = parseGermanNumber(valueMatch[2]);

  const tradeDateMatch = RX.TRADE_DATE.exec(norm);
  if (!tradeDateMatch?.[1]) {
    throw new Error('Could not extract trade date (Geschäftstag/Handelstag) from PDF text');
  }
  const tradeDate = parseGermanDate(tradeDateMatch[1]);

  const tradeTime = RX.TRADE_TIME.exec(norm)?.[1];

  const { settlementDate, cashAccount } = extractSettlementAndCash(norm);
  const securitiesAccount = extractDepot(norm);
  const fees = extractFees(norm);

  return {
    type,
    securityName: security.name,
    ...(security.isin !== undefined && { isin: security.isin }),
    ...(security.wkn  !== undefined && { wkn:  security.wkn  }),
    shares,
    pricePerShare,
    currency,
    totalValue,
    ...(fees             !== undefined && { fees             }),
    tradeDate,
    ...(tradeTime         !== undefined && { tradeTime         }),
    ...(settlementDate    !== undefined && { settlementDate    }),
    ...(cashAccount       !== undefined && { cashAccount       }),
    ...(securitiesAccount !== undefined && { securitiesAccount }),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface SecurityInfo {
  name: string | null;
  wkn?: string;
  isin?: string;
}

function extractSecurity(text: string): SecurityInfo {
  // New format: "Wertpapier-Bezeichnung WPKNR/ISIN" header
  const newBlock = RX.SEC_BLOCK_NEW.exec(text);
  if (newBlock?.[1] && newBlock[2] !== undefined) {
    const nameLine = newBlock[1];
    const isinLine = newBlock[2];
    const nameWknMatch = RX.NAME_AND_WKN.exec(nameLine);
    const name = (nameWknMatch?.[1] ?? nameLine).trim() || null;
    const wkn  = nameWknMatch?.[2];
    const isin = RX.ISIN_AT_END.exec(isinLine)?.[1];
    return { name, ...(wkn !== undefined && { wkn }), ...(isin !== undefined && { isin }) };
  }

  // Old format: "Wertpapier-Bezeichnung WERTPAPIER" header
  const oldBlock = RX.SEC_BLOCK_OLD.exec(text);
  if (oldBlock?.[1]) {
    const firstLine = oldBlock[1].split('\n').map((l) => l.trim()).find((l) => l.length > 0);
    const isin = RX.ISIN_LABELED.exec(text)?.[1];
    const wkn  = RX.WKN_LABELED.exec(text)?.[1];
    return {
      name: firstLine ?? null,
      ...(isin !== undefined && { isin }),
      ...(wkn  !== undefined && { wkn  }),
    };
  }

  return { name: null };
}

interface SharesAndPrice {
  shares: number;
  currency: string;
  pricePerShare: number;
}

function extractSharesAndPrice(text: string): SharesAndPrice {
  // New format: "St. 10 EUR 474,80"
  const newMatch = RX.SHARES_NEW.exec(text);
  if (newMatch?.[1] && newMatch[2] && newMatch[3]) {
    return {
      shares:        parseGermanNumber(newMatch[1]),
      currency:      newMatch[2],
      pricePerShare: parseGermanNumber(newMatch[3]),
    };
  }

  // Old format: "Stück 2,0000" + "Kurs EUR 950,0000"
  const sharesMatch = RX.SHARES_OLD.exec(text);
  const priceMatch  = RX.PRICE_OLD.exec(text);
  if (!sharesMatch?.[1]) {
    throw new Error('Could not extract shares (St./Stück) from PDF text');
  }
  if (!priceMatch?.[1] || !priceMatch[2]) {
    throw new Error('Could not extract price (Kurs) from PDF text');
  }
  return {
    shares:        parseGermanNumber(sharesMatch[1]),
    currency:      priceMatch[1],
    pricePerShare: parseGermanNumber(priceMatch[2]),
  };
}

interface SettlementAndCash {
  settlementDate?: string;
  cashAccount?: string;
}

function extractSettlementAndCash(text: string): SettlementAndCash {
  // New format: German IBAN + currency + date on one line
  const ibanMatch = RX.IBAN_VALUTA.exec(text);
  if (ibanMatch?.[1] && ibanMatch[2]) {
    return {
      cashAccount:    ibanMatch[1].replace(/\s+/g, ''),
      settlementDate: parseGermanDate(ibanMatch[2]),
    };
  }

  // Old format
  const dateRaw = RX.SETTLEMENT_DATE_OLD.exec(text)?.[1];
  const cashRaw = RX.CASH_ACCOUNT_OLD.exec(text)?.[1];
  return {
    ...(dateRaw && { settlementDate: parseGermanDate(dateRaw) }),
    ...(cashRaw && { cashAccount: cashRaw.trim().replace(/\s+/g, '') }),
  };
}

function extractDepot(text: string): string | undefined {
  const newMatch = RX.DEPOT_NEW.exec(text);
  if (newMatch?.[1]) {
    return newMatch[1].trim().replace(/\s+/g, '');
  }
  return RX.DEPOT_OLD.exec(text)?.[1]?.trim();
}

/**
 * Sum all fee amounts listed between the Kurswert line and the IBAN/Buchungstag
 * line.  Each fee line has the form "<label> : <CURRENCY> <amount>".
 *
 * Returns `undefined` when no fee lines are present (i.e. commission-free trade).
 */
function extractFees(text: string): number | undefined {
  const sectionMatch = RX.FEE_SECTION.exec(text);
  if (!sectionMatch?.[1]?.trim()) return undefined;

  const section = sectionMatch[1];
  const matches = [...section.matchAll(/:\s*[A-Z]{3}\s+([\d.,]+)/g)];
  if (matches.length === 0) return undefined;

  const total = matches.reduce((sum, m) => sum + parseGermanNumber(m[1]!), 0);
  return Math.round(total * 100) / 100;
}
