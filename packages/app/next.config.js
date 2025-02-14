require('@next/env').loadEnvConfig('./');

const withPlugins = require('next-compose-plugins');
const LodashModuleReplacementPlugin = require('lodash-webpack-plugin');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
const withTranspileModules = require('next-transpile-modules')([
  'd3-geo',
  'd3-array',
  'globby',
  'internmap',
]);
const DuplicatePackageCheckerPlugin = require('duplicate-package-checker-webpack-plugin');
const path = require('path');

const nextConfig = {
  /**
   * Enables react strict mode
   * https://nextjs.org/docs/api-reference/next.config.js/react-strict-mode
   */
  reactStrictMode: true,

  i18n: {
    // These are all the locales you want to support in
    // your application
    locales: ['nl', 'en'],
    // This is the default locale you want to be used when visiting
    // a non-locale prefixed path e.g. `/hello` or a (sub)domain that's not mapped to a locale.
    defaultLocale: 'nl',
    // When localeDetection is set to false Next.js will no longer automatically
    // redirect based on the user's preferred locale and will only provide locale information
    // detected from either the locale based domain or locale path as described above.
    localeDetection: false,

    /**
     * Configure english domain when it's available on the environment variables
     */
    domains: [
      {
        domain: process.env.DOMAIN_EN ?? 'coronadashboard.government.nl',
        defaultLocale: 'en',
      },
    ],
  },

  /**
   * More header management is done by the next.server.js for the HTML pages and JS/CSS assets.
   */
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|woff|woff2)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=9999999999, must-revalidate',
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/landelijk',
        destination: '/landelijk/vaccinaties',
        permanent: false,
      },
    ];
  },

  /**
   * Enable source maps in production, because we want people to report readable
   * stack traces from the error boundaries feature.
   */
  productionBrowserSourceMaps: true,

  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      type: 'asset',
      use: 'svgo-loader',
      generator: {
        filename: 'static/image/[name].[hash][ext]',
      },
      parser: {
        dataUrlCondition: {
          maxSize: 2 * 1024, // only inline SVG's < 2kB
        },
      },
    });

    config.resolve.alias = {
      ...config.resolve.alias,
    };

    const duplicatePackageResolves = [
      [
        '@emotion/memoize',
        '../../node_modules/@styled-system/should-forward-prop/node_modules/@emotion/memoize',
      ],
      [
        '@sanity/generate-help-url',
        '../../node_modules/@sanity/generate-help-url',
      ],
      ['react-is', '../../node_modules/react-is'],
      [
        'unist-util-visit-parents',
        '../../node_modules/unist-util-visit-parents',
      ],
      ['d3-array', './node_modules/d3-array'],
      ['d3-color', '../../node_modules/d3-interpolate/node_modules/d3-color'],
      ['d3-geo', '../../node_modules/d3-geo'],
      ['d3-interpolate', '../../node_modules/d3-interpolate'],
      ['internmap', '../../node_modules/internmap'],
      ['balanced-match', '../../node_modules/balanced-match'],
    ];

    duplicatePackageResolves.forEach(([packageName, resolvedPath]) => {
      config.resolve.alias[packageName] = path.resolve(__dirname, resolvedPath);
    });

    config.plugins.push(
      new LodashModuleReplacementPlugin({
        // See https://github.com/lodash/lodash-webpack-plugin#feature-sets
        paths: true,
      })
    );

    if (process.env.NODE_ENV === 'production') {
      config.plugins.push(
        new DuplicatePackageCheckerPlugin({
          verbose: true,
          showHelp: true,
        })
      );
    }

    return config;
  },
};

const plugins = [withBundleAnalyzer];

module.exports = withPlugins(plugins, withTranspileModules(nextConfig));
