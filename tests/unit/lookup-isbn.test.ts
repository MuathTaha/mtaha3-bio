import { describe, it, expect, vi, afterEach } from 'vitest';

// Stub Sanity SDK so the Studio-integration parts of the module don't crash
// in jsdom. Only fetchBookByIsbn (the pure helper) is exercised here.
vi.mock('sanity', () => ({
  useDocumentOperation: vi.fn(),
  useToast: vi.fn(),
  useClient: vi.fn(),
}));

import { fetchBookByIsbn } from '@/sanity/actions/lookupISBN';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchBookByIsbn', () => {
  it('returns title, author, and cover URL on success', async () => {
    const body = {
      'ISBN:9780553573404': {
        title: 'A Game of Thrones',
        authors: [{ name: 'George R. R. Martin' }],
        cover: { large: 'https://covers.openlibrary.org/b/id/1.jpg', medium: 'https://covers.openlibrary.org/b/id/2.jpg' },
      },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchBookByIsbn('9780553573404');

    expect(result).toEqual({
      kind: 'ok',
      title: 'A Game of Thrones',
      author: 'George R. R. Martin',
      coverUrl: 'https://covers.openlibrary.org/b/id/1.jpg',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://openlibrary.org/api/books?bibkeys=ISBN:9780553573404&jscmd=data&format=json'
    );
  });

  it('falls back to cover.medium when large is missing', async () => {
    const body = {
      'ISBN:1': {
        title: 'X',
        authors: [{ name: 'Y' }],
        cover: { medium: 'https://covers.openlibrary.org/b/id/2.jpg' },
      },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) }));

    const result = await fetchBookByIsbn('1');

    expect(result).toEqual({
      kind: 'ok',
      title: 'X',
      author: 'Y',
      coverUrl: 'https://covers.openlibrary.org/b/id/2.jpg',
    });
  });

  it('returns title and author when no cover at all', async () => {
    const body = {
      'ISBN:1': {
        title: 'X',
        authors: [{ name: 'Y' }],
      },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) }));

    const result = await fetchBookByIsbn('1');

    expect(result).toEqual({ kind: 'ok', title: 'X', author: 'Y', coverUrl: null });
  });

  it('returns not-found when OpenLibrary has no record', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));

    const result = await fetchBookByIsbn('0000000000');

    expect(result).toEqual({ kind: 'not-found' });
  });

  it('returns error on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));

    const result = await fetchBookByIsbn('1');

    expect(result.kind).toBe('error');
  });
});
