import { NextResponse, type NextRequest } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';
import { serverEnv } from '@/lib/env';
import { WELCOME_SUBJECT, welcomeHtml, welcomeText } from '@/lib/welcomeEmail';

const schema = z.object({ email: z.string().email().max(200) });

/**
 * What a visitor sees when the fault is ours. Deliberately one fixed string:
 * the specifics ("Server not configured", a raw Resend message) tell a reader
 * nothing they can act on and expose how the back end is wired. The detail
 * goes to the server log instead, where it is actually useful.
 */
const UNAVAILABLE = "Sorry — signup isn't working right now. Please try again later.";

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
  // Resend renamed Audiences to Segments; `audiences` is now an alias of
  // `segments` and `audienceId` is deprecated. The dashboard only offers
  // segments, so that is the name to configure — the old one is still read so
  // an existing deployment keeps working.
  const segmentId = serverEnv.RESEND_SEGMENT_ID ?? serverEnv.RESEND_AUDIENCE_ID;
  if (!apiKey || !segmentId) {
    // Named precisely in the log so this is distinguishable from a Resend
    // outage; the visitor just sees that signup is unavailable.
    console.error(
      `[newsletter] not configured: missing ${!apiKey ? 'RESEND_API_KEY' : 'RESEND_SEGMENT_ID'}`,
    );
    return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.contacts.create({
    email: parsed.data.email,
    unsubscribed: false,
    segments: [{ id: segmentId }],
  });

  // Re-submitting an address is not an error, but it must not trigger a second
  // welcome email — otherwise refreshing the form spams whoever already signed
  // up. Resend has no distinct error code for it (duplicates arrive as
  // validation_error), so the message is all there is to go on.
  const alreadySubscribed = /already|exists/i.test(error?.message ?? '');

  if (error && !alreadySubscribed) {
    // The reason belongs in the logs, not in the page: it can name internals,
    // and a visitor can act on none of it.
    console.error(`[newsletter] contact create failed (${error.name}):`, error.message);
    return NextResponse.json({ error: UNAVAILABLE }, { status: 502 });
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
