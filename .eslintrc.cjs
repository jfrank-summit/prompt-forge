module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'eslint-config-prettier',
  ],
  plugins: ['prettier'],
  rules: {
    // Prettier integration
    'prettier/prettier': 'error',
    
    // Prefer arrow functions
    'prefer-arrow-callback': 'error',
    
    // Immutability preferences
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Code quality
    'no-console': 'off', // Allow console for server logging
    'eqeqeq': 'error',
    'curly': 'error',
  },
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.js'],
}; 