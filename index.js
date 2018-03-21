// @flow
'use strict';
const webpackBundleSizeAnalyzer = require('webpack-bundle-size-analyzer');
const prettyBytes = require('pretty-bytes');
const spawndamnit = require('spawndamnit');
const promisify = require('util.promisify');
const pLimit = require('p-limit');
const mkdirp = require('mkdirp');
const chalk = require('chalk');
const tempy = require('tempy');
const zlib = require('zlib');
const path = require('path');
const bolt = require('bolt');
const os = require('os');
const fs = require('fs');

const ensureDir = promisify(mkdirp);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const gzip = promisify(zlib.gzip);

const WEBPACK_BIN = require.resolve('webpack-cli/bin/webpack');

/*::
type Opts = {
  output?: string,
  json?: boolean,
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

async function boltWebpackStats(opts /*: Opts | void */) {
  opts = opts || {};

  let cwd = opts.cwd || process.cwd();
  let output = opts.output || false;
  let tempDir = tempy.directory();
  let webpackArgs = opts.webpackArgs || [];
  let concurrency = opts.concurrency || os.cpus().length;
  let continueOnError = opts.continueOnError || false;
  let json = typeof opts.json === 'undefined' ? true : opts.json;
  let log = json ? console.error : console.log;

  if (!webpackArgs.length) {
    webpackArgs.push('--mode', 'production');
  }

  let limit = pLimit(concurrency);
  let files = [];
  let stats = { packages: [] };
  let error = null;

  let packages = await bolt.getWorkspaces({
    cwd,
    only: opts.only,
    ignore: opts.ignore,
    onlyFs: opts.onlyFs,
    ignoreFs: opts.ignoreFs,
  });

  await Promise.all(packages.map(async pkg => {
    let args = [...webpackArgs];

    args.push('--output-path', tempDir);
    args.push('--output-filename', pkg.name + '.js');
    args.push('--json');

    await limit(async () => {
      let res;

      try {
        log(chalk.cyan(`Building ${pkg.name}...`));
        res = await spawndamnit(WEBPACK_BIN, args, { cwd: pkg.dir });
      } catch (err) {
        if (continueOnError) {
          log(chalk.red(`Errored in ${pkg.name}!`));
          if (!error) error = err;
          return;
        } else {
          throw err;
        }
      }

      let fileContents = await readFile(path.join(tempDir, pkg.name + '.js'));
      let fileSize = Buffer.byteLength(fileContents);
      let gzipSize = Buffer.byteLength(await gzip(fileContents, { level: 9 }));

      let bundleStatsJson = res.stdout.toString();
      let bundleStats = JSON.parse(bundleStatsJson);
      let depTrees = webpackBundleSizeAnalyzer.dependencySizeTree(bundleStats);

      stats.packages.push({
        pkgName: pkg.name,
        fileSize,
        gzipSize,
        bundleStats,
        depTrees,
      });
    });
  }));

  if (json) {
    console.log(JSON.stringify(stats, null, 2));
  }

  if (output) {
    await ensureDir(path.dirname(output));
    await writeFile(output, JSON.stringify(stats, null, 2));
  }

  log();
  log(chalk.bgMagenta(' Package Stats: '));

  for (let pkg of stats.packages) {
    log();
    log(chalk.yellow.underline(`${pkg.pkgName} (size: ${prettyBytes(pkg.fileSize)}, gzip: ${prettyBytes(pkg.gzipSize)})`));

    for (let tree of pkg.depTrees) {
      webpackBundleSizeAnalyzer.printDependencySizeTree(tree, true, 0, log);
    }
  }

  log();

  if (error) {
    throw error;
  }

  return stats;
}

module.exports = boltWebpackStats;
