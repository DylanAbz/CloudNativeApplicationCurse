module.exports = {
    root: true,
    env: {
        node: true,
        es2021: true,
    },
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script', // CommonJS
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
