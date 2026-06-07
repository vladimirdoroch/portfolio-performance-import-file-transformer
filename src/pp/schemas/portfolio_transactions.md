# Portfolio Transactions CSV import (Portfolio Performance)

The **Portfolio Transactions** import type supports Buy, Sell, Delivery, and Transfer
transactions for securities. It is the recommended format when you need to import a mix
of buys and sells from the same broker export.

Source: https://help.portfolio-performance.info/en/reference/file/import/csv-import/#5-portfolio-transactions-import

## Required fields

| Field Name | Notes                          |
|------------|--------------------------------|
| Date       | Trade date, format YYYY-MM-DD  |
| Value      | Net transaction value          |
| Shares     | Number of shares traded        |

Additionally, at least one of `ISIN`, `WKN`, `Ticker Symbol`, or `Security Name` must
be present to identify the security.

## Optional fields

| Field Name            | Notes                                                                 |
|-----------------------|-----------------------------------------------------------------------|
| Type                  | Buy, Sell, Delivery (Inbound/Outbound), Transfer (Inbound/Outbound)  |
| Time                  | HH:mm                                                                 |
| ISIN                  |                                                                       |
| Ticker Symbol         |                                                                       |
| WKN                   |                                                                       |
| Security Name         |                                                                       |
| Transaction Currency  | ISO 4217 currency code                                                |
| Fees                  |                                                                       |
| Taxes                 |                                                                       |
| Gross Amount          | Value before fees and taxes                                           |
| Currency Gross Amount | Currency of the gross amount (for cross-currency transactions)        |
| Exchange Rate         |                                                                       |
| Note                  |                                                                       |
| Cash Account          | Name or IBAN                                                          |
| Securities Account    | Depot account name or number                                          |
| Offset Account        | For transfer transactions                                             |

## Example CSV (comdirect buy + sell)

```
Date;Type;Shares;Value;Security Name;ISIN;WKN;Transaction Currency;Time;Cash Account;Securities Account
2024-03-15;Buy;2;1900;NVIDIA Corp.;US67066G1040;918422;EUR;15:30;DE12345678901234567890;2345678901
2024-04-10;Sell;2;2100;NVIDIA Corp.;US67066G1040;918422;EUR;09:15;DE12345678901234567890;2345678901
```

## Notes

- `Value` is the *net* settlement value (Kurswert). Fees and taxes from the PDF are not
  included; add them separately as Account Transactions if required.
- The `Type` column is optional. If omitted, Portfolio Performance assumes `Buy` for
  negative values and `Sell` for positive values.
- Columns that have no value in any row can be omitted entirely.
