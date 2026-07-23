module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  ignorePatterns: ['dist', 'server/dist', 'node_modules', 'server/node_modules'],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: ['eslint:recommended', 'plugin:react-hooks/recommended'],
  rules: {
    'no-undef': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'react-refresh/only-export-components': 'off',
    'react-hooks/exhaustive-deps': 'off',
  },
};
