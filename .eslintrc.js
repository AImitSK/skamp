/** @type {import('next').NextConfig} */
module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Temporäre Deaktivierung für Batch-Fix
    'react-hooks/exhaustive-deps': 'off',
    '@next/next/no-img-element': 'off',
    'react/no-unescaped-entities': 'off'
  }
};