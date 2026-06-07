/**
 * Utility helpers shared across comdirect dividend parser files.
 * Independent of the securities-account utilities to keep the plugin self-contained.
 */

/**
 * Parse a German-formatted date string (`DD.MM.YYYY`) into ISO format (`YYYY-MM-DD`).
 * Returns `undefined` when the input does not match the expected pattern.
 */
export function parseGermanDate(value: string): string | undefined {
  const m = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return undefined;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/**
 * Parse a German-formatted decimal number (dot as thousands separator, comma as decimal)
 * into a JavaScript `number`.
 * Returns `NaN` when the string cannot be parsed.
 */
export function parseGermanNumber(value: string): number {
  // Remove thousand separators (dots) then replace comma decimal separator.
  return parseFloat(value.replace(/\./g, '').replace(',', '.'));
}
