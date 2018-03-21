// @flow
'use strict';
const webpackBundleSizeAnalyzer = require('webpack-bundle-size-analyzer');
const spawndamnit = require('spawndamnit');
const promisify = require('util.promisify');
const pLimit = require('p-limit');
const mkdirp = require('mkdirp');
const chalk = require('chalk');
const tempy = require('tempy');
const path = require('path');
const bolt = require('bolt');
const fs = require('fs');
const os = require('os');

const writeFile = promisify(fs.writeFile);
const ensureDir = promisify(mkdirp);

const WEBPACK_BIN = require.resolve('webpack-cli/bin/webpack');

/*::
type Opts = {
  outputDir?: string,
  webpackArgs?: Array<string>,
  only?: string,
  ignore?: string,
  onlyFs?: string,
  ignoreFs?: string,
  cwd?: string,
  concurrency?: number,
  continueOnError?: boolean,
};
*/

function boltWebpackStats(opts /*: Opts | void */) {
  opts = opts || {};

  let cwd = opts.cwd || process.cwd();
  let outputDir = path.resolve(cwd, opts.outputDir || './webpack-stats');
  let tempDir = tempy.directory();
  let webpackArgs = opts.webpackArgs || [];
  let concurrency = opts.concurrency || os.cpus().length;
  let continueOnError = opts.continueOnError || false;

  if (!webpackArgs.length) {
    webpackArgs.push('--mode', 'production');
  }

  let limit = pLimit(concurrency);

  return bolt.getWorkspaces({
    cwd,
    only: opts.only,
    ignore: opts.ignore,
    onlyFs: opts.onlyFs,
    ignoreFs: opts.ignoreFs,
  }).then(packages => {
    return Promise.all(packages.map(pkg => {
      let args = [...webpackArgs];

      args.push('--output-path', tempDir);
      args.push('--output-filename', pkg.name + '.js');
      args.push('--json');

      return limit(() => {
        console.log(chalk.cyan(`Building ${pkg.name}...`));

        return spawndamnit(WEBPACK_BIN, args, { cwd: pkg.dir }).then(res => {
          return { name: pkg.name, stdout: res.stdout };
        }).catch(err => {
          if (continueOnError) {
            console.error(chalk.red(`Errored in ${pkg.name}!`));
            return { name: pkg.name, error: err };
          } else {
            throw err;
          }
        });
      });
    })).then(results => {
      let error = null;

      return ensureDir(outputDir).then(() => {
        return Promise.all(results.map((res, index) => {
          if (!res.error) {
            return writeFile(path.resolve(outputDir, res.name + '.json'), res.stdout).then(() => {
              let bundleStats = JSON.parse(res.stdout.toString());
              let depTrees = webpackBundleSizeAnalyzer.dependencySizeTree(bundleStats);

              depTrees.forEach(tree => {
                console.log(chalk.yellow.bold.underline(res.name));
                webpackBundleSizeAnalyzer.printDependencySizeTree(tree, true);
              });
            });
          } else if (!error) {
            error = res.error;
          }
        }))
      }).then(() => {
        if (error) throw error;
      });
    });
  });
}

module.exports = boltWebpackStats;
