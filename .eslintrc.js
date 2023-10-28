module.exports = {
    // parser: 'vue-eslint-parser',
    root: true,
    env: {
        node: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:vue/vue3-essential',
        '@vue/typescript/recommended',
        '@vue/prettier',
        '@vue/eslint-config-typescript',
        '@vue/eslint-config-prettier',
        './packages/vueye-table/.eslintrc-auto-import.json',
    ],
    parserOptions: {
        parser: '@typescript-eslint/parser',
        ecmaVersion: 'latest',
        ecmaFeatures: {
            jsx: false,
        },
    },
    rules: {
        'no-console': 'error',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'vue/multi-word-component-names': 'off',
        'vue/valid-v-slot': 'off',
        'no-use-before-define': 'off',
        'prettier/prettier': ['warn', { endOfLine: 'auto' }],
        '@typescript-eslint/no-inferrable-types': 'off',
        // '@typescript-eslint/indent': ['warn', 8],
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-var-requires': 0,
        '@typescript-eslint/no-explicit-any': 0,
        '@typescript-eslint/no-use-before-define': ['error', { functions: false, variables: false, classes: false }],
    },
    overrides: [
        {
            files: ['**/__tests__/*.{j,t}s', '**/tests/unit/**/*.spec.{j,t}s'],
            env: {
                jest: true,
            },
        },
    ],
}
