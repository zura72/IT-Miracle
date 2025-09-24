module.exports = {
  rules: {
    'no-console': 'off',
  },
  overrides: [
    {
      files: ['**/*.js', '**/*.jsx'],
      rules: {
        'import/no-unresolved': 'off',
        'import/extensions': 'off'
      }
    }
  ]
};