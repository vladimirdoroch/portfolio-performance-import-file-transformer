Use this type to create new securities from a CSV file. You can import eight fields (see Table 2). There are no required fields; however at least one identifying field must be present. If none of ISIN, Ticker Symbol, WKN, or Security Name is included, that row is rejected with an error. Refer to the glossary for the meaning of these terms.

| Field Name      | Required | Row 1 CSV      | Row 2 CSV |
|-----------------|----------|----------------|-----------|
| Ticker Symbol   |    N     | BAS            | NVDA      |
| ISIN            |    N     | DE000BASF111   | --        |
| Security Name   |    N     | BASF           | NVIDIA    |
| WKN             |    N     | --             | --        |
| Currency        |    N     | --             | USD       |
| Note            |    N     | XETRA          | NASDAQ    |
| Date (of Quote) |    N     | --             | --        |
| Quote           |    N     | --             | --        |

To import the example data from columns 3 and 4, the CSV file from Table 1 can be used. Please note that not all fields from Table 2 are included in the CSV file; for example, the Date and Quote fields are not present. The WKN field is included in the CSV file but has no value for either imported security. The order in which the fields are imported does not matter, and they are not imported in the same order as shown in Table 1.

As shown in Figure 2, two securities will be added to the portfolio, namely BASF and NVIDIA. The first three fields are correctly recognised. The fields Currency and Info are not recognised automatically and should be mapped by double-clicking the second row and selecting the correct label (i.e. Currency (sic!) and Note). Although the BASF security is traded on XETRA (e.g. BAS.DE), the ticker symbol from the CSV-file does not reflect this. The ISIN code for the second security (NVIDIA, traded on NASDAQ) is not available in the CSV file. Note also that the NVIDIA stock is traded in USD. The currency of the BASF share is not provided; therefore, the base portfolio currency (EUR) is used. Importing this CSV file will display the dialogues shown in Figures 2 and 3.