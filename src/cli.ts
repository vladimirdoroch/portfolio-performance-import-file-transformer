#!/usr/bin/env bun
import { getSource, listSources } from './core/registry.js';
import { runSource } from './core/runner.js';
import type { OutputFormat } from './core/types.js';
import type { Locale } from './pp/types.js';

// ---------------------------------------------------------------------------
// Usage / help strings
// ---------------------------------------------------------------------------

const USAGE = `
Usage: portfolio-tools <command> [options]

Commands:
  list                          List all available sources.
  convert <source-id> <path>    Convert input files to a Portfolio Performance CSV.
  help [<source-id>]            Show this help, or detailed help for a source.

Options for convert:
  --pattern <glob>    Filename glob when <path> is a directory. Default: source default.
  --locale <en|de>    CSV header language. Default: de.
  --output <format>   Output format. Depends on source (see \`list\`).
                      Formats: pp-portfolio-tx | pp-account-tx | json

Examples:
  portfolio-tools list
  portfolio-tools convert comdirect-securities-account trade.pdf
  portfolio-tools convert comdirect-securities-account ./docs --pattern "Wertpapier*.pdf" --locale en
  portfolio-tools convert comdirect-dividends ./docs --pattern "Ertragsgutschrift*.pdf"
  portfolio-tools convert dkb-portfolio-transactions Jahreskontoauszug_2024.pdf
  portfolio-tools convert degiro-transactions Transactions.csv
  portfolio-tools convert degiro-account Account.csv
  portfolio-tools convert degiro-account Account.csv --output pp-account-tx
  portfolio-tools convert degiro-account Account.csv --output json
  portfolio-tools convert coinbase-transactions 2023-transactions.csv
`.trim();

// ---------------------------------------------------------------------------
// Backward-compatibility: old "broker tool" shape → new "convert source-id"
// ---------------------------------------------------------------------------

const LEGACY_MAP: Record<string, Record<string, string>> = {
  comdirect: {
    securities_account: 'comdirect-securities-account',
    dividends: 'comdirect-dividends',
  },
  dkb: {
    portfolio_transactions: 'dkb-portfolio-transactions',
  },
  degiro: {
    transactions: 'degiro-transactions',
    account: 'degiro-account',
  },
  coinbase: {
    transactions: 'coinbase-transactions',
  },
};

/** Legacy --output aliases → canonical OutputFormat. */
const LEGACY_OUTPUT_MAP: Record<string, OutputFormat> = {
  csv: 'pp-portfolio-tx',
  'account-csv': 'pp-account-tx',
  json: 'json',
};

// ---------------------------------------------------------------------------
// list command
// ---------------------------------------------------------------------------

function runList(): void {
  const sources = listSources();
  const rows = sources.map((s) => ({
    id: s.id,
    broker: s.broker,
    input: s.inputKind.toUpperCase(),
    outputs: s.outputs.join(', '),
    description: s.description,
  }));

  const idW = Math.max(8, ...rows.map((r) => r.id.length));
  const brokerW = Math.max(6, ...rows.map((r) => r.broker.length));
  const inputW = 5;
  const outputsW = Math.max(7, ...rows.map((r) => r.outputs.length));

  const header =
    `${'Source ID'.padEnd(idW)}  ${'Broker'.padEnd(brokerW)}  ${'Input'.padEnd(inputW)}  ${'Outputs'.padEnd(outputsW)}  Description`;
  const divider = '-'.repeat(header.length);

  console.log(header);
  console.log(divider);
  for (const r of rows) {
    console.log(
      `${r.id.padEnd(idW)}  ${r.broker.padEnd(brokerW)}  ${r.input.padEnd(inputW)}  ${r.outputs.padEnd(outputsW)}  ${r.description}`,
    );
  }
}

// ---------------------------------------------------------------------------
// help command
// ---------------------------------------------------------------------------

function runHelp(sourceId?: string): void {
  if (sourceId) {
    const source = getSource(sourceId);
    if (!source) {
      console.error(`Unknown source: "${sourceId}". Run \`portfolio-tools list\` to see available sources.`);
      process.exitCode = 1;
      return;
    }
    console.log(`Source:  ${source.id}`);
    console.log(`Broker:  ${source.broker}`);
    console.log(`Title:   ${source.title}`);
    console.log(`Input:   ${source.inputKind.toUpperCase()} (default pattern: ${source.defaultPattern})`);
    console.log(`Outputs: ${source.outputs.join(', ')}`);
    console.log();
    console.log(source.description);
    console.log();
    console.log(`Example:`);
    console.log(`  portfolio-tools convert ${source.id} <path>`);
  } else {
    console.log(USAGE);
  }
}

