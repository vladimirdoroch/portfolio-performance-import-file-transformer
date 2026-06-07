# portfolio-tools

CLI tool that converts broker export files into [Portfolio Performance](https://help.portfolio-performance.info/en/) import CSVs.

## Quickstart

```bash
# 1. Clone and install
git clone https://github.com/vladimirdoroch/portfolio-tools.git
cd portfolio-tools
npm install

# 2. List available sources
bun src/cli.ts list

# 3. Convert a file
bun src/cli.ts convert comdirect-securities-account ./docs --pattern "Wertpapier*.pdf" > import.csv
```

> **No build step needed with [Bun](https://bun.sh).** TypeScript is run directly from source.

---

## Supported sources

| Source ID | Broker | Input | Output type | Description |
|---|---|---|---|---|
| `comdirect-securities-account` | Comdirect | PDF | Portfolio Transactions | Wertpapier-Abrechnung (buy/sell) |
| `comdirect-dividends` | Comdirect | PDF | Account Transactions | Ertragsgutschrift (dividend/distribution) |
| `dkb-portfolio-transactions` | DKB | PDF | Account Transactions | Jahreskontoauszug Darlehen (loan repayments, interest) |
| `degiro-transactions` | DeGiro | CSV | Portfolio Transactions | Transactions.csv export |
| `degiro-account` | DeGiro | CSV | Portfolio Transactions / Account Transactions / JSON | Account.csv export |
| `coinbase-transactions` | Coinbase | CSV | Account Transactions | Standard CSV export (trades, staking, deposits) |

---

## CLI reference

```
portfolio-tools <command> [options]

Commands:
  list                          List all available sources.
  convert <source-id> <path>    Convert input files to a Portfolio Performance CSV.
  help [<source-id>]            Show help, or detailed help for a source.

Options for convert:
  --pattern <glob>    Filename glob when <path> is a directory. Default: source default.
  --locale <en|de>    CSV header language. Default: de.
  --output <format>   pp-portfolio-tx | pp-account-tx | json
```

### Examples

```bash
# List all sources
bun src/cli.ts list

# Comdirect: all trade confirmations in a folder → stdout
bun src/cli.ts convert comdirect-securities-account ./docs \
  --pattern "Wertpapier*.pdf" > portfolio_transactions.csv

# Comdirect: dividends
bun src/cli.ts convert comdirect-dividends ./docs \
  --pattern "Ertragsgutschrift*.pdf" > dividends.csv

# DKB: Darlehen annual statement
bun src/cli.ts convert dkb-portfolio-transactions Jahreskontoauszug_2024.pdf > darlehen.csv

# DeGiro: transactions export
bun src/cli.ts convert degiro-transactions Transactions.csv > degiro.csv

# DeGiro: account export → Portfolio Transactions CSV (default)
bun src/cli.ts convert degiro-account Account.csv > degiro_account.csv

# DeGiro: account export → Account Transactions CSV
bun src/cli.ts convert degiro-account Account.csv --output pp-account-tx > degiro_account_tx.csv

# DeGiro: account export → full JSON classification
bun src/cli.ts convert degiro-account Account.csv --output json > degiro_account.json

# Coinbase: Standard CSV
bun src/cli.ts convert coinbase-transactions 2023-transactions.csv > coinbase.csv

# English column headers
bun src/cli.ts convert degiro-transactions Transactions.csv --locale en > degiro_en.csv
```

---

## Run after build (Node.js)

```bash
npm run build
node dist/cli.js list
node dist/cli.js convert comdirect-securities-account ./docs > import.csv
```

## Global install

```bash
npm install -g .
portfolio-tools list
portfolio-tools convert degiro-transactions Transactions.csv > out.csv
```

---

## Importing into Portfolio Performance

1. Open Portfolio Performance → **File → Import → CSV files…**
2. Select the generated CSV.
3. Choose the matching import type (**Portfolio Transactions** or **Account Transactions**).
4. Map columns if needed and confirm **Finish**.

---

## Adding a new source

See [AGENTS.md](AGENTS.md) for the full plugin guide.

Short version: create `src/sources/<broker>-<tool>/` with `types.ts`, a parser,
a transformer, and an `index.ts` that exports a `Source<T>` default export. Register
it in `src/core/registry.ts`. Done.

---

## Development

```bash
npm test           # Run all tests (Vitest)
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
npm run format     # Prettier
npm run build      # Compile to dist/
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for full development setup.

## License

MIT © Vladimir Doroch
