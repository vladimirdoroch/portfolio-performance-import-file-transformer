// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'vitest.config.js',
      'vitest.config.d.ts',
      // Old source directories (kept for backward-compat during transition)
      'src/comdirect/**',
      'src/dkb/**',
      'src/degiro/**',
      'src/coinbase/**',
      'src/portfolio_performance/**',
      // Old test directories (kept until cleanup)
      'test/securities_account/**',
      'test/portfolio_transactions/**',
    ],
  },

  // Base JS rules
  eslint.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Rule overrides
  {
    rules: {
      // Allow explicit `any` in the runner's raw-objects bucket (JSON output)
      '@typescript-eslint/no-explicit-any': 'warn',
      // Prefer `import type` for type-only imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Warn on unused vars except when prefixed with _
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Disable formatting rules (Prettier handles those)
  prettierConfig,
);
