/** Intermediate representation of a parsed comdirect "Ertragsgutschrift" dividend notification PDF. */
export interface ComdirectDividend {
  /** Payment date in YYYY-MM-DD format (from "zahlbar ab DD.MM.YYYY"). */
  paymentDate: string;
  /** Record / ex-distribution date in YYYY-MM-DD format (from "per DD.MM.YYYY"). */
  exDate?: string;
  /** Security name (merged from the two name lines in the PDF). */
  securityName: string;
  /** ISIN, 12 characters. */
  isin?: string;
  /** WKN, 6-character alphanumeric code. */
  wkn?: string;
  /** Number of shares held at the ex-date. */
  shares: number;
  /** Gross income per share in {@link currency}. */
  grossPerShare: number;
  /** ISO 4217 currency code of the payment, e.g. `'EUR'`. */
  currency: string;
  /** Total gross income amount (Bruttobetrag) in {@link currency}. */
  grossAmount: number;
  /** IBAN of the cash settlement account, if present. */
  cashAccount?: string;
  /** Depot number (securities account), if present. */
  securitiesAccount?: string;
}
