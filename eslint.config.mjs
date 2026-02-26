import nextPlugin from 'eslint-config-next';

const config = [
  {
    ignores: ['coverage/', '.next/', 'node_modules/'],
  },
  ...nextPlugin,
];

export default config;
