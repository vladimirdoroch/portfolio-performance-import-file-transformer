/**
 * Fixtures for the DEGIRO Account CSV parser and grouper tests.
 *
 * Each CSV snippet is a minimal self-contained slice of Account.csv that
 * exercises one specific booking type or grouping scenario.
 */

// ─── Minimal header ───────────────────────────────────────────────────────────

export const HEADER =
  'Datum,Uhrze,Valutadatum,Produkt,ISIN,Beschreibung,FX,Änderung,,Saldo,,Order-ID\n';

// ─── EUR trade ────────────────────────────────────────────────────────────────

/** Single EUR-denominated buy: 1 fill + 1 fee, same Order-ID. */
export const EUR_BUY_CSV =
  HEADER +
  '06-01-2025,10:28,06-01-2025,ISHARES MSCI SCREENED UCITS ETF (ACC),IE00BFNM3J75,' +
  'DEGIRO Transaktionsgebühren und/oder Fremdkosten,,EUR,"-3,00",EUR,"190,35",c4375bad-3681-460c-8685-bd4bd36ac690\n' +
  '06-01-2025,10:28,06-01-2025,ISHARES MSCI SCREENED UCITS ETF (ACC),IE00BFNM3J75,' +
  '"Kauf 250 zu je 9,923 EUR (IE00BFNM3J75)",,EUR,"-2480,75",EUR,"193,35",c4375bad-3681-460c-8685-bd4bd36ac690\n';

/** Single EUR-denominated sell: 3 fills + 1 fee. */
export const EUR_SELL_MULTI_FILL_CSV =
  HEADER +
  '10-10-2025,10:40,10-10-2025,ISHARES MSCI SCREENED UCITS ETF (ACC),IE00BFNM3J75,' +
  'DEGIRO Transaktionsgebühren und/oder Fremdkosten,,EUR,"-3,00",EUR,"4704,04",aaf546c6-c570-42e1-95e8-09e63a5d983f\n' +
  '10-10-2025,10:40,10-10-2025,ISHARES MSCI SCREENED UCITS ETF (ACC),IE00BFNM3J75,' +
  '"Verkauf 75 zu je 10,37 EUR (IE00BFNM3J75)",,EUR,"777,75",EUR,"4707,04",aaf546c6-c570-42e1-95e8-09e63a5d983f\n' +
  '10-10-2025,10:40,10-10-2025,ISHARES MSCI SCREENED UCITS ETF (ACC),IE00BFNM3J75,' +
  '"Verkauf 125 zu je 10,37 EUR (IE00BFNM3J75)",,EUR,"1296,25",EUR,"3929,29",aaf546c6-c570-42e1-95e8-09e63a5d983f\n' +
  '10-10-2025,10:40,10-10-2025,ISHARES MSCI SCREENED UCITS ETF (ACC),IE00BFNM3J75,' +
  '"Verkauf 250 zu je 10,37 EUR (IE00BFNM3J75)",,EUR,"2592,50",EUR,"2633,04",aaf546c6-c570-42e1-95e8-09e63a5d983f\n';

// ─── USD trade (single fill + FX pair) ───────────────────────────────────────

/** USD buy: 1 fill + 1 FX pair + 1 fee. */
export const USD_BUY_SINGLE_FILL_CSV =
  HEADER +
  '29-04-2026,17:33,29-04-2026,IONQ INC,US46222L1089,' +
  'Währungswechsel (Einbuchung),"1,1667",USD,"11095,20",USD,"0,00",3b8027f1-a4d7-4a3f-84e1-5d5e962e7a0d\n' +
  '29-04-2026,17:33,29-04-2026,IONQ INC,US46222L1089,' +
  'Währungswechsel (Ausbuchung),,EUR,"-9510,10",EUR,"146,92",3b8027f1-a4d7-4a3f-84e1-5d5e962e7a0d\n' +
  '29-04-2026,17:33,29-04-2026,IONQ INC,US46222L1089,' +
  'Währungswechsel (Einbuchung),"1,1667",USD,"496,68",USD,"-11095,20",3b8027f1-a4d7-4a3f-84e1-5d5e962e7a0d\n' +
  '29-04-2026,17:33,29-04-2026,IONQ INC,US46222L1089,' +
  'Währungswechsel (Ausbuchung),,EUR,"-425,72",EUR,"9657,02",3b8027f1-a4d7-4a3f-84e1-5d5e962e7a0d\n' +
  '29-04-2026,17:33,29-04-2026,IONQ INC,US46222L1089,' +
  'DEGIRO Transaktionsgebühren und/oder Fremdkosten,,EUR,"-2,00",EUR,"10082,74",3b8027f1-a4d7-4a3f-84e1-5d5e962e7a0d\n' +
  '29-04-2026,17:33,29-04-2026,IONQ INC,US46222L1089,' +
  '"Kauf 268 zu je 41,4 USD (US46222L1089)",,USD,"-11095,20",USD,"-11591,88",3b8027f1-a4d7-4a3f-84e1-5d5e962e7a0d\n' +
  '29-04-2026,17:33,29-04-2026,IONQ INC,US46222L1089,' +
  '"Kauf 12 zu je 41,39 USD (US46222L1089)",,USD,"-496,68",USD,"-496,68",3b8027f1-a4d7-4a3f-84e1-5d5e962e7a0d\n';

