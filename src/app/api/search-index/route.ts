import { NextResponse } from 'next/server';
import { getSearchIndex } from '@/sanity/lib/queries';

export const revalidate = 60;

export async function GET() {
  const items = await getSearchIndex();
  return NextResponse.json(items, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600' },
  });
}
