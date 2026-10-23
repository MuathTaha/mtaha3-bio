'use client';

import { useState } from 'react';

const GENERIC_ERROR = "Sorry — that didn't send. Please try again.";

export function CommentForm({ postId }: { postId: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [body, setBody] = useState('');
  // Honeypot. Hidden from people, so anything in it came from a bot.
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    setMsg('');
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, name, email, body, website }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setMsg(data?.error ?? GENERIC_ERROR);
        setState('err');
        return;
      }
      setMsg('Thanks — your comment will appear once it has been reviewed.');
      setState('ok');
      setName('');
      setEmail('');
      setBody('');
    } catch {
      setMsg('Network error — your comment was not sent.');
      setState('err');
    }
  }

  const field =
    'w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm transition-colors placeholder:text-[var(--color-fg-faint)] focus:border-[var(--color-accent)] focus:outline-none';

  if (state === 'ok') {
    return (
      <p className="mt-6 rounded-sm border border-[var(--color-accent)] px-4 py-3 text-sm text-[var(--color-accent)]">
        {msg}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          aria-label="Your name"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className={field}
        />
        <input
          aria-label="Your email, never published"
          type="email"
          maxLength={200}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional, never shown)"
          className={field}
        />
      </div>

      {/*
        Honeypot: hidden from people and from screen readers, and taken out of
        the tab order, so only a bot filling every input will complete it.
        `display: none` rather than off-screen positioning — nothing here needs
        to be reachable.
      */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        style={{ display: 'none' }}
      />

      <textarea
        aria-label="Your comment"
        required
        rows={4}
        maxLength={2000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Your comment"
        className={field}
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={state === 'loading'}
          className="mono rounded-sm border border-[var(--color-accent)] px-4 py-2 text-xs uppercase tracking-[0.12em] text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-bg)] disabled:opacity-50"
        >
          {state === 'loading' ? 'Sending…' : 'Post comment'}
        </button>
        <p className="text-xs text-[var(--color-fg-faint)]">Comments are reviewed before appearing.</p>
      </div>

      {msg ? (
        <p
          className={`mono text-[10px] uppercase tracking-[0.12em] ${
            state === 'err' ? 'text-[var(--color-danger)]' : 'text-[var(--color-accent)]'
          }`}
        >
          {msg}
        </p>
      ) : null}
    </form>
  );
}
