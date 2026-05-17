import { describe, it, expect, vi } from 'vitest';
import type { SanityClient } from 'next-sanity';
import { getBooks } from '@/sanity/lib/queries';

describe('getBooks', () => {
  it('returns all books from Sanity', async () => {
    const fakeBooks = [
      { _id: 'a', title: 'A', author: 'X', cover: null, status: 'read', rating: 5, finishedAt: '2026-01-01', takeaway: 'good', order: 100 },
      { _id: 'b', title: 'B', author: 'Y', cover: null, status: 'reading', rating: null, finishedAt: null, takeaway: null, order: 10 },
    ];
    const fetch = vi.fn().mockResolvedValue(fakeBooks);
    const client = { fetch } as unknown as SanityClient;

    const result = await getBooks(client);

    expect(fetch).toHaveBeenCalledOnce();
    const groqArg = fetch.mock.calls[0][0] as string;
    expect(groqArg).toContain('_type == "book"');
    expect(result).toEqual(fakeBooks);
  });
});
