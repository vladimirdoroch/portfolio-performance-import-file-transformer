import { readdir, stat } from 'fs/promises';
import { join } from 'path';

/**
 * Convert a simple glob pattern (only `*` and `?`) to a `RegExp`.
 * All other regex-special characters are escaped.
 */
export function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}

/**
 * Recursively collect files under `dir` whose names match `pattern`.
 *
 * @param dir     - Directory to search.
 * @param pattern - Compiled filename pattern.
 * @returns Absolute paths of all matching files, in directory-walk order.
 */
export async function collectFiles(dir: string, pattern: RegExp): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectFiles(full, pattern)));
    } else if (entry.isFile() && pattern.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Resolve a file or directory path to a flat list of matching file paths.
 *
 * When `input` is a file, it is returned as a single-element array regardless
 * of whether its name matches `pattern`.  When `input` is a directory, the
 * tree is searched recursively for files matching `pattern`.
 *
 * @param input   - File or directory path.
 * @param pattern - Compiled filename pattern (used only when `input` is a directory).
 * @returns Array of absolute file paths.  Empty when no files are found.
 */
export async function resolveInputFiles(input: string, pattern: RegExp): Promise<string[]> {
  const info = await stat(input);
  if (info.isDirectory()) {
    return collectFiles(input, pattern);
  }
  return [input];
}
