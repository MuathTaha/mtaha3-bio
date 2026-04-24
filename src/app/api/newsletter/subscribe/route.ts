import { NextResponse, type NextRequest } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';

const schema = z.object({ email: z.string().email().max(200) });

// Simple in-memory rate limit (per-IP, 5/min). For prod scale, swap to Upstash.
const buckets = new Map<string, { count: number; reset: number }>();
function rateLimit(ip: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.reset < now) {
    buckets.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.contacts.create({
    email: parsed.data.email,
    audienceId,
    unsubscribed: false,
  });

  if (error && !error.message?.includes('already')) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
