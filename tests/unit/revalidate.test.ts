import { describe, it, expect, vi, beforeEach } from 'vitest';

const revalidatePath = vi.fn();
const parseBody = vi.fn();

vi.mock('next/cache', () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));
vi.mock('next-sanity/webhook', () => ({ parseBody: (...a: unknown[]) => parseBody(...a) }));
vi.mock('@/lib/env', () => ({ serverEnv: { SANITY_WEBHOOK_SECRET: 'test-secret' } }));

const { POST } = await import('@/app/api/revalidate/route');

/** Paths passed to revalidatePath for a given webhook document. */
async function pathsFor(body: { _type: string; slug?: { current: string } }) {
  revalidatePath.mockClear();
  parseBody.mockResolvedValue({ body, isValidSignature: true });
  const res = await POST(new Request('http://localhost/api/revalidate', { method: 'POST' }) as never);
  expect(res.status).toBe(200);
  return revalidatePath.mock.calls.map((c) => c[0] as string);
}

describe('revalidate webhook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refreshes the post, its lists, the feed and the search index', async () => {
    const paths = await pathsFor({ _type: 'post', slug: { current: 'hello' } });
    expect(paths).toEqual(
      expect.arrayContaining(['/post/hello', '/', '/essays', '/notes', '/rss.xml', '/api/search-index'])
    );
  });

  it('refreshes /work for an experience edit', async () => {
    expect(await pathsFor({ _type: 'experience' })).toEqual(['/work']);
  });

  it('refreshes /books for a book edit', async () => {
    expect(await pathsFor({ _type: 'book' })).toEqual(['/books']);
  });

  it('refreshes the projects list and the writeup page for a project', async () => {
    const paths = await pathsFor({ _type: 'project', slug: { current: 'shelfmark' } });
    expect(paths).toEqual(['/projects', '/work/shelfmark']);
  });

  it('refreshes only the list when a project has no slug', async () => {
    expect(await pathsFor({ _type: 'project' })).toEqual(['/projects']);
  });

  it('refreshes the whole layout tree for site settings, since the footer is everywhere', async () => {
    revalidatePath.mockClear();
    parseBody.mockResolvedValue({ body: { _type: 'siteSettings' }, isValidSignature: true });
    await POST(new Request('http://localhost/api/revalidate', { method: 'POST' }) as never);
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });

  it('rejects an invalid signature without revalidating anything', async () => {
    parseBody.mockResolvedValue({ body: { _type: 'post' }, isValidSignature: false });
    const res = await POST(new Request('http://localhost/api/revalidate', { method: 'POST' }) as never);
    expect(res.status).toBe(401);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
