The historical prices of most securities are covered by the built-in quote provider or other sources (see above). However, sometimes you may need to import historical prices via a manually created CSV file. For this, you only need two columns in the CSV file: one for the date and another for the corresponding quote. Both are required fields. There are no optional fields. The security's name for those historical prices must be provided in a second step. You cannot proceed to the next step if any of the required fields are missing or misspelled.

| Field Name      | Required | Row 1 CSV   | Row 2 CSV  |
|-----------------|----------|-------------|------------|
| Date            |    Y     | 2024-01-09  | 2024-01-08 |
| Quote           |    Y     | 22,51       | 22,54      |

Please note that the date in Figure 5 is in the format YYYY-MM-DD. By double-clicking on the second row of the output panel; e.g. >>> 'Date', you can select a different date format; for example MM-DD-YY or dd-MMM-yyyy (current language), e.g. 01-Feb-2026. Pick the correct one from the 20+ list.

In Figure 5, the Next and Finish buttons are greyed out because not all necessary information is available. The message at the top, "Unmapped required field(s): Quote," provides a clue. In the CSV file, a field named Price is used. This should be mapped to the internal Quote field. Double-click on the column and select the appropriate mapping field, e.g. Quote. The Next and Finish buttons will then become available. There, you can also choose between the decimal point or comma.