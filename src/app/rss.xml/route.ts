import { NextResponse } from 'next/server';
import { getPosts } from '@/sanity/lib/queries';
import { buildRssFeed } from '@/lib/feed';

export const revalidate = 300;

export async function GET() {
  const posts = await getPosts(50);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const xml = buildRssFeed({ posts, siteUrl });
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
