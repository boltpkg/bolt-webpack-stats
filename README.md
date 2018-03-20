# bolt-webpack-stats

> Get Webpack stats for all your Bolt workspaces

## Install

```sh
yarn add --dev bolt-webpack-stats
```

## Usage

```sh
bolt-webpack-stats
```

This will create a directory `./webpack-stats` relative to your `cwd` which has
files like this:

```sh
/webpack-stats/
  package-name-1.json
  package-name-2.json
  package-name-3.json
  /@maybe-npm-scope/
    package-name-4.json
    package-name-5.json
    package-name-6.json
```

These will match up with all of your package names.

You can also specify whatever Webpack flags you want to the `webpack` CLI by
passing them in with `--`:

```sh
bolt-webpack-stats ./webpack-stats -- --config ./path/to/webpack.config.js
```

For all the options, run `bolt-webpack-stats --help`.
