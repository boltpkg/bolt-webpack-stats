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
      $ bolt-webpack-stats <...flags> [-- <...webpack-cli-flags>]

    Flags
      --output, -o [file name]   Write JSON out to a file
      --only [name glob]         Filter workspaces by name
      --ignore [name glob]       Filter workspaces out by name
      --only-fs [file glob]      Filter workspaces by file path
      --ignore-fs [file glob]    Filter workspaces out by file path
      --concurrency [number]     Number of Webpack processes to run at once (Default: # of CPUs)
      --continue-on-error        Continue running when there are errors in some workspaces
      --json                     Return JSON stdout (default when not TTY)

    Examples
      Get Webpack stats for all your workspaces
      $ bolt-webpack-stats

      Write all stats information to a file
      $ bolt-webpack-stats > stats.json
      $ bolt-webpack-stats --output stats.json

      Only get Webpack stats for workspaces in a sub directory:
      $ bolt-webpack-stats --only-fs "packages/frontend/**"

      Specify your own Webpack config file:
      $ bolt-webpack-stats -- --config $(pwd)/configs/webpack/production.config.js
  `,
  flags: {
    output: { type: 'string', alias: 'o' },
    only: { type: 'string' },
    onlyFs: { type: 'string' },
    ignore: { type: 'string' },
    ignoreFs: { type: 'string' },
    concurrency: { type: 'number' },
    continueOnError: { type: 'boolean' },
    '--': true
  },
});

let json;

if (typeof cli.flags.json === 'boolean') {
  json = cli.flags.json;
} else {
  json = !('isTTY' in process.stdout);
}

boltWebpackStats({
  output: cli.flags.output,
  json,
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
