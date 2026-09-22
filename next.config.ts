import type { NextConfig } from 'next';

const giscusOrigins = 'https://giscus.app';
const gaOrigins = 'https://www.googletagmanager.com https://www.google-analytics.com';
const sanityOrigins = 'https://cdn.sanity.io https://*.api.sanity.io';

/**
 * Sanity's Presentation tool previews the site inside an iframe, so the studio
 * origins have to be allowed to frame us: the cloud-hosted studio
 * (sanity.io/@org/studio/…) and any `sanity deploy` studio (*.sanity.studio).
 * The studio embedded at /studio is covered by 'self'.
 *
 * X-Frame-Options can't express an allowlist (ALLOW-FROM is dead), so content
 * pages rely on frame-ancestors, which every current browser honours.
 */
const studioFrameAncestors = [
  `'self'`,
  'https://sanity.io',
  'https://*.sanity.io',
  'https://*.sanity.studio',
].join(' ');

const csp = (frameAncestors: string) =>
  [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${giscusOrigins} ${gaOrigins}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${sanityOrigins} https://avatars.githubusercontent.com`,
    `font-src 'self' data:`,
    `connect-src 'self' ${giscusOrigins} ${gaOrigins} ${sanityOrigins}`,
    // 'self' lets the studio embedded at /studio frame the site for Presentation previews.
    `frame-src 'self' ${giscusOrigins}`,
    `frame-ancestors ${frameAncestors}`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ');

const baseHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const config: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io' },
    ],
  },
  async headers() {
    return [
      {
        // Content pages: framable by the Sanity studio so Presentation previews work.
        source: '/(.*)',
        headers: [
          ...baseHeaders,
          { key: 'Content-Security-Policy', value: csp(studioFrameAncestors) },
        ],
      },
      {
        // The studio itself carries an authenticated session — keep it unframable.
        // Later matches win, so these override the rule above.
        source: '/studio',
        headers: [
          ...baseHeaders,
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: csp(`'none'`) },
        ],
      },
      {
        source: '/studio/:path*',
        headers: [
          ...baseHeaders,
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: csp(`'none'`) },
        ],
      },
    ];
  },
};

export default config;
