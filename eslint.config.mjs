import nextPlugin from 'eslint-config-next';
import tseslint from 'typescript-eslint';

const config = [
  {
    ignores: ['coverage/', '.next/', 'node_modules/'],
  },
  ...tseslint.configs.recommended,
  ...nextPlugin,
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/__tests__/**', 'src/**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'Do not use dangerouslySetInnerHTML without an approved sanitizer review.',
        },
        {
          selector: "CallExpression[callee.name='eval']",
          message: 'eval() is not allowed.',
        },
        {
          selector: "NewExpression[callee.name='Function']",
          message: 'new Function() is not allowed.',
        },
      ],
    },
  },
  {
    files: ['src/components/**/*.{ts,tsx}'],
    ignores: ['src/**/__tests__/**', 'src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/utils/supabase/**/*', '@supabase/**/*'],
              message: 'Use AuthContext or server utilities; do not call Supabase directly in UI.',
            },
          ],
        },
      ],
    },
  },
];

export default config;