/** USD sell: 1 fill + 1 FX pair + 1 fee. */
export const USD_SELL_CSV =
  HEADER +
  '22-05-2026,19:16,22-05-2026,SELLAS LIFE SCIENCES GROUP INC,US81642T2096,' +
  'Währungswechsel (Ausbuchung),"1,1643",USD,"-5670,07",USD,"-0,01",d6ab5806-2732-4261-b974-8b414298ef20\n' +
  '22-05-2026,19:16,22-05-2026,SELLAS LIFE SCIENCES GROUP INC,US81642T2096,' +
  'Währungswechsel (Einbuchung),,EUR,"4869,92",EUR,"10577,91",d6ab5806-2732-4261-b974-8b414298ef20\n' +
  '22-05-2026,19:16,22-05-2026,SELLAS LIFE SCIENCES GROUP INC,US81642T2096,' +
  'DEGIRO Transaktionsgebühren und/oder Fremdkosten,,EUR,"-2,00",EUR,"142,42",d6ab5806-2732-4261-b974-8b414298ef20\n' +
  '22-05-2026,19:16,22-05-2026,SELLAS LIFE SCIENCES GROUP INC,US81642T2096,' +
  '"Verkauf 700 zu je 8,1001 USD (US81642T2096)",,USD,"5670,07",USD,"12150,07",d6ab5806-2732-4261-b974-8b414298ef20\n';

// ─── Dividend ─────────────────────────────────────────────────────────────────

/** Simple dividend: gross + withholding tax + standalone FX conversion next day. */
export const DIVIDEND_CSV =
  HEADER +
  // standalone FX conversion (the next morning)
  '14-03-2026,06:38,13-03-2026,,,' +
  'Währungswechsel (Einbuchung),,EUR,"33,79",EUR,"51,58",\n' +
  '14-03-2026,06:38,13-03-2026,,,' +
  'Währungswechsel (Ausbuchung),"1,1445",USD,"-38,67",USD,"0,00",\n' +
  // dividend booking
  '13-03-2026,07:21,12-03-2026,MICROSOFT CORP,US5949181045,' +
  'Dividende,,USD,"45,50",USD,"38,67",\n' +
  '13-03-2026,07:20,12-03-2026,MICROSOFT CORP,US5949181045,' +
  'Dividendensteuer,,USD,"-6,83",USD,"-6,83",\n';

/** Dividend with ADR/GDR fee and a correction round followed by the final booking. */
export const DIVIDEND_WITH_ADR_AND_CORRECTION_CSV =
  HEADER +
  // final corrected booking (22-08-2022 11:29)
  '22-08-2022,11:29,17-06-2022,ADR ON BIONTECH SE,US09075V1026,' +
  'Dividende,,USD,"21,32",USD,"0,04",\n' +
  '22-08-2022,11:29,17-06-2022,ADR ON BIONTECH SE,US09075V1026,' +
  'Dividendensteuer,,USD,"-5,62",USD,"-21,28",\n' +
  '22-08-2022,11:29,17-06-2022,ADR ON BIONTECH SE,US09075V1026,' +
  'ADR/GDR Weitergabegebühr,,USD,"-0,20",USD,"-15,66",\n' +
  // reversal round (22-08-2022 11:28)
  '22-08-2022,11:28,17-06-2022,ADR ON BIONTECH SE,US09075V1026,' +
  'Dividende,,USD,"-21,32",USD,"-15,46",\n' +
  '22-08-2022,11:28,17-06-2022,ADR ON BIONTECH SE,US09075V1026,' +
  'Dividendensteuer,,USD,"5,62",USD,"5,86",\n' +
  '22-08-2022,11:28,17-06-2022,ADR ON BIONTECH SE,US09075V1026,' +
  'ADR/GDR Weitergabegebühr,,USD,"0,20",USD,"0,24",\n';

