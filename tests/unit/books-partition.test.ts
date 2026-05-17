import { describe, it, expect } from 'vitest';
import { partitionBooks } from '@/lib/books';
import type { Book } from '@/types/book';

const mk = (overrides: Partial<Book>): Book => ({
  _id: 'b1',
  title: 'T',
  author: 'A',
  cover: null,
  status: 'read',
  rating: null,
  finishedAt: null,
  takeaway: null,
  order: 100,
  ...overrides,
});

describe('partitionBooks', () => {
  it('groups books by status', () => {
    const books: Book[] = [
      mk({ _id: 'a', status: 'read' }),
      mk({ _id: 'b', status: 'reading' }),
      mk({ _id: 'c', status: 'want' }),
      mk({ _id: 'd', status: 'read' }),
    ];
    const result = partitionBooks(books);
    expect(result.read).toHaveLength(2);
    expect(result.reading).toHaveLength(1);
    expect(result.want).toHaveLength(1);
  });

  it('sorts read by finishedAt desc, nulls last', () => {
    const books: Book[] = [
      mk({ _id: 'a', status: 'read', finishedAt: '2026-01-01' }),
      mk({ _id: 'b', status: 'read', finishedAt: null }),
      mk({ _id: 'c', status: 'read', finishedAt: '2026-05-01' }),
    ];
    const result = partitionBooks(books);
    expect(result.read.map((b) => b._id)).toEqual(['c', 'a', 'b']);
  });

  it('sorts reading and want by order asc', () => {
    const books: Book[] = [
      mk({ _id: 'a', status: 'reading', order: 30 }),
      mk({ _id: 'b', status: 'reading', order: 10 }),
      mk({ _id: 'c', status: 'want', order: 200 }),
      mk({ _id: 'd', status: 'want', order: 50 }),
    ];
    const result = partitionBooks(books);
    expect(result.reading.map((b) => b._id)).toEqual(['b', 'a']);
    expect(result.want.map((b) => b._id)).toEqual(['d', 'c']);
  });

  it('returns empty arrays for empty input', () => {
    const result = partitionBooks([]);
    expect(result).toEqual({ read: [], reading: [], want: [] });
  });
});
