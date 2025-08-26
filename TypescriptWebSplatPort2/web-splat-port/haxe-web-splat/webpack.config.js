const CompressionPlugin = require("compression-webpack-plugin");
const path = require('path');

module.exports = {
  devtool: 'source-map',
  //mode:"development",
  mode: 'production',
  entry: './intermediate/web_splat.js',
  output: {
    filename: 'web_splat.js',
    path: path.resolve(__dirname, 'dist', 'js'),
  },
  resolve: {
    //root:  path.resolve(__dirname, '..'),
    alias: {
      'node_modules': path.join(__dirname, '../', 'node_modules'),  
    }
  },
  plugins: [new CompressionPlugin()],
  module: {
   rules: [
      {
        test: /\.js$/,
        enforce: "pre",
        use: ["source-map-loader"],
      }
    ],
  },
};