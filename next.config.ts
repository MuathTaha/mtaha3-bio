import type { NextConfig } from 'next';

const giscusOrigins = 'https://giscus.app';
const gaOrigins = 'https://www.googletagmanager.com https://www.google-analytics.com';
const sanityOrigins = 'https://cdn.sanity.io https://*.api.sanity.io';

const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${giscusOrigins} ${gaOrigins}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${sanityOrigins} https://avatars.githubusercontent.com`,
  `font-src 'self' data:`,
  `connect-src 'self' ${giscusOrigins} ${gaOrigins} ${sanityOrigins}`,
  `frame-src ${giscusOrigins}`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
].join('; ');

const config: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

export default config;
