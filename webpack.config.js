const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    background: './background.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  devtool: 'cheap-module-source-map', // or 'source-map' for more detailed maps
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  resolve: {
    fallback: {
      "fs": false,
      "path": false,
      "crypto": false
    }
  }
};
