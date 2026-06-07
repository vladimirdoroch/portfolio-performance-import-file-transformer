/**
 * Text fixtures for DKB Darlehen parser tests.
 *
 * The strings below are representative excerpts that mirror the exact layout
 * of real DKB annual statement PDFs (with real personal data anonymised).
 */

// ---------------------------------------------------------------------------
// Old format ("JAHRESKONTOAUSZUG", DKB layout up to ~2022)
// ---------------------------------------------------------------------------

export const OLD_FORMAT_TEXT = `
Herr
Test User
Musterstr. 1
12345 Berlin
Darlehen 1234567890
IBAN: DE12 1203 0000 1234 5678 90
BLZ 120 300 00
Deutsche Kreditbank AG

Jahresauszug 2022
Blatt 1
Deutsche Kreditbank AG
Taubenstrasse 7-9
10117 Berlin

JAHRESKONTOAUSZUG
18.01.2022 - 31.12.2022 Berlin, den 09.01.2023

Datum Erläuterungen Wert Betrag
---------------------------------------------------------------------------
Kontostand in EUR am 18.01.2022 0,00+
---------------------------
18.01.2022 Darlehensauszahlung 18.01 50.000,00-
15.02.2022 Darlehenszins 15.02 92,25-
15.02.2022 Darlehensleistung 15.02 92,25+
15.03.2022 Darlehenszins 15.03 102,50-
15.03.2022 Darlehensleistung 15.03 648,57+
14.04.2022 Darlehenszins 15.04 101,38-
14.04.2022 Darlehensleistung 15.04 648,57+
15.12.2022 Darlehenszins 15.12 92,34-
15.12.2022 Verzugszins lfd. Jahr 15.12 0,45-
15.12.2022 Darlehensleistung 15.12 649,02+
---------------------------
Kontostand in EUR am 31.12.2022 44.488,65-
`;

// ---------------------------------------------------------------------------
// New format ("Jahreskontoauszug für den Zeitraum", DKB layout from ~2024)
// ---------------------------------------------------------------------------

export const NEW_FORMAT_TEXT = `
Deutsche Kreditbank AG
Jahreskontoauszug für den Zeitraum 01.01.2024 - 31.12.2024
Darlehen 1234567890, DE12 1203 0000 1234 5678 90
6. Januar 2025
Seite 1 von 2

Datum Erläuterung Betrag Soll EUR Betrag Haben EUR
Kontostand am 01.01.2024 -38.094,82
03.01.2024 Dauerauftrag 700,00
03.01.2024 Verzugszins Vorj. -2,20
03.01.2024 Verzugszins lfd. Jahr -0,46
15.01.2024 Darlehenszins -76,72
05.02.2024 Dauerauftrag 700,00
07.02.2024 Sondertilgung 97,33
07.02.2024 Storno -97,33
15.02.2024 Darlehenszins -75,53
14.06.2024 Darlehenszins / Wert: 15.06.2024 -70,34
04.10.2024 Dauerauftrag / Wert: 03.10.2024 700,00
Kontostand am 31.12.2024 -30.564,30

Nachweis für Darlehen 1234567890 Zeitraum 01.01.2024 - 31.12.2024
Kontostand EUR
-30.564,30 Sollzinsen EUR
-869,48
`;

// ---------------------------------------------------------------------------
// Non-DKB document (should parse as null)
// ---------------------------------------------------------------------------

export const NON_DKB_TEXT = `
This is a completely unrelated PDF document.
It contains some numbers like 12,34 and dates like 01.01.2024
but is not a DKB Darlehen statement.
`;
