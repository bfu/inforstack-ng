export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['core', 'api', 'layout', 'pages', 'shared', 'store', 'styles', 'deps', 'build', 'docs', 'test'],
    ],
  },
};
