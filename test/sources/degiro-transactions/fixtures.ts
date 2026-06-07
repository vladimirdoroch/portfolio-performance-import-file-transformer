import type { DeGiroTransaction } from '../../../src/sources/degiro-transactions/types.js';
import type { PortfolioTransactionRow } from '../../../src/pp/types.js';

/** Minimal CSV with one Buy (USD) and one Sell (EUR) row. */
export const SAMPLE_CSV = `Datum,Uhrzeit,Produkt,ISIN,Referenzbörse,Ausführungsort,Anzahl,Kurs,,Wert in Lokalwährung,,Wert EUR,Wechselkurs,AutoFX-Gebühr,Transaktionsgebühren und/oder Fremdkosten,Gesamt EUR,Order-ID,
29-04-2026,17:33,IONQ INC,US46222L1089,NSY,CDED,280,"41,3996",USD,"-11591,88",USD,"-9910,62","1,1696","-24,78","-2,00","-9937,40",,3b8027f1-a4d7-4a3f-84e1-5d5e962e7a0d
22-05-2026,19:16,SELLAS LIFE SCIENCES GROUP INC,US81642T2096,NDQ,"BATS, JNST",-1500,"8,1001",USD,"12150,08",USD,"10461,86","1,1614","-26,15","-2,00","10433,70",,d6ab5806-2732-4261-b974-8b414298ef20
10-10-2025,10:40,ISHARES MSCI SCREENED UCITS ETF (ACC),IE00BFNM3J75,XET,XETA,-450,"10,3700",EUR,"4666,50",EUR,"4666,50",,"0,00","-3,00","4663,50",aaf546c6-c570-42e1-95e8-09e63a5d983f
`;

/** Expected parsed transaction for the IONQ BUY row. */
export const EXPECTED_IONQ: DeGiroTransaction = {
  date: '2026-04-29',
  time: '17:33',
  securityName: 'IONQ INC',
  isin: 'US46222L1089',
  referenceExchange: 'NSY',
  executionVenue: 'CDED',
  shares: 280,
  pricePerShare: 41.3996,
  priceCurrency: 'USD',
  valueLocal: 11591.88,
  localCurrency: 'USD',
  valueEur: 9910.62,
  exchangeRate: 1.1696,
  autoFxFee: 24.78,
  transactionFees: 2.00,
  totalEur: 9937.40,
  orderId: '3b8027f1-a4d7-4a3f-84e1-5d5e962e7a0d',
  type: 'Buy',
};

/** Expected parsed transaction for the SELLAS SELL row. */
export const EXPECTED_SELLAS: DeGiroTransaction = {
  date: '2026-05-22',
  time: '19:16',
  securityName: 'SELLAS LIFE SCIENCES GROUP INC',
  isin: 'US81642T2096',
  referenceExchange: 'NDQ',
  executionVenue: 'BATS, JNST', // quoted field with comma
  shares: 1500,
  pricePerShare: 8.1001,
  priceCurrency: 'USD',
  valueLocal: 12150.08,
  localCurrency: 'USD',
  valueEur: 10461.86,
  exchangeRate: 1.1614,
  autoFxFee: 26.15,
  transactionFees: 2.00,
  totalEur: 10433.70,
  orderId: 'd6ab5806-2732-4261-b974-8b414298ef20',
  type: 'Sell',
};

/** Expected parsed transaction for the iShares EUR SELL row. */
export const EXPECTED_ISHARES: DeGiroTransaction = {
  date: '2025-10-10',
  time: '10:40',
  securityName: 'ISHARES MSCI SCREENED UCITS ETF (ACC)',
  isin: 'IE00BFNM3J75',
  referenceExchange: 'XET',
  executionVenue: 'XETA',
  shares: 450,
  pricePerShare: 10.37,
  priceCurrency: 'EUR',
  valueLocal: 4666.50,
  localCurrency: 'EUR',
  valueEur: 4666.50,
  autoFxFee: 0,
  transactionFees: 3.00,
  totalEur: 4663.50,
  orderId: 'aaf546c6-c570-42e1-95e8-09e63a5d983f',
  type: 'Sell',
};

/** Expected PP row for IONQ BUY (USD grossAmount, inverted exchangeRate). */
export const EXPECTED_IONQ_PP_ROW: PortfolioTransactionRow = {
  date: '2026-04-29',
  time: '17:33',
  type: 'Buy',
  shares: 280,
  value: 9910.62,
  transactionCurrency: 'EUR',
  grossAmount: 11591.88,
  currencyGrossAmount: 'USD',
  // PP exchangeRate = EUR/USD = 1 / DeGiro Wechselkurs (USD/EUR)
  exchangeRate: 1 / 1.1696,
  fees: 26.78,
  securityName: 'IONQ INC',
  isin: 'US46222L1089',
  note: '3b8027f1-a4d7-4a3f-84e1-5d5e962e7a0d',
};

/** Expected PP row for iShares SELL (EUR, no cross-currency fields). */
export const EXPECTED_ISHARES_PP_ROW: PortfolioTransactionRow = {
  date: '2025-10-10',
  time: '10:40',
  type: 'Sell',
  shares: 450,
  value: 4666.50,
  transactionCurrency: 'EUR',
  fees: 3.00,
  securityName: 'ISHARES MSCI SCREENED UCITS ETF (ACC)',
  isin: 'IE00BFNM3J75',
  note: 'aaf546c6-c570-42e1-95e8-09e63a5d983f',
};
