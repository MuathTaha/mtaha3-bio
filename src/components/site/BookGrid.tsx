'use client';

import { BookCover } from './BookCover';
import type { Book } from '@/types/book';

interface BookGridProps {
  books: Book[];
  emptyMessage: string;
}

export function BookGrid({ books, emptyMessage }: BookGridProps) {
  if (books.length === 0) {
    return (
      <p className="mono text-xs uppercase tracking-[0.12em] text-[var(--color-fg-faint)]">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {books.map((book) => (
        <li key={book._id}>
          <BookCover book={book} />
        </li>
      ))}
    </ul>
  );
}
