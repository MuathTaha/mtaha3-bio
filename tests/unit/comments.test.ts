import { describe, it, expect, vi, beforeEach } from 'vitest';

const create = vi.fn();
const emailsSend = vi.fn();

vi.mock('@/sanity/lib/client', () => ({ writeClient: { create: (...a: unknown[]) => create(...a) } }));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: emailsSend };
  },
}));

const env: Record<string, string | undefined> = {
  SANITY_API_WRITE_TOKEN: 'write-token',
  RESEND_API_KEY: 'test-key',
  COMMENT_NOTIFY_EMAIL: 'owner@example.com',
  RESEND_FROM_EMAIL: 'Muath <hello@mtaha3.bio>',
};
vi.mock('@/lib/env', () => ({ get serverEnv() { return env; } }));

const { POST } = await import('@/app/api/comments/route');

const valid = { postId: 'post-1', name: 'Reader', body: 'Good piece, thanks.' };

let ip = 0;
/** Fresh IP per call so the per-IP rate limit doesn't bleed between tests. */
function post(body: unknown) {
  ip += 1;
  return POST(
    new Request('http://localhost/api/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.1.0.${ip}` },
      body: JSON.stringify(body),
    }) as never,
  );
}

describe('comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({ _id: 'c1' });
    emailsSend.mockResolvedValue({ error: null });
    env.SANITY_API_WRITE_TOKEN = 'write-token';
    env.COMMENT_NOTIFY_EMAIL = 'owner@example.com';
  });

  it('stores the comment unapproved, so nothing publishes itself', async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, pending: true });

    expect(create).toHaveBeenCalledWith({
      _type: 'comment',
      post: { _type: 'reference', _ref: 'post-1' },
      name: 'Reader',
      body: 'Good piece, thanks.',
      approved: false,
    });
  });

  it('keeps an email when given, for a private reply', async () => {
    await post({ ...valid, email: 'reader@example.com' });
    expect(create.mock.calls[0][0]).toMatchObject({ email: 'reader@example.com' });
  });

  it('omits the email key entirely when the field is left blank', async () => {
    await post({ ...valid, email: '' });
    expect(create.mock.calls[0][0]).not.toHaveProperty('email');
  });

  /**
   * The honeypot is hidden from people, so a filled one is a bot. It is
   * accepted and discarded rather than rejected: a 400 tells the bot to retry
   * with the field blank.
   */
  it('silently discards a comment with the honeypot filled', async () => {
    const res = await post({ ...valid, website: 'http://spam.example' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, pending: true });
    expect(create).not.toHaveBeenCalled();
    expect(emailsSend).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing name', { postId: 'post-1', body: 'hello there' }],
    ['a blank name', { ...valid, name: '   ' }],
    ['a body that is too short', { ...valid, body: 'x' }],
    ['a malformed email', { ...valid, email: 'not-an-email' }],
    ['no postId', { name: 'Reader', body: 'hello there' }],
  ])('rejects %s without writing anything', async (_label, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('rate-limits a flood from one address', async () => {
    const headers = { 'content-type': 'application/json', 'x-forwarded-for': '10.9.9.9' };
    const send = () =>
      POST(
        new Request('http://localhost/api/comments', {
          method: 'POST',
          headers,
          body: JSON.stringify(valid),
        }) as never,
      );

    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(429);
  });

  it('reports a write failure without leaking the reason', async () => {
    create.mockRejectedValue(new Error('token expired for dataset production'));
    const res = await post(valid);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toMatch(/token|dataset/i);
  });

  it('reports missing configuration separately from a write failure', async () => {
    env.SANITY_API_WRITE_TOKEN = undefined;
    const res = await post(valid);
    expect(res.status).toBe(503);
    expect(create).not.toHaveBeenCalled();
  });

  it('notifies the owner that something is awaiting approval', async () => {
    await post(valid);
    expect(emailsSend).toHaveBeenCalledTimes(1);
    expect(emailsSend.mock.calls[0][0]).toMatchObject({ to: 'owner@example.com' });
  });

  it('sends no notification when no address is configured', async () => {
    env.COMMENT_NOTIFY_EMAIL = undefined;
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(emailsSend).not.toHaveBeenCalled();
  });

  /** A stored comment must never be lost because the notification failed. */
  it('keeps the comment when the notification throws', async () => {
    emailsSend.mockRejectedValue(new Error('resend down'));
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledOnce();
  });
});
