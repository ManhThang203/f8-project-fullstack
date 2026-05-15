import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';

import type { NextConfig } from 'next';

/**
 * Monorepo: Next mặc định chỉ đọc `.env` trong `apps/web/`. Nạp thêm `.env` / `.env.local`
 * ở **root repo** để `pnpm dev` thấy biến bạn đặt ở root (vd. `NEXT_PUBLIC_*`).
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
function loadRootEnvFile(name: string, override: boolean) {
  const file = path.join(repoRoot, name);
  if (fs.existsSync(file)) {
    dotenv.config({ path: file, override });
  }
}
loadRootEnvFile('.env', false);
loadRootEnvFile('.env.local', true);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@threads/shared'],
  experimental: {
    typedRoutes: true,
  },
  /** TypeScript ESM uses `.js` in import paths while sources are `.ts` — map for webpack. */
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
