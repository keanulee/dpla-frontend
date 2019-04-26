const webpack = require("webpack");
const dotenv = require("dotenv").config();
const withSass = require("@zeit/next-sass");
const withSourceMaps = require("@zeit/next-source-maps");
const withBundleAnalyzer = require("@zeit/next-bundle-analyzer");
const { LOCALS } = require("./constants/local");

module.exports = withBundleAnalyzer(
  withSourceMaps(
    withSass({
      cssModules: true,
      cssLoaderOptions: {
        importLoaders: 2,
        localIdentName: "[name]__[local]___[hash:base64:5]"
      },
      sassLoaderOptions: {
        includePaths: [
          // to allow SCSS files to import a plain “theme.scss” file
          "./stylesheets/themes" +
            (process.env.SITE_ENV === "local"
              ? "/" + LOCALS[process.env.LOCAL_ID].theme
              : "")
        ]
      },
      useFileSystemPublicRoutes: false,
      analyzeServer: ["server", "both"].includes(process.env.BUNDLE_ANALYZE),
      analyzeBrowser: ["browser", "both"].includes(process.env.BUNDLE_ANALYZE),
      bundleAnalyzerConfig: {
        server: {
          analyzerMode: "static",
          reportFilename: "../../bundles/server.html"
        },
        browser: {
          analyzerMode: "static",
          reportFilename: "../bundles/client.html"
        }
      },
      webpack: (config, options) => {
        const { dev, isServer } = options;

        config.plugins.push(
          new webpack.DefinePlugin({
            "process.env": {
              NODE_ENV: JSON.stringify(process.env.NODE_ENV)
            }
          })
        );

        config.plugins.push(
          new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/)
        );

        config.module.rules.push({
          test: /\.css$/,
          exclude: /node_modules/,
          use: [{ loader: "postcss-loader" }]
        });

        config.module.rules.push({
          test: /\.(jpe?g|png|gif|svg)$/i,
          loaders: ["file-loader?name=dist/static/images/[name].[ext]"]
        });

        // Only optimize browser code.
        if (!dev && !isServer) {
          // Include `@babel/runtime-corejs2/` in the commons bundle.
          config.optimization.splitChunks.cacheGroups["corejs"] = {
            name: "commons",
            chunks: "all",
            test: /[\\/]node_modules[\\/]@babel[\\/]runtime-corejs2[\\/]/
          };

          config.optimization.splitChunks = {
            ...config.optimization.splitChunks,
            maxInitialRequests: Infinity,
            cacheGroups: {
              ...config.optimization.splitChunks.cacheGroups,
              commons: {
                name: "commons",
                chunks: "all",
                minChunks: 35 // == total pages/entrypoints
              },
              vendors: {
                // test: /[\\/]node_modules[\\/]/,
                // https://hackernoon.com/the-100-correct-way-to-split-your-chunks-with-webpack-f8a9df5b7758
                // name(module) {
                //   // get the name. E.g. node_modules/packageName/not/this/part.js
                //   // or node_modules/packageName
                //   const packageName = module.context.match(
                //     /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                //   )[1];

                //   // npm package names are URL-safe, but some servers don't like @ symbols
                //   return `npm.${packageName.replace("@", "")}`;
                // },
                name: (module, chunks) => chunks.map(c => c.debugId).join("-"),
                minChunks: 2,
                minSize: 30000,
                priority: -10,
                reuseExistingChunk: true
              }
            }
          };

          // Load script with the plugin.
          config.module.rules.push({
            test: /\.(js|mjs|jsx)$/,
            exclude: /[\\/]node_modules[\\/]@babel[\\/]runtime-corejs2[\\/]/,
            use: {
              loader: "babel-loader",
              options: {
                babelrc: false,
                plugins: [
                  require.resolve("@babel/plugin-syntax-class-properties"),
                  require.resolve("@babel/plugin-syntax-jsx"),
                  require.resolve("@babel/plugin-syntax-object-rest-spread"),
                  // Add other syntax plugins here.

                  require("babel-plugin-optimize-helpers")
                ]
              }
            }
          });
        }

        return config;
      }
    })
  )
);
