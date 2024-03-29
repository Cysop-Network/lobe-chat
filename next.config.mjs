import nextPWA from '@ducanh2912/next-pwa';
import analyzer from '@next/bundle-analyzer';

const isProd = process.env.NODE_ENV === 'production';
const buildWithDocker = process.env.DOCKER === 'true';

// if you need to proxy the api endpoint to remote server
const API_PROXY_ENDPOINT = process.env.API_PROXY_ENDPOINT || '';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH;

const withBundleAnalyzer = analyzer({
  enabled: process.env.ANALYZE === 'true',
});

const withPWA = nextPWA({
  dest: 'public',
  register: true,
  workboxOptions: {
    skipWaiting: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: isProd,
  basePath,
  experimental: {
    optimizePackageImports: [
      'emoji-mart',
      '@emoji-mart/react',
      '@emoji-mart/data',
      '@icons-pack/react-simple-icons',
      '@lobehub/ui',
      'gpt-tokenizer',
      'chroma-js',
    ],
    webVitalsAttribution: ['CLS', 'LCP'],
  },

  output: buildWithDocker ? 'standalone' : undefined,

  rewrites: async () => [
    // due to google api not work correct in some countries
    // we need a proxy to bypass the restriction
    { source: '/api/chat/google', destination: `${API_PROXY_ENDPOINT}/api/chat/google` },
  ],
  reactStrictMode: true,

  webpack(config) {
    // Correctly set the optimization.splitChunks.maxSize
    if (!config.optimization.splitChunks) {
      config.optimization.splitChunks = {};
    }
    //config.optimization.splitChunks.enforceSizeThreshold = 26214400; // 25 MiB cloudflare limit
    config.optimization.splitChunks.enforceSizeThreshold = 30000; // Be tiny damnit
    config.optimization.splitChunks.cacheGroups = {
      common: {
        test: /[\\/]node_modules[\\/]/,
        priority: -5,
        reuseExistingChunk: true,
        chunks: "initial",
        name: "common_app",
        minSize: 0,
      },
      default: {
        minChunks: 2,
        priority: -20,
        reuseExistingChunk: true,
      },
      // we are opting out of defaultVendors, so rest of the node modules will be part of default cacheGroup
      defaultVendors: false,
      reactPackage: {
        test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
        name: 'vendor_react',
        chunks: "all",
        priority: 10,
      }
    },
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };

    // to fix shikiji compile error
    // refs: https://github.com/antfu/shikiji/issues/23
    config.module.rules.push({
      test: /\.m?js$/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    });

    return config;
  },
};

export default isProd ? withBundleAnalyzer(withPWA(nextConfig)) : nextConfig;
