import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { parseBody } from 'next-sanity/webhook';
import { serverEnv } from '@/lib/env';

/**
 * Sanity posts here on every publish so pages refresh immediately instead of
 * waiting out the 60s ISR window.
 *
 * `revalidatePath` works through soft tags. It invalidates `_N_T_<path>`, and
 * appends `/<type>` when the second argument is given. A rendered page carries
 * tags for its *route pattern* plus its concrete pathname, so `/post/hello` is
 * tagged `_N_T_/post/[slug]/page` and `_N_T_/post/hello` — never
 * `_N_T_/post/hello/page`. Passing 'page' alongside a concrete slug therefore
 * builds a tag nothing holds: the call succeeds and invalidates nothing.
 *
 * The rule: concrete paths take no second argument, route patterns require it.
 * Patterns are used below so one call covers every page in a family, including
 * documents that were deleted and so arrive with no slug.
 */
export async function POST(req: NextRequest) {
  const secret = serverEnv.SANITY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

  try {
    const { body, isValidSignature } = await parseBody<{
      _type: string;
      slug?: { current: string };
    }>(req, secret);

    if (!isValidSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    if (!body) return NextResponse.json({ error: 'No body' }, { status: 400 });

    const type = body._type;
    const slug = body.slug?.current;

    if (type === 'post') {
      revalidatePath('/post/[slug]', 'page');
      revalidatePath('/');
      revalidatePath('/essays');
      revalidatePath('/notes');
      // Tag pages list posts, and the payload doesn't say which tags changed.
      revalidatePath('/tag/[slug]', 'page');
      // A route handler's own tag is its pathname; it has no '/page' variant.
      revalidatePath('/rss.xml');
      revalidatePath('/api/search-index');
    } else if (type === 'tag') {
      revalidatePath('/tag/[slug]', 'page');
      // Tag names render on each post and in the search index.
      revalidatePath('/post/[slug]', 'page');
      revalidatePath('/api/search-index');
    } else if (type === 'project') {
      // Projects are listed on /projects; those with a writeup also render at /work/[slug].
      revalidatePath('/projects');
      revalidatePath('/work/[slug]', 'page');
    } else if (type === 'experience') {
      revalidatePath('/work');
    } else if (type === 'book') {
      revalidatePath('/books');
    } else if (type === 'siteSettings') {
      // The bio and socials feed the footer on every page, plus the home hero
      // and About, so refresh the whole tree under the root layout.
      revalidatePath('/', 'layout');
    } else {
      // Unmapped type: every page carries the root layout tag, so this refreshes
      // the whole tree rather than silently doing nothing.
      revalidatePath('/', 'layout');
    }

    return NextResponse.json({ revalidated: true, type, slug });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
