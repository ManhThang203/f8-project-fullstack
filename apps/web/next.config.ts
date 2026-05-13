import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@threads/shared'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
