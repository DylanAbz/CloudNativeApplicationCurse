module.exports = {
    root: true,
    env: {
        node: true,
        es2021: true,
        jest: true
    },
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module', // ES Modules
    },
    extends: [
        'eslint:recommended',
        'prettier',
    ],
    rules: {
        // Ajustements si besoin
        // 'no-console': 'off',
        // 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
    ignorePatterns: ['node_modules/', 'prisma/', 'eslint.config.js', '.prettierrc.cjs'],
};
