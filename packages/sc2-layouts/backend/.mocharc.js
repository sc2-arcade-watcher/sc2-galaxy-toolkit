'use strict';

// This is a JavaScript-based config file containing every Mocha option plus others.
// If you need conditional logic, you might want to use this type of config,
// e.g. set options via environment variables 'process.env'.
// Otherwise, JSON or YAML is recommended.

/** @see https://github.com/mochajs/mocha/blob/8d0ca3ed77ba8a704b2aa8b58267a084a475a51b/example/config/.mocharc.js */

/** @type import('mocha').MochaInstanceOptions */
module.exports = {
    jobs: 2,
    parallel: true,
    recursive: true,
    require: [
        // 'ts-node/register',
        'source-map-support/register',
        'out/test/bootstrap.js',
    ],
    // loader: 'ts-node/esm',
    // extensions: [
    //     'js',
    // ],
    spec: [
        'out/test/**/*.test.js',
    ],
    timeout: 20000,
    // watch: true,
    'watch-files': [
        'out/src/**/*.js',
        'out/test/**/*.js',
        'test/fixtures/**/*',
    ],
};