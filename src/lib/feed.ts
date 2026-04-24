import { Feed } from 'feed';
import type { Post } from '@/types/content';

export function buildRssFeed({ posts, siteUrl }: { posts: Post[]; siteUrl: string }): string {
  const feed = new Feed({
    title: 'Muath Taha — @mtaha3',
    description: 'Writing on AI, product, and what I\'m learning.',
    id: siteUrl,
    link: siteUrl,
    language: 'en',
    favicon: `${siteUrl}/favicon.ico`,
    copyright: `© ${new Date().getFullYear()} Muath Taha`,
    feedLinks: { rss2: `${siteUrl}/rss.xml` },
    author: { name: 'Muath Taha', link: siteUrl },
  });

  for (const post of posts) {
    feed.addItem({
      title: post.title,
      id: `${siteUrl}/post/${post.slug}`,
      link: `${siteUrl}/post/${post.slug}`,
      description: post.excerpt,
      date: new Date(post.publishedAt),
    });
  }

  return feed.rss2();
}
