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
      <header className="mb-10">
        <p className="kicker mb-3">Reading</p>
        <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
          Books
        </h1>
      </header>
      <BookTabs active={active} counts={counts} />
      <BookGrid books={buckets[active]} emptyMessage={EMPTY[active]} />
    </section>
  );
}
