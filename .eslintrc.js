module.exports = {
  parser: 'vue-eslint-parser',
  root: true,
  env: {
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:vue/vue3-recommended', '@vue/typescript/recommended', '@vue/prettier'],
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2020,
    ecmaFeatures: {
      jsx: false,
    },
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-use-before-define': 'off',
    'vue/multi-word-component-names': 'off',
    'prettier/prettier': ['error', { endOfLine: 'auto' }],
    semi: 2,
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/indent': ['warn', 2],
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
};
