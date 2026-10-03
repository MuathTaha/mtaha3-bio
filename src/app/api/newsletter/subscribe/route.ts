import { NextResponse, type NextRequest } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';
import { serverEnv } from '@/lib/env';
import { WELCOME_SUBJECT, welcomeHtml, welcomeText } from '@/lib/welcomeEmail';

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

  const apiKey = serverEnv.RESEND_API_KEY;
  const audienceId = serverEnv.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.contacts.create({
    email: parsed.data.email,
    audienceId,
    unsubscribed: false,
  });

  // Re-submitting an address is not an error, but it must not trigger a second
  // welcome email — otherwise refreshing the form spams whoever already signed up.
  const alreadySubscribed = Boolean(error?.message?.includes('already'));

  if (error && !alreadySubscribed) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!alreadySubscribed) {
    // The subscription is already stored; a failure to send the welcome must not
    // lose it or show the visitor an error, so this is best-effort and logged.
    try {
      const { error: sendError } = await resend.emails.send({
        from: serverEnv.RESEND_FROM_EMAIL ?? 'Muath Taha <hello@mtaha3.bio>',
        to: parsed.data.email,
        subject: WELCOME_SUBJECT,
        text: welcomeText(),
        html: welcomeHtml(),
      });
      if (sendError) {
        console.error('[newsletter] welcome email failed:', sendError.message);
      }
    } catch (err) {
      console.error('[newsletter] welcome email threw:', err);
    }
  }

  return NextResponse.json({ ok: true, welcomed: !alreadySubscribed });
}
