const path = require("path");
const webpack = require("webpack");

const isDev = process.env.NODE_ENV == "development";

module.exports = {
  mode: isDev ? "development":"production",
  entry: {
    scratchcard: "./index.js"
  },
  context: path.resolve(__dirname, "src"),
  watch: true,
  module: {
    rules: [{
      test: /\.tsx?$/,
      use: ["babel-loader", "ts-loader"],
      exclude: /node_modules/
    }]
  },
  resolve: {
    extensions: [".ts", ".js"],
    modules: [path.resolve(__dirname, "src"), "node_modules"]
  },
  output: {
    filename: isDev ? "[name].js":"[name].min.js",
    path: path.resolve(__dirname, "dist"),
    chunkFilename: "[name].bundle.js"
  },
  devServer: {
    compress: false,
    contentBase: path.join(__dirname, "public"),
    overlay: false,
    port: 9880,
    publicPath: "/assets/",
    watchContentBase: true,
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
  ],
};