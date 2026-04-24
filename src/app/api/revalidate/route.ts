import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { parseBody } from 'next-sanity/webhook';

export async function POST(req: NextRequest) {
  const secret = process.env.SANITY_WEBHOOK_SECRET;
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

    if (type === 'post' && slug) {
      revalidatePath(`/post/${slug}`, 'page');
      revalidatePath('/', 'page');
      revalidatePath('/essays', 'page');
      revalidatePath('/notes', 'page');
      revalidatePath('/rss.xml', 'page');
    } else if (type === 'tag' && slug) {
      revalidatePath(`/tag/${slug}`, 'page');
    } else if (type === 'project' || type === 'siteSettings') {
      revalidatePath('/work', 'page');
      revalidatePath('/about', 'page');
    }

    return NextResponse.json({ revalidated: true, type, slug });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
