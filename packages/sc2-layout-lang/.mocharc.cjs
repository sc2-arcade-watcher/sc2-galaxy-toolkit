'use strict';
module.exports = {
  jobs: 2,
  parallel: true,
  recursive: true,
  require: ['lib/test/bootstrap.js'],
  spec: ['lib/test/**/*.test.js'],
  timeout: 20000,
  'watch-files': ['lib/src/**/*.js', 'lib/test/**/*.js', 'test/fixtures/**/*'],
};
