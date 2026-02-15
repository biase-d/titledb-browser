module.exports = {
    root: true,
    extends: [
        'eslint:recommended'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2020,
        extraFileExtensions: ['.svelte']
    },
    env: {
        browser: true,
        es2020: true,
        node: true
    },
    globals: {
        $state: 'readonly',
        $derived: 'readonly',
        $effect: 'readonly',
        $props: 'readonly',
        $inspect: 'readonly',
        $host: 'readonly',
        localStorage: 'readonly',
        document: 'readonly',
        session: 'readonly',
        Image: 'readonly',
        navigator: 'readonly',
        Buffer: 'readonly',
        globalThis: 'readonly'
    },
    overrides: [
        {
            files: ['*.svelte'],
            parser: 'svelte-eslint-parser',
            parserOptions: {
                parser: '@typescript-eslint/parser'
            },
            rules: {
                'no-inner-declarations': 'off',
                'no-self-assign': 'off'
            }
        }
    ],
    rules: {
        'indent': 'off',
        'no-mixed-spaces-and-tabs': 'off',
        'quotes': ['error', 'single', { 'avoidEscape': true }],
        'semi': ['error', 'never'],
        'space-before-function-paren': ['error', 'always'],
        'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }],
        'no-undef': 'error',
        'no-case-declarations': 'off'
    }
}
