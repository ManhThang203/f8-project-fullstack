import base from './base.js';
import globals from 'globals';

export default [
  ...base,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-process-exit': 'off',
    },
  },
];
