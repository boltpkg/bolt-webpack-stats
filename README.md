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

To write stats to a file, you can run:

```sh
bolt-webpack-stats -o stats.json
bolt-webpack-stats > stats.json
```

You can also specify whatever Webpack flags you want to the `webpack` CLI by
passing them in with `--`:

```sh
bolt-webpack-stats ./webpack-stats -- --config ./path/to/webpack.config.js
```

For all the options, run `bolt-webpack-stats --help`.
