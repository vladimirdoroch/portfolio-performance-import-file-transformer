/** Fields for the Portfolio Performance "Securities Account" (Wertpapierkonto) import type. */
export interface SecuritiesAccountRow {
  /** Required: Number of shares purchased. */
  shares: number;
  /** Required: Total transaction value (not Shares × Quote, but the actual settlement amount). */
  value: number;
  /** Optional: Ticker symbol of the security. */
  tickerSymbol?: string;
  /** Optional: ISIN (International Securities Identification Number). */
  isin?: string;
  /** Optional: Human-readable security name. */
  securityName?: string;
  /** Optional: WKN (Wertpapierkennnummer, German security identifier). */
  wkn?: string;
  /** Optional: ISO 4217 currency code (e.g. "EUR", "USD"). */
  currency?: string;
  /** Optional: Free-form note. */
  note?: string;
  /** Optional: Date the quote price was recorded, in YYYY-MM-DD format. */
  dateOfQuote?: string;
  /** Optional: Quote price per share on dateOfQuote. */
  quote?: number;
  /** Optional: Settlement / value date in YYYY-MM-DD format. */
  dateOfValue?: string;
  /** Optional: Time of transaction in HH:mm format. */
  time?: string;
  /** Optional: Cash account name or IBAN. */
  cashAccount?: string;
  /** Optional: Securities / depot account name or number. */
  securitiesAccount?: string;
}

/** Mapping from SecuritiesAccountRow property keys to Portfolio Performance CSV column headers. */
export const PP_CSV_HEADERS = {
  shares: 'Shares',
  value: 'Value',
  tickerSymbol: 'Ticker Symbol',
  isin: 'ISIN',
  securityName: 'Security Name',
  wkn: 'WKN',
  currency: 'Currency',
  note: 'Note',
  dateOfQuote: 'Date of Quote',
  quote: 'Quote',
  dateOfValue: 'Date of Value',
  time: 'Time',
  cashAccount: 'Cash Account',
  securitiesAccount: 'Securities Account',
} as const satisfies Record<keyof SecuritiesAccountRow, string>;

// ---------------------------------------------------------------------------
// Portfolio Transactions import type
// ---------------------------------------------------------------------------

/** Allowed values for the Type field in a Portfolio Performance Portfolio Transactions CSV. */
export type PortfolioTransactionType =
  | 'Buy'
  | 'Sell'
  | 'Delivery (Inbound)'
  | 'Delivery (Outbound)'
  | 'Transfer (Inbound)'
  | 'Transfer (Outbound)';

/** Fields for the Portfolio Performance "Portfolio Transactions" import type. */
export interface PortfolioTransactionRow {
  /** Required: Trade date in YYYY-MM-DD format. */
  date: string;
  /** Required: Total transaction value (net, after fees and taxes). */
  value: number;
  /** Required: Number of shares traded. */
  shares: number;
  /** Optional: Transaction type (Buy, Sell, …). */
  type?: PortfolioTransactionType;
  /** Optional: Time of transaction in HH:mm format. */
  time?: string;
  /** Optional: ISIN (International Securities Identification Number). */
  isin?: string;
  /** Optional: Ticker symbol of the security. */
  tickerSymbol?: string;
  /** Optional: WKN (Wertpapierkennnummer, German security identifier). */
  wkn?: string;
  /** Optional: Human-readable security name. */
  securityName?: string;
  /** Optional: ISO 4217 currency code for the transaction (e.g. "EUR", "USD"). */
  transactionCurrency?: string;
  /** Optional: Transaction fees. */
  fees?: number;
  /** Optional: Taxes withheld on the transaction. */
  taxes?: number;
  /** Optional: Gross amount before fees and taxes. */
  grossAmount?: number;
  /** Optional: Currency of the gross amount (for cross-currency transactions). */
  currencyGrossAmount?: string;
  /** Optional: Exchange rate between transaction currency and portfolio base currency. */
  exchangeRate?: number;
  /** Optional: Free-form note. */
  note?: string;
  /** Optional: Cash account name or IBAN. */
  cashAccount?: string;
  /** Optional: Securities / depot account name or number. */
  securitiesAccount?: string;
  /** Optional: Offset account for transfer transactions. */
  offsetAccount?: string;
}

