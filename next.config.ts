import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@azure/identity',
    '@azure/arm-compute',
    '@azure/arm-resources',
    '@aws-sdk/client-sts',
    '@aws-sdk/client-ec2',
    '@aws-sdk/client-cloudwatch',
    'mongoose',
    'prom-client',
  ],
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: {
    position: 'bottom-right',
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