// ─── Corporate action ─────────────────────────────────────────────────────────

/** FUSION (merger): two rows sharing an Order-ID, no FX, no fee. */
export const FUSION_CSV =
  HEADER +
  '08-04-2026,13:05,06-04-2026,BITFARMS LTD,CA09173B1076,' +
  '"FUSION: Verkauf 4.600 zu je 1,98 USD (CA09173B1076)",,USD,"9108,00",USD,"0,00",merger-order-uuid\n' +
  '08-04-2026,13:05,06-04-2026,KEEL INFRASTRUCTURE CORP,US4869171078,' +
  '"FUSION: Kauf 4.600 zu je 1,98 USD (US4869171078)",,USD,"-9108,00",USD,"-9108,00",merger-order-uuid\n';

// ─── Stock split ──────────────────────────────────────────────────────────────

/** AKTIENSPLIT: debit row (old shares, negative) followed by credit row (new shares, positive). */
export const STOCK_SPLIT_CSV =
  HEADER +
  '25-08-2022,10:22,25-08-2022,TESLA INC,US88160R1014,' +
  '"AKTIENSPLIT: 288 Tesla Inc zu je 297,0967 USD (US88160R1014)",,USD,"-85563,85",USD,"-0,01",\n' +
  '25-08-2022,10:22,25-08-2022,TESLA INC,US88160R1014,' +
  '"AKTIENSPLIT: 96 Tesla Inc zu je 891,29 USD (US88160R1014)",,USD,"85563,84",USD,"85563,84",\n';

// ─── Cash sweep pair ──────────────────────────────────────────────────────────

/** CashSweep + FlatexWithdrawal at the same date+time. */
export const CASH_SWEEP_CSV =
  HEADER +
  '22-05-2026,20:21,22-05-2026,,,' +
  '"Überweisung auf Ihr Geldkonto bei der flatexDEGIRO Bank: 10.433,49 EUR"' +
  ',,,,EUR,"10577,91",\n' +
  '22-05-2026,20:21,22-05-2026,,,' +
  'Degiro Cash Sweep Transfer,,EUR,"-10433,49",EUR,"144,42",\n';

// ─── Deposit ──────────────────────────────────────────────────────────────────

/** flatex Einzahlung — single-row deposit. */
export const FLATEX_DEPOSIT_CSV =
  HEADER +
  '26-08-2025,14:40,26-08-2025,,,flatex Einzahlung,,EUR,"10000,00",EUR,"10224,89",\n';

/** iDEAL instant deposit: Soforteinzahlung + Reservation iDEAL at same time. */
export const IDEAL_DEPOSIT_CSV =
  HEADER +
  '31-01-2025,05:20,31-01-2025,,,Soforteinzahlung,,EUR,"7000,00",EUR,"2171,84",\n' +
  '31-01-2025,05:20,31-01-2025,,,Reservation iDEAL,,EUR,"-7000,00",EUR,"-4828,16",\n';

/**
 * The two-phase iDEAL payment flow:
 *   Phase 1 (Day 1) — initial "Reservation iDEAL" (+7000 EUR) is posted immediately.
 *   Phase 2 (Day 3) — settlement pair: "Soforteinzahlung" (+7000) +
 *                     reversal "Reservation iDEAL" (−7000) at the same date+time.
 *
 * The Phase-1 positive reservation is the pending booking that gets reversed
 * in Phase 2.  The grouper must emit exactly ONE DepositTransaction of 7000 EUR
 * and suppress the stale Phase-1 reservation so it is not double-counted.
 */