/** Supported locale codes for CSV header generation. */
export type Locale = 'en' | 'de';

/** Mapping from PortfolioTransactionRow property keys to Portfolio Performance CSV column headers (English). */
export const PP_PORTFOLIO_TRANSACTION_HEADERS_EN = {
  date: 'Date',
  value: 'Value',
  shares: 'Shares',
  type: 'Type',
  time: 'Time',
  isin: 'ISIN',
  tickerSymbol: 'Ticker Symbol',
  wkn: 'WKN',
  securityName: 'Security Name',
  transactionCurrency: 'Transaction Currency',
  fees: 'Fees',
  taxes: 'Taxes',
  grossAmount: 'Gross Amount',
  currencyGrossAmount: 'Currency Gross Amount',
  exchangeRate: 'Exchange Rate',
  note: 'Note',
  cashAccount: 'Cash Account',
  securitiesAccount: 'Securities Account',
  offsetAccount: 'Offset Account',
} as const satisfies Record<keyof PortfolioTransactionRow, string>;

/** Mapping from PortfolioTransactionRow property keys to Portfolio Performance CSV column headers (German). */
export const PP_PORTFOLIO_TRANSACTION_HEADERS_DE = {
  date: 'Datum',
  value: 'Wert',
  shares: 'Stück',
  type: 'Typ',
  time: 'Uhrzeit',
  isin: 'ISIN',
  tickerSymbol: 'Ticker-Symbol',
  wkn: 'WKN',
  securityName: 'Wertpapiername',
  transactionCurrency: 'Buchungswährung',
  fees: 'Gebühren',
  taxes: 'Steuern',
  grossAmount: 'Bruttobetrag',
  currencyGrossAmount: 'Währung Bruttobetrag',
  exchangeRate: 'Wechselkurs',
  note: 'Notiz',
  cashAccount: 'Konto',
  securitiesAccount: 'Depot',
  offsetAccount: 'Gegenkonto',
} as const satisfies Record<keyof PortfolioTransactionRow, string>;

/** @deprecated Use PP_PORTFOLIO_TRANSACTION_HEADERS_EN or PP_PORTFOLIO_TRANSACTION_HEADERS_DE instead. */
export const PP_PORTFOLIO_TRANSACTION_HEADERS = PP_PORTFOLIO_TRANSACTION_HEADERS_EN;

/** Mapping from English PortfolioTransactionType values to their German equivalents for PP CSV import. */
export const PP_PORTFOLIO_TRANSACTION_TYPE_DE: Record<PortfolioTransactionType, string> = {
  'Buy': 'Kauf',
  'Sell': 'Verkauf',
  'Delivery (Inbound)': 'Einlieferung',
  'Delivery (Outbound)': 'Auslieferung',
  'Transfer (Inbound)': 'Umbuchung (Eingang)',
  'Transfer (Outbound)': 'Umbuchung (Ausgang)',
};

// ---------------------------------------------------------------------------
// Account Transactions import type
// ---------------------------------------------------------------------------

/** Allowed values for the Type field in a Portfolio Performance Account Transactions CSV. */
export type AccountTransactionType =
  | 'Deposit'
  | 'Withdrawal'
  | 'Interest'
  | 'Interest Charge'
  | 'Dividend'
  | 'Fees'
  | 'Fees Refund'
  | 'Taxes'
  | 'Tax Refund'
  | 'Transfer (Inbound)'
  | 'Transfer (Outbound)'
  | 'Buy'
  | 'Sell';

