import globals from 'globals';
import pluginVue from 'eslint-plugin-vue';
import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier'; // Renamed to avoid conflict

export default [
  {
    // Ignore patterns (first item for consistency)
    ignores: ['dist/', 'node_modules/'],
  },
  {
    // Language options
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  // ESLint's recommended rules
  eslint.configs.recommended,
  // Vue essential rules
  ...pluginVue.configs['flat/essential'], // Spread this
  // Prettier configuration (last to override other rules)
  eslintConfigPrettier,
  {
    // Custom rules
    rules: {
      // Add any specific rules or overrides here
    },
  },
];