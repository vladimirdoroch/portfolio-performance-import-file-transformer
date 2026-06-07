import type { BookingType } from './types.js';
// Re-export shared helpers from the degiro-transactions plugin
export { parseCsvText, parseDegiroDate, parseGermanNumber } from '../degiro-transactions/utils.js';

/**
 * Mapping from raw Beschreibung values (or regex patterns) to BookingType.
 *
 * Order matters: more specific patterns must come before broader ones.
 */
const DESCRIPTION_PATTERNS: ReadonlyArray<[pattern: string | RegExp, type: BookingType]> = [
  // Securities trades
  [/^FUSION:\s*Kauf/i,              'FusionBuy'],
  [/^FUSION:\s*Verkauf/i,           'FusionSell'],
  [/^DELISTING:\s*Kauf/i,           'DelistingBuy'],
  [/^DELISTING:\s*Verkauf/i,        'DelistingSell'],
  [/^KAPITALERHÖHUNG:\s*Kauf/i,    'CapitalIncreaseBuy'],
  [/^KAPITALERHÖHUNG:\s*Verkauf/i, 'CapitalIncreaseSell'],
  [/^AKTIENSPLIT:/i,                'StockSplitDebit'],   // refined to Credit/Debit by sign in parser
  [/^Kauf\s+/,                      'Buy'],
  [/^Verkauf\s+/,                   'Sell'],

  // FX conversion
  ['Währungswechsel (Ausbuchung)', 'FxDebit'],
  ['Währungswechsel (Einbuchung)', 'FxCredit'],

  // Dividends
  ['ADR/GDR Weitergabegebühr',    'AdrFee'],
  ['Dividendensteuer',            'DividendTax'],
  ['Dividende',                   'Dividend'],

  // Fees
  ['DEGIRO Transaktionsgebühren und/oder Fremdkosten', 'TransactionFee'],
  [/^Einrichtung von Handelsmodalitäten/,             'MarketAccessFee'],
  ['SOFORT Zahlungsgebühr',                           'PaymentFee'],

  // Cash
  ['flatex Einzahlung',                  'FlatexDeposit'],
  [/Soforteinzahlung|SOFORT Einzahlung/i, 'InstantDeposit'],
  [/^Reservation /,                       'PaymentReservation'],
  [/^Auszahlung von Ihrem Geldkonto/, 'FlatexWithdrawal'],
  [/^Überweisung auf Ihr Geldkonto/,  'FlatexTransfer'],
  ['Degiro Cash Sweep Transfer', 'CashSweep'],
  [/^Einzahlung$/,               'Deposit'],

  // Interest
  ['Flatex Interest Income', 'InterestIncome'],
  [/^Flatex Interest$/i,     'InterestCharge'],
  [/^Zinsen$/,               'InterestCharge'],

  // Money market fund (DEGIRO automatic cash management)
  [/^Geldmarktfonds Preisänderung/,         'MoneyMarketPriceChange'],
  [/^Geldmarktfonds Umwandlung:\s*Kauf/,    'MoneyMarketBuy'],
  [/^Geldmarktfonds Umwandlung:\s*Verkauf/, 'MoneyMarketSell'],
];

/**
 * Classify a raw Beschreibung string into a {@link BookingType}.
 *
 * AKTIENSPLIT rows are initially classified as 'StockSplitDebit'; the caller
 * is responsible for upgrading them to 'StockSplitCredit' when changeAmount > 0.
 */
export function classifyBookingType(description: string): BookingType {
  for (const [pattern, type] of DESCRIPTION_PATTERNS) {
    if (typeof pattern === 'string') {
      if (description === pattern || description.startsWith(pattern)) return type;
    } else {
      if (pattern.test(description)) return type;
    }
  }
  return 'Unknown';
}

/**
 * Parse the trade-fill description and extract quantity, price, currency.
 *
 * Handles all variants:
 *   "Kauf 268 zu je 41,4 USD (US46222L1089)"
 *   "Verkauf 700 zu je 8,1001 USD (US81642T2096)"
 *   "FUSION: Kauf 4.600 zu je 1,98 USD (US4869171078)"
 *   "FUSION: Verkauf 4.600 zu je 1,98 USD (CA09173B1076)"
 *   "DELISTING: Verkauf 11 zu je 0 USD (US090RGT0361)"
 *   "KAPITALERHÖHUNG: Kauf 20 zu je 48,73 USD (US4869171078)"
 *
 * Returns `undefined` when the description does not match the pattern.
 */
export function parseTradeFillDescription(description: string): {
  shares: number;
  pricePerShare: number;
  currency: string;
  isin: string;
} | undefined {
  // Strip optional corporate-action prefix then match the common pattern
  const stripped = description.replace(/^(?:FUSION|DELISTING|KAPITALERHÖHUNG):\s*/i, '');
  const match = stripped.match(
    /^(?:Kauf|Verkauf)\s+([\d.,]+)\s+zu je\s+([\d.,]+)\s+(\w+)\s+\(([A-Z0-9]+)\)/i,
  );
  if (!match) return undefined;

  const sharesStr = match[1];
  const priceStr = match[2];
  const currency = match[3];
  const isin = match[4];
  if (!sharesStr || !priceStr || !currency || !isin) return undefined;

  return {
    shares: parseGermanNumberLocal(sharesStr),
    pricePerShare: parseGermanNumberLocal(priceStr),
    currency,
    isin,
  };
}

/**
 * Parse an AKTIENSPLIT description to extract share count and currency.
 *
 * Format: "AKTIENSPLIT: N SecurityName zu je P CUR (ISIN)"
 * Example: "AKTIENSPLIT: 15 Tesla Inc zu je 442,68 USD (US88160R1014)"
 *
 * Returns `undefined` when the description does not match the pattern.
 */
export function parseStockSplitDescription(description: string): {
  shares: number;
  currency: string;
} | undefined {
  const match = description.match(/^AKTIENSPLIT:\s*([\d.,]+)\s+.+?\s+zu je\s+[\d.,]+\s+(\w+)/i);
  if (!match) return undefined;
  const sharesStr = match[1];
  const currency = match[2];
  if (!sharesStr || !currency) return undefined;
  return { shares: parseGermanNumberLocal(sharesStr), currency };
}

/**
 * Parse the market-access-fee description and extract the exchange name and year.
 *
 * "Einrichtung von Handelsmodalitäten 2026 (Nasdaq - NDQ)"
 */
export function parseMarketAccessFeeDescription(description: string): {
  year: number;
  exchange: string;
} | undefined {
  const match = description.match(/Handelsmodalitäten\s+(\d{4})\s+\((.+)\)/);
  if (!match) return undefined;
  const yearStr = match[1];
  const exchange = match[2];
  if (!yearStr || !exchange) return undefined;
  return { year: parseInt(yearStr, 10), exchange };
}

// local helper — avoids a circular import before the shared util is in scope
function parseGermanNumberLocal(value: string): number {
  const normalized = value.trim().replace(/\.(?=\d{3})/g, '').replace(',', '.');
  return parseFloat(normalized);
}
