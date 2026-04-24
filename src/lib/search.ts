import Fuse from 'fuse.js';

export type SearchItem = {
  _id: string;
  title: string;
  excerpt: string;
  type: string;
  slug: string;
  publishedAt: string;
  tagNames: string[];
};

export function buildSearcher(items: SearchItem[]) {
  return new Fuse(items, {
    keys: [
      { name: 'title', weight: 0.6 },
      { name: 'excerpt', weight: 0.25 },
      { name: 'tagNames', weight: 0.15 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
  });
}