export const IDEAL_PENDING_RESERVATION_CSV =
  HEADER +
  // Phase 2 settlement rows (newer, listed first in the CSV)
  '31-01-2025,05:20,31-01-2025,,,Soforteinzahlung,,EUR,"7000,00",EUR,"2171,84",\n' +
  '31-01-2025,05:20,31-01-2025,,,Reservation iDEAL,,EUR,"-7000,00",EUR,"-4828,16",\n' +
  // SOFORT payment fee (same time as Phase 1 reservation)
  '29-01-2025,17:56,29-01-2025,,,SOFORT Zahlungsgebühr,,EUR,"-1,00",EUR,"7189,35",\n' +
  // Phase 1 initial pending booking — must NOT become a separate Deposit
  '29-01-2025,17:56,29-01-2025,,,Reservation iDEAL,,EUR,"7000,00",EUR,"7190,35",\n';

/**
 * Two dividends from the same security with identical net USD amounts
 * (38.67 USD) paid three months apart.  Each dividend has its own matching
 * standalone FX conversion of exactly 38.67 USD.
 *
 * Without the date-proximity constraint added to Step 8 of the grouper, the
 * newer dividend would steal the older FX conversion (since both have the same
 * debit amount), leaving one dividend unmatched.
 */
export const DIVIDEND_SAME_NET_DIFFERENT_QUARTER_CSV =
  HEADER +
  // Newer quarter (June 2026) — newest rows appear first in the CSV
  '14-06-2026,06:38,13-06-2026,,,' +
  'Währungswechsel (Einbuchung),,EUR,"33,79",EUR,"51,58",\n' +
  '14-06-2026,06:38,13-06-2026,,,' +
  'Währungswechsel (Ausbuchung),"1,1445",USD,"-38,67",USD,"0,00",\n' +
  '13-06-2026,07:21,12-06-2026,MICROSOFT CORP,US5949181045,' +
  'Dividende,,USD,"45,50",USD,"38,67",\n' +
  '13-06-2026,07:20,12-06-2026,MICROSOFT CORP,US5949181045,' +
  'Dividendensteuer,,USD,"-6,83",USD,"-6,83",\n' +
  // Older quarter (March 2026)
  '14-03-2026,06:38,13-03-2026,,,' +
  'Währungswechsel (Einbuchung),,EUR,"33,79",EUR,"51,58",\n' +
  '14-03-2026,06:38,13-03-2026,,,' +
  'Währungswechsel (Ausbuchung),"1,1445",USD,"-38,67",USD,"0,00",\n' +
  '13-03-2026,07:21,12-03-2026,MICROSOFT CORP,US5949181045,' +
  'Dividende,,USD,"45,50",USD,"38,67",\n' +
  '13-03-2026,07:20,12-03-2026,MICROSOFT CORP,US5949181045,' +
  'Dividendensteuer,,USD,"-6,83",USD,"-6,83",\n';

/**
 * DEGIRO sometimes groups dividend proceeds together with other USD cash flows
 * (e.g. a FUSION payout) into a single combined FX conversion.  The combined
 * FX debit (80.78 USD) does not match the dividend net (3.77 USD), so exact
 * matching fails.  Step 8b (rate-borrowing) must still link the FX rate to
 * the dividend without consuming the FxConversionTransaction.
 */
export const DIVIDEND_BUNDLED_FX_CSV =
  HEADER +
  // Combined FX: FUSION proceeds (77.01 USD) + dividend (3.77 USD) = 80.78 USD
  // Booked 2 days after the dividend ex-date (within the [-1, +7] day window)
  '16-02-2022,07:35,15-02-2022,,,' +
  'Währungswechsel (Einbuchung),,EUR,"70,94",EUR,"80,35",\n' +
  '16-02-2022,07:35,15-02-2022,,,' +
  'Währungswechsel (Ausbuchung),"1,1387",USD,"-80,78",USD,"0,00",\n' +
  // XILINX dividend (exDate = 2022-02-14, net = 4.44 − 0.67 = 3.77 USD)
  '15-02-2022,07:36,14-02-2022,XILINX,US9839191015,' +
  'Dividende,,USD,"4,44",USD,"3,78",\n' +
  '15-02-2022,07:36,14-02-2022,XILINX,US9839191015,' +
  'Dividendensteuer,,USD,"-0,67",USD,"-0,66",\n';

// ─── Market-access fee ────────────────────────────────────────────────────────

export const MARKET_ACCESS_FEE_CSV =
  HEADER +
  '23-02-2026,10:44,31-01-2026,,,' +
  'Einrichtung von Handelsmodalitäten 2026 (Nasdaq - NDQ),,EUR,"-2,50",EUR,"17,79",\n';

