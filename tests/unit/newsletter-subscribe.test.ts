import { describe, it, expect, vi, beforeEach } from 'vitest';

const contactsCreate = vi.fn();
const emailsSend = vi.fn();

vi.mock('resend', () => ({
  Resend: class {
    contacts = { create: contactsCreate };
    emails = { send: emailsSend };
  },
}));

const env: Record<string, string | undefined> = {
  RESEND_API_KEY: 'test-key',
  RESEND_AUDIENCE_ID: 'aud-1',
  RESEND_FROM_EMAIL: 'Muath <hello@mtaha3.bio>',
};
vi.mock('@/lib/env', () => ({ get serverEnv() { return env; } }));

const { POST } = await import('@/app/api/newsletter/subscribe/route');

let ip = 0;
/** Each call uses a fresh IP so the route's per-IP rate limit doesn't interfere. */
function post(body: unknown) {
  ip += 1;
  return POST(
    new Request('http://localhost/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${ip}` },
      body: JSON.stringify(body),
    }) as never
  );
}

describe('newsletter subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contactsCreate.mockResolvedValue({ error: null });
    emailsSend.mockResolvedValue({ error: null });
    env.RESEND_API_KEY = 'test-key';
    env.RESEND_AUDIENCE_ID = 'aud-1';
  });

  it('stores the contact and sends one welcome email', async () => {
    const res = await post({ email: 'reader@example.com' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, welcomed: true });

    expect(contactsCreate).toHaveBeenCalledWith({
      email: 'reader@example.com',
      audienceId: 'aud-1',
      unsubscribed: false,
    });
    expect(emailsSend).toHaveBeenCalledTimes(1);
    const sent = emailsSend.mock.calls[0][0];
    expect(sent.to).toBe('reader@example.com');
    expect(sent.from).toBe('Muath <hello@mtaha3.bio>');
    expect(sent.subject).toBe('Thanks for subscribing');
    expect(sent.text).toContain('Thanks for subscribing');
    expect(sent.html).toContain('Thanks for subscribing');
  });

  it('does not email again when the address is already subscribed', async () => {
    contactsCreate.mockResolvedValue({ error: { message: 'Contact already exists' } });
    const res = await post({ email: 'reader@example.com' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, welcomed: false });
    expect(emailsSend).not.toHaveBeenCalled();
  });

  it('keeps the subscription when the welcome email fails', async () => {
    emailsSend.mockResolvedValue({ error: { message: 'domain not verified' } });
    const res = await post({ email: 'reader@example.com' });
    expect(res.status).toBe(200);
    expect(contactsCreate).toHaveBeenCalledOnce();
  });

  it('keeps the subscription when sending throws outright', async () => {
    emailsSend.mockRejectedValue(new Error('network down'));
    const res = await post({ email: 'reader@example.com' });
    expect(res.status).toBe(200);
  });

  it('reports a real contact-creation failure', async () => {
    contactsCreate.mockResolvedValue({ error: { message: 'Invalid audience' } });
    const res = await post({ email: 'reader@example.com' });
    expect(res.status).toBe(500);
    expect(emailsSend).not.toHaveBeenCalled();
  });

  it('rejects a malformed email without calling Resend', async () => {
    const res = await post({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(contactsCreate).not.toHaveBeenCalled();
  });

  it('reports missing configuration rather than failing silently', async () => {
    env.RESEND_AUDIENCE_ID = undefined;
    const res = await post({ email: 'reader@example.com' });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Server not configured' });
  });
});