/** Fields for the Portfolio Performance "Account Transactions" import type. */
export interface AccountTransactionRow {
  /** Required: Value date in YYYY-MM-DD format. */
  date: string;
  /** Required: Transaction amount (always positive; direction is encoded in type). */
  value: number;
  /** Optional: Transaction type. */
  type?: AccountTransactionType;
  /** Optional: Time of transaction in HH:mm format. */
  time?: string;
  /** Optional: Number of shares (for Buy/Sell/Dividend). */
  shares?: number;
  /** Optional: ISIN. */
  isin?: string;
  /** Optional: Ticker symbol. */
  tickerSymbol?: string;
  /** Optional: WKN. */
  wkn?: string;
  /** Optional: Human-readable security name. */
  securityName?: string;
  /** Optional: Free-form note. */
  note?: string;
  /** Optional: Gross amount before fees and taxes. */
  grossAmount?: number;
  /** Optional: Transaction fees. */
  fees?: number;
  /** Optional: Taxes withheld. */
  taxes?: number;
  /** Optional: ISO 4217 currency code. */
  transactionCurrency?: string;
  /** Optional: Currency of the gross amount. */
  currencyGrossAmount?: string;
  /** Optional: Exchange rate. */
  exchangeRate?: number;
  /** Optional: Cash account name or IBAN. */
  cashAccount?: string;
  /** Optional: Securities account name or number. */
  securitiesAccount?: string;
  /** Optional: Offset account for transfer transactions. */
  offsetAccount?: string;
}

/** Mapping from AccountTransactionRow property keys to PP CSV column headers (English). */
export const PP_ACCOUNT_TRANSACTION_HEADERS_EN = {
  date: 'Date',
  value: 'Value',
  type: 'Type',
  time: 'Time',
  shares: 'Shares',
  isin: 'ISIN',
  tickerSymbol: 'Ticker Symbol',
  wkn: 'WKN',
  securityName: 'Security Name',
  note: 'Note',
  grossAmount: 'Gross Amount',
  fees: 'Fees',
  taxes: 'Taxes',
  transactionCurrency: 'Transaction Currency',
  currencyGrossAmount: 'Currency Gross Amount',
  exchangeRate: 'Exchange Rate',
  cashAccount: 'Cash Account',
  securitiesAccount: 'Securities Account',
  offsetAccount: 'Offset Account',
} as const satisfies Record<keyof AccountTransactionRow, string>;

/** Mapping from AccountTransactionRow property keys to PP CSV column headers (German). */
export const PP_ACCOUNT_TRANSACTION_HEADERS_DE = {
  date: 'Datum',
  value: 'Wert',
  type: 'Typ',
  time: 'Uhrzeit',
  shares: 'Stück',
  isin: 'ISIN',
  tickerSymbol: 'Ticker-Symbol',
  wkn: 'WKN',
  securityName: 'Wertpapiername',
  note: 'Notiz',
  grossAmount: 'Bruttobetrag',
  fees: 'Gebühren',
  taxes: 'Steuern',
  transactionCurrency: 'Buchungswährung',
  currencyGrossAmount: 'Währung Bruttobetrag',
  exchangeRate: 'Wechselkurs',
  cashAccount: 'Konto',
  securitiesAccount: 'Depot',
  offsetAccount: 'Gegenkonto',
} as const satisfies Record<keyof AccountTransactionRow, string>;

/** Mapping from English AccountTransactionType values to their German equivalents for PP CSV import. */
export const PP_ACCOUNT_TRANSACTION_TYPE_DE: Record<AccountTransactionType, string> = {
  'Deposit': 'Einlage',
  'Withdrawal': 'Entnahme',
  'Interest': 'Zinsen',
  'Interest Charge': 'Zinsbelastung',
  'Dividend': 'Dividende',
  'Fees': 'Gebühren',
  'Fees Refund': 'Gebührenerstattung',
  'Taxes': 'Steuern',
  'Tax Refund': 'Steuerrückerstattung',
  'Transfer (Inbound)': 'Umbuchung (Eingang)',
  'Transfer (Outbound)': 'Umbuchung (Ausgang)',
  'Buy': 'Kauf',
  'Sell': 'Verkauf',
};