// ─── Interest ─────────────────────────────────────────────────────────────────

export const INTEREST_INCOME_CSV =
  HEADER +
  '06-04-2026,21:02,31-03-2026,,,Flatex Interest Income,,EUR,"0,00",EUR,"83,12",\n';

export const INTEREST_CHARGE_CSV =
  HEADER +
  '03-10-2025,11:39,30-09-2025,,,Zinsen,,EUR,"-0,01",EUR,"39,87",\n';

// ─── Composite CSV (multiple types together) ──────────────────────────────────

/**
 * A composite snippet containing one USD buy, one dividend, one cash sweep,
 * one deposit, and one interest row — used to verify end-to-end grouping.
 */
export const COMPOSITE_CSV =
  HEADER +
  // flatex deposit
  '29-04-2026,14:50,29-04-2026,,,flatex Einzahlung,,EUR,"10000,00",EUR,"10084,74",\n' +
  // cash sweep pair
  '29-04-2026,18:20,29-04-2026,,,' +
  '"Auszahlung von Ihrem Geldkonto bei der flatexDEGIRO Bank: 9.937,82 EUR",,,,EUR,"-9790,90",\n' +
  '29-04-2026,18:20,29-04-2026,,,Degiro Cash Sweep Transfer,,EUR,"9937,82",EUR,"146,92",\n' +
  // USD buy (2 fills, 2 FX pairs, 1 fee)
  '29-04-2026,17:33,29-04-2026,IONQ INC,US46222L1089,' +
  'Währungswechsel (Einbuchung),"1,1667",USD,"11095,20",USD,"0,00",3b8027f1-a4d7-4a3f-84e1-5d5e962e7a0d\n' +
  '29-04-2026,17:33,29-04-2026,IONQ INC,US46222L1089,' +
  'Währungswechsel (Ausbuchung),,EUR,"-9510,10",EUR,"146,92",3b8027f1-a4d7-4a3f-84e1-5d5e962e7a0d\n' +
  '29-04-2026,17:33,29-04-2026,IONQ INC,US46222L1089,' +
  'Währungswechsel (Einbuchung),"1,1667",USD,"496,68",USD,"-11095,20",3b8027f1-a4d7-4a3f-84e1-5d5e962e7a0d\n' +
  '29-04-2026,17:33,29-04-2026,IONQ INC,US46222L1089,' +
  'Währungswechsel (Ausbuchung),,EUR,"-425,72",EUR,"9657,02",3b8027f1-a4d7-4a3f-84e1-5d5e962e7a0d\n' +
  '29-04-2026,17:33,29-04-2026,IONQ INC,US46222L1089,' +
  'DEGIRO Transaktionsgebühren und/oder Fremdkosten,,EUR,"-2,00",EUR,"10082,74",3b8027f1-a4d7-4a3f-84e1-5d5e962e7a0d\n' +
  '29-04-2026,17:33,29-04-2026,IONQ INC,US46222L1089,' +
  '"Kauf 268 zu je 41,4 USD (US46222L1089)",,USD,"-11095,20",USD,"-11591,88",3b8027f1-a4d7-4a3f-84e1-5d5e962e7a0d\n' +
  '29-04-2026,17:33,29-04-2026,IONQ INC,US46222L1089,' +
  '"Kauf 12 zu je 41,39 USD (US46222L1089)",,USD,"-496,68",USD,"-496,68",3b8027f1-a4d7-4a3f-84e1-5d5e962e7a0d\n' +
  // dividend + standalone FX
  '14-03-2026,06:38,13-03-2026,,,Währungswechsel (Einbuchung),,EUR,"33,79",EUR,"51,58",\n' +
  '14-03-2026,06:38,13-03-2026,,,Währungswechsel (Ausbuchung),"1,1445",USD,"-38,67",USD,"0,00",\n' +
  '13-03-2026,07:21,12-03-2026,MICROSOFT CORP,US5949181045,Dividende,,USD,"45,50",USD,"38,67",\n' +
  '13-03-2026,07:20,12-03-2026,MICROSOFT CORP,US5949181045,Dividendensteuer,,USD,"-6,83",USD,"-6,83",\n' +
  // interest income
  '06-04-2026,21:02,31-03-2026,,,Flatex Interest Income,,EUR,"0,00",EUR,"83,12",\n';
