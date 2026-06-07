With this import type, you can create a new security (see above) while adding the first Buy transaction at the same time. Table 4 shows the accepted fields; only shares and Value are required, and one of Ticker Symbol, ISIN, WKN, or Security Name is needed. You can provide a Quote and a Date of Quote. This will result in the creation of one historical price on that date. However, this quote is not used to calculate the value of the transaction (e.g., Value = Shares x Quote). Just as in the manual creation of a Buy transaction, you can create a transaction with a 'quote' different from the historical prices. In example 1 from Table 4, the calculated quote for the transaction is 45 EUR (=900/20).

| Field Name         | Required | Row 1 CSV      | Row 2 CSV |
|--------------------|----------|----------------|-----------|
| Shares             |    Y     | 20             | 5         |
| Value              |    Y     | 900            | 750       |
| Ticker Symbol      |    N     | BAS            | NVDA      |
| ISIN               |    N     | DE000BASF111   | --        |
| Security Name      |    N     | BASF           | NVIDIA    |
| WKN                |    N     | --             | --        |
| Currency           |    N     | EUR            | USD       |
| Note               |    N     | --             | --        |
| Date of Quote      |    N     | --             | --        |
| Quote              |    N     | --             | --        |
| Date of Value      |    N     | 2026-04-05     | 2026-04-06|
| Time               |    N     | --             | --        |
| Cash Account       |    N     | --             | --        |
| Securities Account |    N     | --             | --        |

Two securities will be created and at the same time two Buy transactions will also be recorded (20 shares of BASF for a total value of 900 EUR and 5 shares of NVIDIA for a total value of 750 USD). It is not possible to include Fees or Taxes. For that, you need the Account Transactions or Portfolio Transactions import types (see below).

As can be seen in Figure 7, the security and cash account can be specified, both through the dialogue box (top half) or via the CSV-file. The value of the CSV file takes precedence. Only, if they are not provided in the CSV-file, the program reverts to the user-selected accounts.