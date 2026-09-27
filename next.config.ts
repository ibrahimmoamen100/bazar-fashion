import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ─── Turbopack Alias: react-router-dom → Next.js compatibility shim ────────
  turbopack: {
    resolveAlias: {
      'react-router-dom': './src/lib/router-shim.tsx',
    },
  },

  // ─── Webpack Alias (for next build / production) ────────────────────────────
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-router-dom': require.resolve('./src/lib/router-shim.tsx'),
    };
    return config;
  },

  // ─── Compression (gzip / brotli) ────────────────────────────────────────────
  compress: true,

  // ─── Images ─────────────────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // أولوية AVIF ثم WebP
    formats: ['image/avif', 'image/webp'],
    // Cache الصور المُحسَّنة لمدة سنة
    minimumCacheTTL: 31536000,
    // أحجام الشاشات المستخدمة في المشروع
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // أحجام صور البطاقات والمنتجات
    imageSizes: [64, 128, 256, 384, 512],
  },

  // ─── Transpile ESM-only packages ────────────────────────────────────────────
  transpilePackages: ['react-quill-new'],

  // ─── Logging ────────────────────────────────────────────────────────────────
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // ─── HTTP Headers ───────────────────────────────────────────────────────────
  async headers() {
    return [
      // ── Security headers for all routes ──
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      // ── Static assets: cache 1 year immutable ──
      {
        source: '/(.*)\\.(ico|png|jpg|jpeg|gif|webp|avif|svg|woff|woff2|ttf|otf)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
