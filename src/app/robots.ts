import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mtaha.bio';
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/studio', '/api', '/api/preview'] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
