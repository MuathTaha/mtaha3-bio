'use client';

import { useRouter } from 'next/navigation';
import type { BookStatus } from '@/types/book';

interface BookTabsProps {
  active: BookStatus;
  counts: Record<BookStatus, number>;
}

const TABS: { value: BookStatus; label: string }[] = [
  { value: 'read', label: 'Read' },
  { value: 'reading', label: 'Reading' },
  { value: 'want', label: 'Want to Read' },
];

export function BookTabs({ active, counts }: BookTabsProps) {
  const router = useRouter();

  return (
    <ul className="mb-8 flex gap-6 border-b border-[var(--color-border)] pb-4">
      {TABS.map((tab) => {
        const isActive = tab.value === active;
        return (
          <li key={tab.value}>
            <button
              type="button"
              onClick={() => router.replace(`/books?status=${tab.value}`, { scroll: false })}
              className={`mono text-xs uppercase tracking-[0.12em] transition-colors ${
                isActive
                  ? 'text-[var(--color-fg)]'
                  : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.label} <span className="text-[var(--color-fg-faint)]">({counts[tab.value]})</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