// ---------------------------------------------------------------------------
// convert command
// ---------------------------------------------------------------------------

async function runConvert(args: string[]): Promise<void> {
  const [sourceId, input, ...rest] = args;

  if (!sourceId || !input) {
    console.error(
      'Usage: portfolio-tools convert <source-id> <path> [--pattern <glob>] [--locale <en|de>] [--output <format>]',
    );
    process.exitCode = 1;
    return;
  }

  const source = getSource(sourceId);
  if (!source) {
    console.error(
      `Unknown source: "${sourceId}".\nRun \`portfolio-tools list\` to see all available sources.`,
    );
    process.exitCode = 1;
    return;
  }

  const pattern = getFlagValue(rest, '--pattern');
  const localeRaw = getFlagValue(rest, '--locale') ?? 'de';
  const outputRaw = getFlagValue(rest, '--output') ?? source.outputs[0]!;

  if (localeRaw !== 'en' && localeRaw !== 'de') {
    console.error(`Unknown locale "${localeRaw}". Use "en" or "de".`);
    process.exitCode = 1;
    return;
  }
  const locale: Locale = localeRaw;

  if (!isOutputFormat(outputRaw)) {
    console.error(
      `Unknown output format "${outputRaw}". Valid formats for this source: ${source.outputs.join(', ')}.`,
    );
    process.exitCode = 1;
    return;
  }
  const outputFormat: OutputFormat = outputRaw;

  if (!(source.outputs as readonly string[]).includes(outputFormat)) {
    console.error(
      `Output format "${outputFormat}" is not supported by source "${source.id}".\nSupported: ${source.outputs.join(', ')}.`,
    );
    process.exitCode = 1;
    return;
  }

  const result = await runSource({
    source,
    input,
    ...(pattern != null && { pattern }),
    locale,
    outputFormat,
  });

  const hasErrors = result.diagnostics.some((d) => d.level === 'error');
  const hasData = result.rows.length > 0 || result.rawObjects.length > 0;

  if (!hasData) {
    if (!hasErrors) {
      console.error('No data found in the provided file(s).');
    }
    process.exitCode = 1;
    return;
  }

  if (result.output) {
    process.stdout.write(result.output + '\n');
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFlagValue(args: string[], flag: string): string | null {
  const idx = args.indexOf(flag);
  if (idx === -1) return null;
  const value = args[idx + 1];
  if (!value || value.startsWith('--')) {
    console.error(`${flag} requires a value.`);
    process.exit(1);
  }
  return value;
}

function isOutputFormat(value: string): value is OutputFormat {
  return value === 'pp-portfolio-tx' || value === 'pp-account-tx' || value === 'json';
}

// ---------------------------------------------------------------------------
// Legacy broker-tool shim
// ---------------------------------------------------------------------------

function tryLegacyShim(argv: string[]): string[] | null {
  const [broker, tool, ...rest] = argv;
  if (!broker || !tool) return null;

  const brokerMap = LEGACY_MAP[broker];
  if (!brokerMap) return null;

  const sourceId = brokerMap[tool];
  if (!sourceId) return null;

  // Translate legacy --output values to canonical format
  const outputIdx = rest.indexOf('--output');
  if (outputIdx !== -1 && rest[outputIdx + 1]) {
    const legacyOut = rest[outputIdx + 1]!;
    const canonical = LEGACY_OUTPUT_MAP[legacyOut];
    if (canonical) rest[outputIdx + 1] = canonical;
  }

  console.error(
    `[DEPRECATED] "portfolio-tools ${broker} ${tool} …" is deprecated.\n` +
    `             Use "portfolio-tools convert ${sourceId} …" instead.\n`,
  );
  return ['convert', sourceId, ...rest];
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  let args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(USAGE);
    return;
  }

  // Check for legacy shape before dispatching
  const legacy = tryLegacyShim(args);
  if (legacy) args = legacy;

  const [command, ...rest] = args;

  if (command === 'list') {
    runList();
  } else if (command === 'help') {
    runHelp(rest[0]);
  } else if (command === 'convert') {
    await runConvert(rest);
  } else {
    console.error(`Unknown command: "${command}"\n\n${USAGE}`);
    process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
