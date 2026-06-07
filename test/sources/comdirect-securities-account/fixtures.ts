/**
 * Text fixtures that represent what pdf-parse extracts from real comdirect
 * "Wertpapier-Abrechnung" PDFs.  The format uses TABs between columns, which
 * the parser normalises before applying regex patterns.
 * Used by unit tests so that no actual PDF files are required.
 */

/** A buy confirmation with all fields populated (real comdirect tab-separated format). */
export const BUY_FULL = `
Depotnr.:\t2345678901
GESCHÄFTSABRECHNUNG VOM 15.03.2024
Wertpapierkauf
Geschäftstag\t:\t15.03.2024\tAbwicklung\t:\tLive\tTrading
Handelszeit\t:\t15:30\tUhr\t(MEZ/MESZ)
Wertpapier-Bezeichnung\tWPKNR/ISIN
NVIDIA Corp.\t918422
Registered Shares DL -,001\tUS67066G1040
Nennwert\tZum\tKurs\tvon
St.\t2\tEUR\t950,0000
Kurswert\t:\tEUR\t1.900,00
Eigene\tEntgelte Provision\t:\tEUR\t12,90
IBAN\tValuta\tZu\tIhren\tLasten\tvor\tSteuern
DE12\t3456\t7890\t1234\t5678\t90\tEUR\t19.03.2024\tEUR\t1.912,90
`.trim();

/** A buy confirmation with only the mandatory fields (no time, no settlement date, no accounts). */
export const BUY_MINIMAL = `
GESCHÄFTSABRECHNUNG VOM 05.04.2026
Wertpapierkauf
Geschäftstag\t:\t05.04.2026
Wertpapier-Bezeichnung\tWPKNR/ISIN
BASF SE\tBASF11
Inhaber-Aktien o.N.\tDE000BASF111
Nennwert\tZum\tKurs\tvon
St.\t20\tEUR\t45,0000
Kurswert\t:\tEUR\t900,00
`.trim();

/** A sell confirmation. */
export const SELL_FULL = `
Depotnr.:\t2345678901
GESCHÄFTSABRECHNUNG VOM 10.04.2024
Wertpapierverkauf
Geschäftstag\t:\t10.04.2024\tAbwicklung\t:\tLive\tTrading
Handelszeit\t:\t09:15\tUhr\t(MEZ/MESZ)
Wertpapier-Bezeichnung\tWPKNR/ISIN
NVIDIA Corp.\t918422
Registered Shares DL -,001\tUS67066G1040
Nennwert\tZum\tKurs\tvon
St.\t2\tEUR\t1.050,0000
Kurswert\t:\tEUR\t2.100,00
Provision\t:\tEUR\t12,90
IBAN\tValuta\tZu\tIhren\tGunsten\tvor\tSteuern
DE12\t3456\t7890\t1234\t5678\t90\tEUR\t12.04.2024\tEUR\t2.087,10
`.trim();

/** A buy confirmation with multiple fee lines (Provision + Transaktionsentgelt). */
export const BUY_MULTI_FEE = `
Depotnr.:\t2345678901
GESCHÄFTSABRECHNUNG VOM 20.04.2024
Wertpapierkauf
Geschäftstag\t:\t20.04.2024\tAbwicklung\t:\tXETRA
Handelszeit\t:\t11:00\tUhr\t(MEZ/MESZ)
Wertpapier-Bezeichnung\tWPKNR/ISIN
BASF SE\tBASF11
Inhaber-Aktien o.N.\tDE000BASF111
Nennwert\tZum\tKurs\tvon
St.\t20\tEUR\t45,0000
Kurswert\t:\tEUR\t900,00
Provision\t:\tEUR\t12,90
Transaktionsentgelt\t:\tEUR\t0,95
IBAN\tValuta\tZu\tIhren\tLasten\tvor\tSteuern
DE12\t3456\t7890\t1234\t5678\t90\tEUR\t24.04.2024\tEUR\t913,85
`.trim();

/** Text that is not a trade confirmation at all (e.g. a depot statement). */
export const NON_TRADE_PDF = `
Depotauszug
Depot 2345678901 Stand: 22.05.2026
NVIDIA Corp. ISIN US67066G1040 WKN 918422 2 Stück EUR 950,00
`.trim();

/** A buy confirmation where the security name block is missing. */
export const BUY_MISSING_SECURITY_NAME = `
Wertpapierkauf
Geschäftstag\t:\t15.03.2024
St.\t2\tEUR\t950,0000
Kurswert\t:\tEUR\t1.900,00
`.trim();
