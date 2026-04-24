import { describe, it, expect } from 'vitest';
import { buildRssFeed } from '@/lib/feed';
import type { Post } from '@/types/content';

const posts: Post[] = [
  {
    _id: '1',
    title: 'Hello',
    slug: 'hello',
    type: 'essay',
    excerpt: 'greet',
    body: [],
    publishedAt: '2026-04-01T10:00:00Z',
  },
];

describe('buildRssFeed', () => {
  it('includes post title and link', () => {
    const xml = buildRssFeed({ posts, siteUrl: 'https://mtaha3.bio' });
    expect(xml).toContain('Hello');
    expect(xml).toContain('https://mtaha3.bio/post/hello');
  });
});
