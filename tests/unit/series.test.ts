import { describe, it, expect, vi } from 'vitest';
import type { SanityClient } from 'next-sanity';
import { getAllSeries, getPostsBySeries, getSeriesBySlug } from '@/sanity/lib/queries';

/** Captures the GROQ a query builds, without reaching Sanity. */
function spyClient() {
  const fetch = vi.fn().mockResolvedValue([]);
  return { client: { fetch } as unknown as SanityClient, fetch };
}

describe('series queries', () => {
  it('orders posts by seriesOrder, then oldest first so a run reads start to finish', async () => {
    const { client, fetch } = spyClient();
    await getPostsBySeries('managers-to-leaders', client);

    const [query, params] = fetch.mock.calls[0];
    expect(query).toContain('order(coalesce(seriesOrder, 9999) asc, publishedAt asc)');
    expect(params).toEqual({ slug: 'managers-to-leaders' });
  });

  /**
   * Without coalesce, a post with no seriesOrder sorts as null — which GROQ
   * places first, putting unnumbered posts ahead of the ones deliberately
   * ordered. The fallback pushes them to the end instead.
   */
  it('pushes unnumbered posts to the end rather than the front', async () => {
    const { client, fetch } = spyClient();
    await getPostsBySeries('managers-to-leaders', client);
    expect(fetch.mock.calls[0][0]).toMatch(/coalesce\(seriesOrder, 9999\)/);
  });

  it('only lists posts that belong to the requested series', async () => {
    const { client, fetch } = spyClient();
    await getPostsBySeries('managers-to-leaders', client);
    expect(fetch.mock.calls[0][0]).toContain('series->slug.current == $slug');
  });

  it('excludes drafts from a series listing', async () => {
    const { client, fetch } = spyClient();
    await getPostsBySeries('managers-to-leaders', client);
    expect(fetch.mock.calls[0][0]).toContain('!(_id in path("drafts.**"))');
  });

  it('lists series for the nav in configured order, skipping any without a slug', async () => {
    const { client, fetch } = spyClient();
    await getAllSeries(client);

    const query = fetch.mock.calls[0][0];
    // A series with no slug would build a /series/undefined link in the nav.
    expect(query).toContain('defined(slug.current)');
    expect(query).toContain('order(coalesce(order, 100) asc, title asc)');
  });

  it('looks a series up by slug', async () => {
    const { client, fetch } = spyClient();
    await getSeriesBySlug('managers-to-leaders', client);
    expect(fetch.mock.calls[0][1]).toEqual({ slug: 'managers-to-leaders' });
  });
});
