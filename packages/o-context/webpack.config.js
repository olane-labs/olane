const path = require('path');
const webpack = require('webpack');
const packageJson = require('./package.json');

const createConfig = (target, entry, filename, format) => ({
  entry,
  target,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename,
    library: {
      type: format,
    },
    globalObject: 'this',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        include: [
          /src\/.*/,
          /node_modules\/@olane\/o-protocol\/schema\/v1.0.0/,
        ],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.npm_package_version': JSON.stringify(packageJson.version),
    }),
  ],
  experiments: {
    outputModule: format === 'module',
  },
});

module.exports = [
  createConfig('node', './src/index.ts', 'index.js', 'commonjs2'),
];
