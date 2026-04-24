import { draftMode } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  const slug = searchParams.get('slug');

  if (secret !== process.env.SANITY_STUDIO_PREVIEW_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  (await draftMode()).enable();
  return NextResponse.redirect(new URL(slug ? `/post/${slug}` : '/', req.url));
}
