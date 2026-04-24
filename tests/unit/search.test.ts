import { describe, it, expect } from 'vitest';
import { buildSearcher } from '@/lib/search';

const items = [
  { _id: '1', title: 'Shipping seven products', excerpt: 'how FIBRA works', type: 'essay', slug: 'a', publishedAt: '2026-04-18', tagNames: ['product'] },
  { _id: '2', title: 'Quiet power of finishing', excerpt: 'about momentum', type: 'note', slug: 'b', publishedAt: '2026-04-11', tagNames: ['life'] },
];

describe('buildSearcher', () => {
  it('matches title', () => {
    const fuse = buildSearcher(items);
    const hits = fuse.search('seven products');
    expect(hits[0]?.item._id).toBe('1');
  });

  it('matches tag', () => {
    const fuse = buildSearcher(items);
    const hits = fuse.search('life');
    expect(hits[0]?.item._id).toBe('2');
  });
});
