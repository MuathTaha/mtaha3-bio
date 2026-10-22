import { NextResponse, type NextRequest } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';
import { writeClient } from '@/sanity/lib/client';
import { serverEnv } from '@/lib/env';

/**
 * Accepts a reader's comment and stores it unapproved.
 *
 * No login and no captcha. Three things carry that instead: every comment is
 * held for approval, so spam is never published whatever gets through; a
 * honeypot field catches the bots that fill every input they find; and a
 * per-IP rate limit blunts flooding. The worst case is noise in the Studio
 * queue rather than anything a reader sees.
 */

const schema = z.object({
  postId: z.string().min(1).max(100),
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: z.string().email().max(200).optional().or(z.literal('')),
  body: z.string().trim().min(2, 'Comment is too short').max(2000),
  // Hidden in the form and left blank by people. Anything here is a bot.
  // Permissive on purpose: rejecting it here would return a 400 that tells the
  // bot to retry with the field empty. It is accepted and discarded below.
  website: z.string().max(500).optional(),
});

const GENERIC_ERROR = "Sorry — that didn't send. Please try again.";

// Per-IP, 3 per 10 minutes. In-memory, so it resets on a cold start and is
// per-instance; it raises the cost of flooding without pretending to be a
// real quota. Moderation is what actually protects the site.
const buckets = new Map<string, { count: number; reset: number }>();
function rateLimit(ip: string, limit = 3, windowMs = 600_000): boolean {
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
    return NextResponse.json(
      { error: 'That is a lot of comments at once — try again in a few minutes.' },
      { status: 429 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    // The first message is written for a reader ("Name is required"), so it is
    // safe to show and more useful than a generic failure.
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' },
      { status: 400 },
    );
  }

  const { postId, name, email, body, website } = parsed.data;

  // Silently accept and discard: telling a bot it was caught only invites a
  // retry without the honeypot filled in.
  if (website) {
    return NextResponse.json({ ok: true, pending: true });
  }

  if (!serverEnv.SANITY_API_WRITE_TOKEN) {
    console.error('[comments] not configured: missing SANITY_API_WRITE_TOKEN');
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 503 });
  }

  try {
    await writeClient.create({
      _type: 'comment',
      post: { _type: 'reference', _ref: postId },
      name,
      ...(email ? { email } : {}),
      body,
      approved: false,
    });
  } catch (err) {
    // A bad postId lands here as a reference-integrity failure, as does an
    // expired token — both are ours to fix, not the reader's.
    console.error('[comments] create failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }

  await notify(name, body);

  return NextResponse.json({ ok: true, pending: true });
}

/**
 * Best-effort nudge that something is waiting for approval. A comment is
 * already stored by this point, so a failure here is logged and nothing more —
 * it must never turn a saved comment into an error for the reader.
 */
async function notify(name: string, body: string) {
  const to = serverEnv.COMMENT_NOTIFY_EMAIL;
  const apiKey = serverEnv.RESEND_API_KEY;
  if (!to || !apiKey) return;

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: serverEnv.RESEND_FROM_EMAIL ?? 'Muath Taha <hello@mtaha3.bio>',
      to,
      subject: `New comment from ${name}`,
      text: `${name} wrote:\n\n${body}\n\nApprove or delete it in the Studio: https://mtaha3.bio/studio`,
    });
    if (error) console.error('[comments] notification failed:', error.message);
  } catch (err) {
    console.error('[comments] notification threw:', err);
  }
}
