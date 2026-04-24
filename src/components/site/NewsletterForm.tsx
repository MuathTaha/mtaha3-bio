'use client';

import { useState } from 'react';

export function NewsletterForm({ cta }: { cta: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed' }));
        setMsg(error);
        setState('err');
        return;
      }
      setMsg('Subscribed.');
      setState('ok');
      setEmail('');
    } catch {
      setMsg('Network error.');
      setState('err');
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <p className="text-sm text-[var(--color-fg-muted)]">{cta}</p>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          className="flex-1 border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className="mono border border-[var(--color-accent)] px-4 py-2 text-xs uppercase tracking-[0.12em] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-bg)] disabled:opacity-50"
        >
          {state === 'loading' ? '…' : 'Subscribe'}
        </button>
      </div>
      {msg ? <p className={`mono text-[10px] uppercase tracking-[0.12em] ${state === 'err' ? 'text-[var(--color-danger)]' : 'text-[var(--color-accent)]'}`}>{msg}</p> : null}
    </form>
  );
}
