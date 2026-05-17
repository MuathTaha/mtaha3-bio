'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookGrid } from './BookGrid';
import { BookTabs } from './BookTabs';
import { partitionBooks } from '@/lib/books';
import type { Book, BookStatus } from '@/types/book';

interface BooksPageProps {
  books: Book[];
}

const VALID: BookStatus[] = ['read', 'reading', 'want'];
const EMPTY: Record<BookStatus, string> = {
  read: 'Nothing finished yet.',
  reading: 'Not reading anything right now.',
  want: 'No queue yet.',
};

function resolveStatus(value: string | null): BookStatus {
  return VALID.includes(value as BookStatus) ? (value as BookStatus) : 'read';
}

export function BooksPage({ books }: BooksPageProps) {
  const params = useSearchParams();
  const active = resolveStatus(params.get('status'));
  const buckets = useMemo(() => partitionBooks(books), [books]);

  const counts = {
    read: buckets.read.length,
    reading: buckets.reading.length,
    want: buckets.want.length,
  };

  return (
    <section>
      <h1 className="mono mb-6 text-xs uppercase tracking-[0.14em] text-[var(--color-fg-faint)]">
        Books
      </h1>
      <BookTabs active={active} counts={counts} />
      <BookGrid books={buckets[active]} emptyMessage={EMPTY[active]} />
    </section>
  );
}
