# Tests

## Running the tests

```bash
npm test
```

Use watch mode during development:

```bash
npm run test:watch
```

---

## Structure

```
test/
├── core/                        # Tests for registry, runner, etc.
└── sources/
    ├── coinbase-transactions/
    │   ├── fixtures.ts          # Synthetic CSV fixtures
    │   ├── csv-parser.test.ts
    │   ├── transformer.test.ts
    │   └── examples/            # Anonymised sample Coinbase Standard CSV
    ├── comdirect-dividends/
    │   └── examples/            # Anonymised sample Ertragsgutschrift PDFs
    ├── comdirect-securities-account/
    │   ├── fixtures.ts          # Synthetic PDF-text fixtures
    │   ├── utils.test.ts
    │   ├── text-parser.test.ts
    │   ├── transformer.test.ts
    │   ├── csv-generator.test.ts
    │   ├── pdf.integration.test.ts
    │   └── examples/            # Anonymised sample Wertpapierabrechnung PDFs
    ├── degiro-account/
    │   ├── fixtures.ts
    │   ├── csv-parser.test.ts
    │   ├── grouper.test.ts
    │   └── examples/            # Anonymised Account.csv / Transactions.csv
    ├── degiro-transactions/
    │   ├── fixtures.ts
    │   ├── csv-parser.test.ts
    │   ├── transformer.test.ts
    │   └── examples/            # Anonymised Transactions.csv / Account.csv
    └── dkb-portfolio-transactions/
        ├── fixtures.ts          # Synthetic PDF-text fixtures
        ├── text-parser.test.ts
        ├── transformer.test.ts
        └── examples/            # Anonymised Jahreskontoauszug PDFs
```

---

## Example files (anonymisation)

All sample files in `examples/` directories are **anonymised** — real personal
data has been replaced with clearly fictional placeholders:

| Original (real)               | Placeholder (dummy)              |
|-------------------------------|----------------------------------|
| `Vladimir Doroch`             | `John Doe`                       |
| `Naugarder Str. 45, 10409 Berlin` | `Musterstraße 1, 10115 Berlin` |
| IBAN `DE67 2004 1111 0773 5590 00` | `DE12 2004 1111 0123 4567 89` |
| Depot `7735590 00`            | `1234567 89`                     |
| DKB loan account `6705506597` | `1234567890`                     |
| DKB IBAN `DE29 1203 0000 6705 5065 97` | `DE12 1203 0000 1234 5678 90` |
| Coinbase user ID (UUID)       | `00000000-0000-0000-0000-000000000001` |

To re-anonymise new fixtures, run:

```bash
/tmp/pdfvenv/bin/python3 scripts/anonymise-pdf-fixtures.py
```

---

## Adding integration tests with real PDFs

Drop a comdirect "Wertpapier-Abrechnung" PDF into
`test/sources/comdirect-securities-account/examples/` and run `npm test`.
For each PDF the integration test verifies:

- The document is parsed without error.
- `shares` and `value` are positive numbers.
- At least one of `isin`, `wkn`, or `securityName` is present.
- `tradeDate` is in `YYYY-MM-DD` format.
- The generated CSV has a valid header row and one data row with positive values.

Optionally place a JSON file with the same base name (e.g. `buy_nvidia.expected.json`)
to assert specific field values:

```json
{
  "type": "buy",
  "securityName": "NVIDIA Corp.",
  "isin": "US67066G1040",
  "shares": 2,
  "totalValue": 1900,
  "tradeDate": "2024-03-15"
}
```

