import { describe, it, expect, vi, beforeEach } from 'vitest';

const revalidatePath = vi.fn();
const parseBody = vi.fn();

vi.mock('next/cache', () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));
vi.mock('next-sanity/webhook', () => ({ parseBody: (...a: unknown[]) => parseBody(...a) }));
vi.mock('@/lib/env', () => ({ serverEnv: { SANITY_WEBHOOK_SECRET: 'test-secret' } }));

const { POST } = await import('@/app/api/revalidate/route');

type Body = { _type: string; slug?: { current: string } };
type Call = [string] | [string, 'page' | 'layout'];

/**
 * Full argument tuples passed to revalidatePath, not just the paths: the second
 * argument decides which tag is built, so a test that ignores it passes while
 * nothing is actually invalidated.
 */
async function callsFor(body: Body): Promise<Call[]> {
  revalidatePath.mockClear();
  parseBody.mockResolvedValue({ body, isValidSignature: true });
  const res = await POST(new Request('http://localhost/api/revalidate', { method: 'POST' }) as never);
  expect(res.status).toBe(200);
  return revalidatePath.mock.calls as Call[];
}

const isRoutePattern = (path: string) => path.includes('[');

describe('revalidate webhook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refreshes every post page, the lists, the tag pages, the feed and the search index', async () => {
    const calls = await callsFor({ _type: 'post', slug: { current: 'hello' } });
    expect(calls).toEqual(
      expect.arrayContaining<Call>([
        ['/post/[slug]', 'page'],
        ['/'],
        ['/essays'],
        ['/notes'],
        ['/tag/[slug]', 'page'],
        ['/rss.xml'],
        ['/api/search-index'],
      ])
    );
  });

  it('still refreshes post pages when a deleted post arrives with no slug', async () => {
    expect(await callsFor({ _type: 'post' })).toEqual(
      expect.arrayContaining<Call>([['/post/[slug]', 'page']])
    );
  });

  it('refreshes tag pages, post pages and the search index for a tag edit', async () => {
    expect(await callsFor({ _type: 'tag', slug: { current: 'ai' } })).toEqual([
      ['/tag/[slug]', 'page'],
      ['/post/[slug]', 'page'],
      ['/api/search-index'],
    ]);
  });

  it('refreshes /work for an experience edit', async () => {
    expect(await callsFor({ _type: 'experience' })).toEqual([['/work']]);
  });

  it('refreshes /books for a book edit', async () => {
    expect(await callsFor({ _type: 'book' })).toEqual([['/books']]);
  });

  it('refreshes the projects list and every writeup page for a project', async () => {
    expect(await callsFor({ _type: 'project', slug: { current: 'shelfmark' } })).toEqual([
      ['/projects'],
      ['/work/[slug]', 'page'],
    ]);
  });

  it('refreshes the whole layout tree for site settings, since the footer is everywhere', async () => {
    expect(await callsFor({ _type: 'siteSettings' })).toEqual([['/', 'layout']]);
  });

  it('refreshes the whole tree for an unmapped type rather than doing nothing', async () => {
    expect(await callsFor({ _type: 'somethingNew' })).toEqual([['/', 'layout']]);
  });

  /**
   * The bug this guards: `revalidatePath('/post/hello', 'page')` builds the tag
   * `_N_T_/post/hello/page`, but a rendered page is tagged `_N_T_/post/hello`
   * and `_N_T_/post/[slug]/page`. Pairing 'page' with a concrete path is always
   * a silent no-op, so 'page' may only ever accompany a route pattern.
   */
  it("never pairs 'page' with a concrete path", async () => {
    const bodies: Body[] = [
      { _type: 'post', slug: { current: 'hello' } },
      { _type: 'tag', slug: { current: 'ai' } },
      { _type: 'project', slug: { current: 'shelfmark' } },
      { _type: 'experience' },
      { _type: 'book' },
      { _type: 'siteSettings' },
    ];

    for (const body of bodies) {
      for (const [path, type] of await callsFor(body)) {
        if (type === 'page') {
          expect(isRoutePattern(path), `${path} is concrete, so 'page' builds a dead tag`).toBe(true);
        }
      }
    }
  });

  it('rejects an invalid signature without revalidating anything', async () => {
    parseBody.mockResolvedValue({ body: { _type: 'post' }, isValidSignature: false });
    const res = await POST(new Request('http://localhost/api/revalidate', { method: 'POST' }) as never);
    expect(res.status).toBe(401);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
