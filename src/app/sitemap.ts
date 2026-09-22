import type { MetadataRoute } from 'next';
import { getAllPostSlugs, getAllTags, getProjects } from '@/sanity/lib/queries';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mtaha3.bio';
  const [slugs, tags, projects] = await Promise.all([
    getAllPostSlugs(),
    getAllTags(),
    getProjects(),
  ]);
  const now = new Date();

  return [
    { url: `${siteUrl}/`, lastModified: now, priority: 1.0 },
    { url: `${siteUrl}/essays`, lastModified: now, priority: 0.8 },
    { url: `${siteUrl}/notes`, lastModified: now, priority: 0.7 },
    { url: `${siteUrl}/books`, lastModified: now, priority: 0.7 },
    // '/work' is deliberately absent while unlisted — see work/page.tsx.
    { url: `${siteUrl}/projects`, lastModified: now, priority: 0.7 },
    { url: `${siteUrl}/about`, lastModified: now, priority: 0.6 },
    { url: `${siteUrl}/search`, lastModified: now, priority: 0.4 },
    ...slugs.map((s) => ({
      url: `${siteUrl}/post/${s}`,
      lastModified: now,
      priority: 0.9,
    })),
    ...tags.map((t) => ({
      url: `${siteUrl}/tag/${t.slug}`,
      lastModified: now,
      priority: 0.4,
    })),
    ...projects.map((p) => ({
      // Writeups render at /work/[slug], not /projects/[slug] — the latter has
      // no route, so the sitemap was advertising URLs that 404.
      url: p.writeup ? `${siteUrl}/work/${p.slug}` : `${siteUrl}/projects`,
      lastModified: now,
      priority: 0.5,
    })),
  ];
}
