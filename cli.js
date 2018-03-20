#!/usr/bin/env node
// @flow
'use strict';

const meow = require('meow');
const path = require('path');
const chalk = require('chalk');
const spawndamnit = require('spawndamnit');
const boltWebpackStats = require('./');

let cli = meow({
  help: `
    Usage
      $ bolt-webpack-stats [path/to/output] <...flags> [-- <...webpack-cli-flags>]

    Flags
      --only [name glob]         Filter workspaces by name (unimplemented)
      --ignore [name glob]       Filter workspaces out by name (unimplemented)
      --only-fs [file glob]      Filter workspaces by file path (unimplemented)
      --ignore-fs [file glob]    Filter workspaces out by file path (unimplemented)
      --concurrency [number]     Number of Webpack processes to run at once (Default: # of CPUs)
      --continue-on-error        Continue running when there are errors in some workspaces

    Examples
      Default to using ./webpack-stats directory:
      $ bolt-webpack-stats

      Only build webpack bundles for workspaces in a sub directory: (unimplemented)
      $ bolt-webpack-stats --only-fs ./ui/*

      Specify your own Webpack config file:
      $ bolt-webpack-stats -- --config $(pwd)/configs/webpack/production.config.js
  `,
  flags: {
    only: { type: 'string' },
    onlyFs: { type: 'string' },
    ignore: { type: 'string' },
    ignoreFs: { type: 'string' },
    concurrency: { type: 'number' },
    continueOnError: { type: 'boolean' },
    '--': true
  },
});

boltWebpackStats({
  outputDir: cli.input[0],
  only: cli.flags.only,
  ignore: cli.flags.ignore,
  onlyFs: cli.flags.onlyFs,
  ignoreFs: cli.flags.ignoreFs,
  concurrency: cli.flags.concurrency,
  continueOnError: cli.flags.continueOnError,
  webpackArgs: cli.flags['--'],
}).catch(err => {
  if (err instanceof spawndamnit.ChildProcessError) {
    console.error(chalk.red(err.stdout.toString()));
    console.error(chalk.red(err.stderr.toString()));
    process.exit(err.code);
  } else {
    console.error(chalk.red(err));
    process.exit(1);
  }
});
