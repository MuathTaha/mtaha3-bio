'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { sendGAEvent } from '@next/third-parties/google';
import { buildSearcher, type SearchItem } from '@/lib/search';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const fuse = useMemo(() => (items ? buildSearcher(items) : null), [items]);

  useEffect(() => {
    fetch('/api/search-index').then((r) => r.json()).then(setItems);
  }, []);

  useEffect(() => {
    if (!q) return;
    const t = setTimeout(() => sendGAEvent('event', 'search', { search_term: q }), 500);
    return () => clearTimeout(t);
  }, [q]);

  const hits = fuse && q ? fuse.search(q).map((r) => r.item) : items ?? [];

  return (
    <Container measure="prose">
      <PageHeader kicker="Find" title="Search" />
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search posts…"
        className="mb-8 w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3 text-base text-[var(--color-fg)] transition-colors placeholder:text-[var(--color-fg-faint)] focus:border-[var(--color-accent)] focus:outline-none"
      />
      {items === null ? (
        <p className="mono text-xs uppercase tracking-[0.14em] text-[var(--color-fg-faint)]">Loading…</p>
      ) : (
        <ul className="space-y-5">
          {hits.map((h) => (
            <li key={h._id}>
              <Link href={`/post/${h.slug}`} className="block">
                <div className="mono mb-1 flex gap-3 text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-faint)]">
                  <span>{h.publishedAt.slice(0, 10)}</span>
                  <span>{h.type}</span>
                </div>
                <h3 className="font-display text-lg font-semibold tracking-tight text-[var(--color-fg)] transition-colors hover:text-[var(--color-accent)]">{h.title}</h3>
                <p className="text-sm text-[var(--color-fg-muted)]">{h.excerpt}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
